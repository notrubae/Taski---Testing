import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Zobrazí úlohy v zozname')
    .addStringOption(opt =>
      opt.setName('list').setDescription('Zoznam (voliteľné)').setRequired(false)),

  async execute(interaction, client) {
    const list = interaction.options.getString('list') || 'default';
    const items = client.tasks.get(list) || [];

    if (items.length === 0) {
      return interaction.reply(`📭 Zoznam **${list}** je prázdny.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📝 Zoznam: ${list}`)
      .setDescription(items.map((t, i) => `**${i + 1}.** ${t.task} (${t.date})`).join('\n'))
      .setColor('Blue');

    await interaction.reply({ embeds: [embed] });
  }
};
