import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Pridá úlohu do zoznamu')
    .addStringOption(opt =>
      opt.setName('task').setDescription('Úloha').setRequired(true))
    .addStringOption(opt =>
      opt.setName('list').setDescription('Zoznam (voliteľné)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('date').setDescription('Dátum (voliteľné)').setRequired(false)),

  async execute(interaction, client) {
    const task = interaction.options.getString('task');
    const list = interaction.options.getString('list') || 'default';
    const date = interaction.options.getString('date') || 'bez dátumu';

    if (!client.tasks.has(list)) client.tasks.set(list, []);
    client.tasks.get(list).push({ task, date });

    await interaction.reply(`✅ Úloha **${task}** bola pridaná do zoznamu **${list}** (${date})`);
  }
};
