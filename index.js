const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log('Bot je online!');
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!hello') {
    message.channel.send('Ahoj! Ako sa máš?');
  } else if (message.content === '!bye') {
    message.channel.send('Zbohom! Maj sa pekne!');
  }
});

client.login(process.env.DISCORD_TOKEN);
