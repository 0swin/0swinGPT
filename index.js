// Import the necessary discord.js classes and Node.js modules
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Configuration, OpenAIApi } = require("openai");

// Load environment variables from .env file
dotenv.config();

// Extract environment variables
const {
  TOKEN: token,
  ADMIN_ROLE_ID: adminRoleId,
  OPENAI_API_KEY,
} = process.env;

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Map();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

commandFiles.forEach((file) => {
  const filePath = path.join(commandsPath, file);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const command = require(filePath);
  client.commands.set(command.data.name, command);
});

client.once("ready", async () => {
  console.log("Bot is ready!");
  // Define a list of command permissions
  const commandPermissions = [
    {
      id: adminRoleId,
      type: "ROLE",
      permission: true,
    },
  ];

  // Register the commands with the command permissions
  await client.application.commands.set(
    [...client.commands.values()].map((command) => ({
      ...command.data,
      defaultPermission: false, // Disable the command for everyone by default
      permissions: command.restricted ? commandPermissions : [], // Apply the permissions only for restricted commands
    }))
  );

  console.log("Slash commands registered");
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    if (
      command.restricted &&
      !interaction.member.roles.cache.has(adminRoleId)
    ) {
      return interaction.reply({
        content: "You don't have the required role to use this command.",
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  } else if (interaction.isButton()) {
    const command = client.commands.get("setup");
    if (!command) return;
    try {
      await command.handleButton(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this button interaction!",
        ephemeral: true,
      });
    }
  }
});

const handleMessageCreate = require("./events/messageCreate");

client.on("messageCreate", (message) =>
  handleMessageCreate(client, message, openai)
);

client.login(token);
