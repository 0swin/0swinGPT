const { ChannelType, PermissionFlagsBits } = require("discord.js");

async function createPublicChannel(interaction) {
  const category = interaction.guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === "public channels"
  );
  const position = interaction.channel.position;

  const channelNamePrefix = "new-channel-";
  const existingChannels = interaction.guild.channels.cache.filter((channel) =>
    channel.name.startsWith(channelNamePrefix)
  );

  const existingChannelNumbers = existingChannels
    .map((channel) => parseInt(channel.name.replace(channelNamePrefix, ""), 10))
    .sort((a, b) => a - b);

  let newChannelNumber = 1;
  for (const channelNumber of existingChannelNumbers) {
    if (channelNumber === newChannelNumber) {
      newChannelNumber++;
    } else {
      break;
    }
  }

  const newChannelName = `${channelNamePrefix}${newChannelNumber}`;

  interaction.guild.channels
    .create({
      name: newChannelName,
      parent: category,
      type: ChannelType.GuildText,
      position: position + 1,
      reason: "Created a new text channel",
    })
    .then((newChannel) => {
      interaction.reply({
        content: `New channel ${newChannel} has been created!`,
        ephemeral: true,
      });
    })
    .catch(console.error);
}

async function createPrivateChannel(interaction) {
  const category = interaction.guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === "private channels"
  );
  const position = interaction.channel.position;
  const userName = interaction.user.username;
  const channelNamePrefix = `private-${userName}-`;

  const existingChannels = interaction.guild.channels.cache.filter((channel) =>
    channel.name.startsWith(channelNamePrefix)
  );

  const existingChannelNumbers = existingChannels
    .map((channel) => parseInt(channel.name.replace(channelNamePrefix, ""), 10))
    .sort((a, b) => a - b);

  let newChannelNumber = 1;
  for (const channelNumber of existingChannelNumbers) {
    if (channelNumber === newChannelNumber) {
      newChannelNumber++;
    } else {
      break;
    }
  }

  const newChannelName = `${channelNamePrefix}${newChannelNumber}`;
  const userId = interaction.user.id;

  interaction.guild.channels
    .create({
      name: newChannelName,
      parent: category,
      type: ChannelType.GuildText,
      position: position + 1,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone, // Deny access to everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: userId, // Grant access to the user who clicked the button
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
      reason: "Created a new private text channel",
    })
    .then((newChannel) => {
      interaction.reply({
        content: `New private channel ${newChannel} has been created!`,
        ephemeral: true,
      });
    })
    .catch(console.error);
}

module.exports = { createPublicChannel, createPrivateChannel };
