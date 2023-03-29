# 0swingpt Discord Bot

This is a Discord bot that uses the OpenAI API to generate responses to messages sent in a channel. Additionally, it allows for the creation of public and private channels via a slash command.

## Installation

1. Clone the repository: `git clone https://github.com/<your-username>/0swingpt.git`
2. Install dependencies: `npm install`
3. Create a `.env` file in the root directory with the following contents:

```
TOKEN=<your-bot-token>
ADMIN_ROLE_ID=<your-admin-role-id>
OPENAI_API_KEY=<your-openai-api-key>
```

4. Start the bot: `npm start`

## Commands

### /setup

This command creates a message with two buttons: "Create Public Channel" and "Create Private Channel". When clicked, these buttons create new text channels in the server.

## Usage

To use the bot, simply mention the bot in a channel and type your message. The bot will respond with a generated message based on the previous messages in the channel.

## Dependencies

- `discord.js`: A powerful library for interacting with the Discord API.
- `dotenv`: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
- `openai`: A library for interacting with the OpenAI API.
- `eslint`: A tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
- `eslint-config-airbnb-base`: Airbnb's base JS ESLint config, following our styleguide.
- `eslint-config-prettier`: Turns off all rules that are unnecessary or might conflict with Prettier.
- `eslint-plugin-import`: Import with sanity.
- `eslint-plugin-prettier`: Runs prettier as an ESLint rule.
