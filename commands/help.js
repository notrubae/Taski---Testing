import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zobrazí pomoc'),

  async execute(interaction) {
    await interaction.reply(`🔧 **Taski Bot** – Príkazy:
    
  • /add [task] [list?] [date?] – pridá úlohu
  • /list [list?] – zobrazí úlohy
  • /reset [list?] – vymaže úlohy
  • /count – počet nadávok
  • /help – zobrazenie pomoci`);
  }
};
