const { SlashCommandBuilder } = require('@discordjs/builders')
const { PermissionFlagsBits } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to your private channel')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you want to add')
        .setRequired(true),
    ),
  async execute(interaction) {
    const userToAdd = interaction.options.getUser('user')
    const user = interaction.user
    const channel = interaction.channel
    const everyoneRole = interaction.guild.roles.everyone

    const everyonePermissionOverwrite = channel.permissionOverwrites.cache.get(
      everyoneRole.id,
    )
    const everyoneDeniedViewChannel
      = everyonePermissionOverwrite
      && everyonePermissionOverwrite.deny.has(PermissionFlagsBits.ViewChannel)

    // Check if the current user has MANAGE_MESSAGES permission and if the @everyone role is denied VIEW_CHANNEL permission
    if (
      channel.permissionsFor(user).has(PermissionFlagsBits.ManageMessages)
      && everyoneDeniedViewChannel
    ) {
      await channel.permissionOverwrites.edit(userToAdd.id, {
        [PermissionFlagsBits.ViewChannel]: true,
      })

      await interaction.reply({
        content: `Welcome ${userToAdd} to ${channel}`,
      })
    }
    else {
      await interaction.reply({
        content: 'You can only add users to your own private channel.',
        ephemeral: true,
      })
    }
  },
}
