const { checkModeration } = require("../utils/moderation");
const { extractLinkContent } = require("../utils/replaceLinks");

// Create a Map to store the summaries
const channelSummaries = new Map();

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
      }You are a ChatGPT bot in a Discord conversation. If you need to mention someone, use <@user-id>. <@1088521023466508478> is your own user ID. You have the capacity to send emojis using this syntax <:emoji_name:emoji_id> raw in a message.`,
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
    content: `Write "Summary: "then please provide a summary of the conversation so far, compressed in a way that fits a tweet, and such that you (GPT) can can reconstruct it as close as possible to the original, this is for yourself, do not make it human readable, abuse of language mixing, abbreviations, symbols (unicode and emojis) to aggressively compress it, while still keeping ALL the information to fully reconstruct it. Then write "Answer:" and answer this message in the same language: ${userInput}.`,
  });

  console.log(messageObjects);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens: 800,
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
    await thinkingMessage.edit(
      "I'm sorry, I couldn't generate a response. Please try again."
    );
  } else {
    await thinkingMessage.edit(chatGPTResponse);
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
        content: `Create a new channel title name following this template: "emoji-keyword1-keyword2-keyword3". For example, "🤖-robot-emoji-testing". Choose three keywords from this paragraph: ${chatGPTResponse}.`,
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
