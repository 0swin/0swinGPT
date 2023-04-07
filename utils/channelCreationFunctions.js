const { ChannelType, PermissionFlagsBits } = require("discord.js");

async function createChannel(interaction, channelType) {
  let category;
  let channelNamePrefix;
  let reason;
  let allowAccess;
  let denyAccess;
  let newChannelName;

  if (channelType === "public") {
    category = interaction.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === "public channels"
    );
    channelNamePrefix = "new-channel-";
    reason = "Created a new text channel";
    allowAccess = [PermissionFlagsBits.ViewChannel];
    denyAccess = [];
  } else if (channelType === "private") {
    category = interaction.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === "private channels"
    );
    const userName = interaction.user.username;
    channelNamePrefix = `private-${userName}-`;
    reason = "Created a new private text channel";
    const userId = interaction.user.id;
    allowAccess = [PermissionFlagsBits.ViewChannel];
    denyAccess = [PermissionFlagsBits.ViewChannel];
    denyAccess.push(interaction.guild.roles.everyone);
  } else {
    interaction.reply({
      content: "Invalid channel type",
      ephemeral: true,
    });
    return;
  }

  const position = interaction.channel.position;

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

  newChannelName = `${channelNamePrefix}${newChannelNumber}`;

  interaction.guild.channels
    .create({
      name: newChannelName,
      parent: category,
      type: ChannelType.GuildText,
      position: position + 1,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
      reason,
    })
    .then((newChannel) => {
      interaction.reply({
        content: `New ${channelType} channel ${newChannel} has been created!`,
        ephemeral: true,
      });
      // Send a message in the new channel that mentions the user
      newChannel.send(`${interaction.user}, welcome to your new channel!`);
    })
    .catch(console.error);
}

module.exports = { createChannel };
