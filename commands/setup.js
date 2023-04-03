const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const {
  createPublicChannel,
  createPrivateChannel,
} = require("../utils/channelCreationFunctions");

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
      content: "Here's a message with two buttons:",
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
        await createPublicChannel(i);
      } else if (i.customId === "create_private_channel") {
        await createPrivateChannel(i);
      }
    });

    collector.on("end", (collected) => {
      console.log(`Collected ${collected.size} interactions.`);
    });
  },
  async handleButton(interaction) {
    if (interaction.customId === "create_public_channel") {
      await createPublicChannel(interaction);
    } else if (interaction.customId === "create_private_channel") {
      await createPrivateChannel(interaction);
    }
  },
};
