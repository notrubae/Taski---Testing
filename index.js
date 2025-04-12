require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Príkazy pre bota
const commands = [
  {
    name: 'add',
    description: 'Pridá úlohu do zoznamu',
    options: [
      {
        name: 'task',
        description: 'Úloha na pridanie',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'list',
    description: 'Zobrazí zoznam úloh',
  },
];

// Registrácia príkazov
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Začínam registráciu príkazov...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log('Príkazy boli úspešne zaregistrované!');
  } catch (error) {
    console.error('Chyba pri registrácii príkazov:', error);
  }
}

// Uloženie úloh do pamäte
const tasks = [];

// Event pre pripravenie bota
client.once(Events.ClientReady, () => {
  console.log('Bot je online!');
});

// Event pre spracovanie interakcií
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'add') {
      const task = interaction.options.getString('task');
      tasks.push(task);
      await interaction.reply(`Úloha **${task}** bola pridaná do zoznamu.`);
    } else if (commandName === 'list') {
      if (tasks.length === 0) {
        await interaction.reply('Zoznam úloh je prázdny.');
      } else {
        await interaction.reply(`Zoznam úloh:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
      }
    }
  }
});

// Spustenie bota
client.login(process.env.DISCORD_TOKEN).then(() => {
  registerCommands();
});
