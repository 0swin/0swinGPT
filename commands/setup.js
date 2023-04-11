const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { createChannel } = require("../utils/channelCreationFunctions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Creates a message with two buttons.")
    // .setRequired(true)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  restricted: true,
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_public_channel")
        .setLabel("🔓 Create Public Channel")
        .setStyle("Primary"),
      new ButtonBuilder()
        .setCustomId("create_private_channel")
        .setLabel("🔒 Create Private Channel")
        .setStyle("Secondary")
    );

    await interaction.reply({
      content: "Click on a button to create a new channel:",
      components: [row],
      ephemeral: false,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      componentType: "BUTTON",
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "create_public_channel") {
        await createChannel(i, "public");
      } else if (i.customId === "create_private_channel") {
        await createChannel(i, "private");
      }
    });

    collector.on("end", (collected) => {
      console.log(`Collected ${collected.size} interactions.`);
    });
  },
  async handleButton(interaction) {
    if (interaction.customId === "create_public_channel") {
      await createChannel(interaction, "public");
    } else if (interaction.customId === "create_private_channel") {
      await createChannel(interaction, "private");
    }
  },
};
