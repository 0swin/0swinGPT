async function handleMessageCreate(client, msg, openai) {
  if (msg.author.bot) return; // Ignore messages from bots

  // Check if the bot is mentioned
  if (msg.mentions.has(client.user)) {
    const userInput = msg.content.replace(/<@!?[0-9]+>/g, '').trim(); // Remove the mention from the message content

    const thinkingMessage = await msg.reply("I'm thinking...");

    // Fetch the last 6 messages in the channel
    const fetchedMessages = await msg.channel.messages.fetch({ limit: 6 });
    const conversation = fetchedMessages
      .filter(m => m.id !== msg.id) // Exclude the current message
      .map(m => `${m.author.username}: ${m.content}`)
      .reverse(); // Reverse the order to make it chronological

    const messageObjects = [
      {
        role: 'system',
        content:
          'You are a ChatGPT bot in a Discord conversation. If you need to mention someone, use <@user-id>',
      },
      ...conversation.map(line => {
        const [author, content] = line.split(': ');
        const role = author === client.user.username ? 'assistant' : 'user';
        const mentionString = role === 'user' ? `<@${msg.author.id}>` : '';

        return {
          role,
          content: `${mentionString}${
            role === 'user' ? ': ' : ''
          }${content.trim()}`,
        };
      }),
    ];

    messageObjects.push({ role: 'user', content: userInput });
    console.log(messageObjects);

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      max_tokens: 600,
      n: 1,
      stop: null,
      temperature: 0.7,
      messages: messageObjects,
    });
    console.log(completion.data.choices[0].message.content);

    const chatGPTResponse =
      completion.data.choices[0].message.content.trim() || '';

    // Check if the response is empty or contains only whitespace
    if (!chatGPTResponse) {
      await thinkingMessage.edit(
        "I'm sorry, I couldn't generate a response. Please try again.",
      );
    } else {
      await thinkingMessage.edit(chatGPTResponse);
    }
  }
}

module.exports = handleMessageCreate;
