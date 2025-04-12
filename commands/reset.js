import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Vymaže úlohy v zozname')
    .addStringOption(opt =>
      opt.setName('list').setDescription('Zoznam (voliteľné)').setRequired(false)),

  async execute(interaction, client) {
    const list = interaction.options.getString('list') || 'default';
    client.tasks.set(list, []);
    await interaction.reply(`🗑️ Zoznam **${list}** bol vymazaný.`);
  }
};
