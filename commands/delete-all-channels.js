const { SlashCommandBuilder } = require('@discordjs/builders')
const { PermissionFlagsBits } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-all-channels')
    .setDescription('Delete all channels not named general.')
    // .setRequired(true)
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  restricted: true,
  async execute(interaction) {
    const channelsToDelete = interaction.guild.channels.cache.filter(
      channel => channel.type === 0 && channel.name !== 'general',
    )

    const deletePromises = channelsToDelete.map(channel =>
      channel.delete('Deleting channels not named general'),
    )

    await Promise.all(deletePromises)

    await interaction.reply({
      content: 'All channels not named \'general\' have been deleted.',
      ephemeral: true,
    })
  },
}
