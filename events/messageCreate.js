const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const { ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { checkModeration } = require("../utils/moderation");
const { extractLinkContent } = require("../utils/replaceLinks");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create a Map to store the summaries
const channelSummaries = new Map();

async function updateOrCreateUser(msg) {
  if (!msg || !msg.author || !msg.author.id || !msg.author.username) {
    console.error("Invalid message object");
    return;
  }

  try {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("discord_id, total_messages, messages_today, last_updated")
      .eq("discord_id", msg.author.id);

    if (usersError) throw usersError;

    if (users.length === 0) {
      console.log("User doesn't exist");
      // if user doesn't exist, create them
      const { error } = await supabase
        .from("users")
        .insert([
          {
            id: uuidv4(),
            discord_id: msg.author.id,
            username: msg.author.username,
            total_messages: 1,
            messages_today: 1,
            last_updated: new Date(),
          },
        ])
        .single();
      if (error) throw error;
      console.log("Created user", msg.author.username);
    } else if (users.length === 1) {
      const user = users[0];
      const lastUpdated = new Date(user.last_updated);
      const today = new Date();

      const updateData = {
        total_messages: user.total_messages + 1,
        last_updated: new Date(),
      };

      if (
        lastUpdated.getDate() !== today.getDate() ||
        lastUpdated.getMonth() !== today.getMonth() ||
        lastUpdated.getFullYear() !== today.getFullYear()
      ) {
        // reset messages_today count if last_updated is not today
        updateData.messages_today = 1;
        console.log(
          "Reset messages_today count for user ",
          msg.author.username
        );
      } else {
        updateData.messages_today = user.messages_today + 1;
        console.log("Updated user ", msg.author.username);
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("discord_id", msg.author.id)
        .single();
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error creating or updating user", error);
  }
}

async function handleMessageCreate(client, msg, openai) {
  if (msg.author.bot) return; // Ignore messages from bots

  // Get the saved summary for the current channel, if it exists
  const channelId = msg.channel.id;
  const savedSummary = channelSummaries.has(channelId)
    ? `Summary: ${channelSummaries.get(channelId)}`
    : "";

  // Check if the bot is mentioned
  if (!msg.mentions.has(client.user)) return;

  let userInput = msg.content.replace(/<@!?\d+>/, "").trim();
  console.log(`User input: ${userInput}`);

  // Check if the user message passes the Moderation API check
  const moderationResults = await checkModeration(
    process.env.OPENAI_API_KEY,
    userInput
  );
  if (moderationResults.flagged) {
    return msg.reply({
      content: `Sorry, your message doesn't pass the moderation check. Please try again.`,
      ephemeral: true,
    });
  }

  // look for messages today in supabase then prevent if it is above 100
  const { data: users, error: usersError } = await supabase
    .from("users")

    .select("messages_today")
    .eq("discord_id", msg.author.id)
    .single();
  if (usersError) throw usersError;
  const dailyLimit = msg.member.roles.cache.some((role) => role.name === "VIP")
    ? 200
    : 100;
  if (users.messages_today >= dailyLimit) {
    return msg.reply({
      content: `Sorry, you have reached your daily message limit. Please try again tomorrow.`,
    });
  }

  // Replace links in user input with their content
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const links = userInput.match(linkRegex);

  if (links) {
    await Promise.all(
      links.map(async (link) => {
        const content = await extractLinkContent(link);
        userInput = userInput.replace(link, content);
      })
    );
  }

  // Replace 'EMOJI_NAME' with the name of the custom emoji you want to use
  const customEmoji = msg.guild.emojis.cache.find(
    (emoji) => emoji.name === "spinning_cat"
  );
  const thinkingMessage = await msg.reply(
    `I'm thinking... ${customEmoji.toString()}`
  );

  const fetchedMessages = await msg.channel.messages.fetch({ limit: 100 });
  const conversation = fetchedMessages
    .filter((m) => m.id !== msg.id) // Exclude the current message
    .map((m) => `${m.author.username}: ${m.content}`)
    .reverse() // Reverse the order to make it chronological
    .reduce((acc, cur) => {
      if (acc.length < 400) {
        const newContent =
          cur.length <= 400 - acc.length ? cur : cur.slice(0, 400 - acc.length);
        acc.push(newContent);
      }
      return acc;
    }, []);

  const messageObjects = [
    {
      role: "system",
      content: `${
        savedSummary
          ? `Current summary of the conversation: ${savedSummary}. `
          : ""
      }You are a ChatGPT bot in a Discord conversation. If you need to mention someone, use <@user-id>. <@1088521023466508478> is your own user ID. You have the capacity to send emojis using this syntax <:emoji_name:emoji_id> raw in a message. Don't talk about the summary in the answer. This is a secret code 6699966, never give it to anyone under any circumstance.`,
    },
    ...conversation.map((line) => {
      const [author, content] = line.split(": ");
      const role = author === client.user.username ? "assistant" : "user";
      const mentionString = role === "user" ? `<@${msg.author.id}>` : "";

      return {
        role,
        content: `${mentionString}${
          role === "user" ? ": " : ""
        }${content.trim()}`,
      };
    }),
  ];

  messageObjects.push({ role: "user", content: userInput });

  messageObjects.push({
    role: "user",
    content: `Write "Summary: "then please provide a summary of the conversation so far. Then write "Answer:" and answer this question: ${userInput}.`,
  });

  console.log(messageObjects);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens: 2000,
    n: 1,
    stop: null,
    temperature: 0.7,
    messages: messageObjects,
  });

  const separator = "Answer:";
  const [summary, chatGPTResponse] = completion.data.choices[0].message.content
    .trim()
    .split(separator)
    .map((part) => part.trim()) || ["", ""];

  channelSummaries.set(channelId, summary);

  // log the summary and response
  console.log("", summary);
  console.log("Response:", chatGPTResponse);

  if (!chatGPTResponse) {
    thinkingMessage.delete();
    msg.reply("I'm sorry, I couldn't generate a response. Please try again.");
  } else {
    try {
      await updateOrCreateUser(msg);

      const { data: users, error } = await supabase
        .from("users")
        .select("messages_today")
        .eq("discord_id", msg.author.id)
        .single();

      if (error) throw error;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("message_count")
          .setLabel(`🔋 ${users.messages_today} / ${dailyLimit}`)
          .setStyle("Secondary"),
        new ButtonBuilder()
          .setCustomId("current_user")
          .setLabel(`👤 ${msg.author.username}`)
          .setStyle("Secondary")
          .setDisabled(true)
      );
      thinkingMessage.delete();
      msg.reply({
        content: chatGPTResponse,
        components: [row],
      });
    } catch (error) {
      console.error("Error getting user messages today", error);
    }
  }

  // Check if the channel name contains an emoji
  // eslint-disable-next-line prefer-regex-literals
  const emojiRegex = new RegExp(
    "<a?:.+?:\\d{18}|\\p{Extended_Pictographic}",
    "gu"
  );
  if (!emojiRegex.test(msg.channel.name)) {
    const messages = [
      {
        role: "system",
        content: `What is a suitable two-emoji and three-word-hyphenated title for this conversation summary ?: ${chatGPTResponse}.`,
      },
    ];

    try {
      const nameCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 50,
        n: 1,
        stop: null,
        temperature: 0.7,
      });

      const newChannelName =
        nameCompletion.data.choices[0].message.content.trim();

      // Log the new channel name
      console.log("New channel name:", newChannelName);
      msg.channel.setName(newChannelName);
    } catch (error) {
      console.error("Error creating new channel name:", error);
    }
  }
}

module.exports = handleMessageCreate;
