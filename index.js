require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Odpovie Pong!'),

  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Pozdraví ťa!'),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Spočíta dve čísla.')
    .addIntegerOption(option =>
      option.setName('a').setDescription('Prvé číslo').setRequired(true))
    .addIntegerOption(option =>
      option.setName('b').setDescription('Druhé číslo').setRequired(true)),
]
.map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`✅ Bot je online ako ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('🔄 Registrujem slash príkazy...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Slash príkazy zaregistrované pre server!');
  } catch (error) {
    console.error('❌ Chyba pri registrácii príkazov:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  } else if (commandName === 'hello') {
    await interaction.reply(`Ahoj, ${interaction.user.username}! 👋`);
  } else if (commandName === 'add') {
    const a = interaction.options.getInteger('a');
    const b = interaction.options.getInteger('b');
    await interaction.reply(`Výsledok: ${a + b}`);
  }
});

client.login(TOKEN);
