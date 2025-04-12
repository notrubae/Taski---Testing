import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// Load commands dynamically from commands folder
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.data.name, command.default);
}

const userSwearCounts = new Map();

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '⚠️ Nastala chyba pri vykonaní príkazu.', ephemeral: true });
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const swears = ['kokot', 'debil', 'shit', 'fuck', 'idiot', 'kurva', 'suka']; // add more
  const content = message.content.toLowerCase();
  const found = swears.filter(swear => content.includes(swear));

  if (found.length > 0) {
    const count = userSwearCounts.get(message.author.id) || 0;
    userSwearCounts.set(message.author.id, count + found.length);
  }
});

client.login(process.env.DISCORD_TOKEN);
