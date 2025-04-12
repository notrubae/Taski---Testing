const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token, clientId } = process.env; // Token a Client ID sú uložené v .env
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Nastavenie klienta s intentmi
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Nezabudol si na Message Content Intent
    GatewayIntentBits.DirectMessages, // Pre DM príkazy
    GatewayIntentBits.GuildMembers,  // Povolenie na získanie informácií o členoch
    GatewayIntentBits.Presences,     // Povolenie na sledovanie prítomnosti používateľov
  ],
  partials: ['CHANNEL'], // Pre spracovanie DM správ
});

client.commands = new Collection();

// Skontroluj, či je bot prihlásený
client.once('ready', () => {
  console.log('Bot je prihlásený!');
});

// Príkazy
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'add') {
    const task = interaction.options.getString('task');
    const list = interaction.options.getString('list') || 'default';
    const date = interaction.options.getString('date') || 'N/A';
    await interaction.reply(`Úloha "${task}" bola pridaná do zoznamu "${list}" na dátum ${date}.`);
  }

  if (commandName === 'list') {
    await interaction.reply('Zoznam úloh');
  }

  if (commandName === 'reset') {
    await interaction.reply('Zoznam bol vymazaný');
  }

  if (commandName === 'count') {
    await interaction.reply('Počet nadávok: 0');
  }

  if (commandName === 'help') {
    await interaction.reply('Pomoc: /add [task] [date], /list, /reset, /count, /remind');
  }

  if (commandName === 'remind') {
    const task = interaction.options.getString('task');
    const time = interaction.options.getString('time');
    await interaction.reply(`Pripomenutie pre úlohu "${task}" na čas: ${time}`);
  }
});

// Registrácia príkazov
const commands = [
  new SlashCommandBuilder().setName('add').setDescription('Pridaj úlohu do zoznamu')
    .addStringOption(option => option.setName('task').setDescription('Úloha').setRequired(true))
    .addStringOption(option => option.setName('list').setDescription('Zoznam (voliteľné)'))
    .addStringOption(option => option.setName('date').setDescription('Dátum (voliteľné)')),

  new SlashCommandBuilder().setName('list').setDescription('Zobraz zoznam úloh'),

  new SlashCommandBuilder().setName('reset').setDescription('Vymaž zoznam úloh'),

  new SlashCommandBuilder().setName('count').setDescription('Zobrazi počet nadávok používateľa'),

  new SlashCommandBuilder().setName('remind').setDescription('Nastav pripomienku pre úlohu')
    .addStringOption(option => option.setName('task').setDescription('Úloha').setRequired(true))
    .addStringOption(option => option.setName('time').setDescription('Čas (napr. 10:00)').setRequired(true)),

  new SlashCommandBuilder().setName('help').setDescription('Zobrazi pomocné informácie'),
];

// Vytvorenie REST klienta pre registráciu príkazov
const rest = new REST({ version: '9' }).setToken(token);

// Zaregistruj príkazy (globálne alebo pre konkrétny server)
(async () => {
  try {
    console.log('Začínam s registráciou príkazov...');

    await rest.put(
      Routes.applicationGuildCommands(clientId, 'tvoj-guild-id'),  // Použi svoj Guild ID
      { body: commands },
    );

    console.log('Príkazy boli úspešne zaregistrované!');
  } catch (error) {
    console.error('Chyba pri registrácii príkazov:', error);
  }
})();

// Prihlásenie bota
client.login(token);
