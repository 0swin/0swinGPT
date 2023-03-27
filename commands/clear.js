const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Removes the latest X messages from a channel.')
    .addIntegerOption(option =>
      option.setName('count').setDescription('Number of messages to remove'),
    )
    // .setRequired(true)
    .setDMPermission(false),
  restricted: true,
  async execute(interaction) {
    const count = interaction.options.getInteger('count');

    if (count < 1 || count > 100) {
      return interaction.reply({
        content: 'Please provide a number between 1 and 100.',
        ephemeral: true,
      });
    }

    try {
      await interaction.channel.bulkDelete(count + 1, true); // Plus 1 to include the command message
      interaction.reply({
        content: `${count} message(s) have been removed.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  },
};
