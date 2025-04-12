import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('Ukáže počet nadávok používateľa'),

  async execute(interaction, client) {
    const count = client.userSwearCounts.get(interaction.user.id) || 0;
    await interaction.reply(`🧠 Nadávky: **${count}**.`);
  }
};
