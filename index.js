import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

client.commands = new Collection();
client.tasks = new Map();
client.userSwearCounts = new Map();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.data.name, command.default);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Taski je online ako ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '⚠️ Chyba pri spracovaní príkazu.', ephemeral: true });
  }
});

client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;

  const swears = ['kokot', 'debil', 'shit', 'fuck', 'idiot', 'kurva', 'suka'];
  const content = message.content.toLowerCase();
  const found = swears.filter(swear => content.includes(swear));

  if (found.length > 0) {
    const current = client.userSwearCounts.get(message.author.id) || 0;
    client.userSwearCounts.set(message.author.id, current + found.length);
  }
});

client.login(process.env.DISCORD_TOKEN);
