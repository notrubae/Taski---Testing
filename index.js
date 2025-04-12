require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Inicializácia klienta
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Definícia kolekcií pre príkazy
client.commands = new Collection();
client.buttons = new Collection();

// Definícia MongoDB schém
const taskSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  list: { type: String, default: 'default' },
  task: String,
  date: Date,
  createdAt: { type: Date, default: Date.now }
});

const swearCountSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  count: { type: Number, default: 0 }
});

const reminderSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  channelId: String,
  task: String,
  remindAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Inicializácia modelov
const Task = mongoose.model('Task', taskSchema);
const SwearCount = mongoose.model('SwearCount', swearCountSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);

// Zoznam nadávok v slovenčine a angličtine
const swearWords = [
  // Slovenčina
  'kokot', 'piča', 'kurva', 'jebať', 'pičus', 'kokotko', 'jebnutý', 'do piče', 'debil', 'chuj', 'pojebany',
  'pojebaný', 'skurvený', 'skurvy', 'hovno', 'sráč', 'srac', 'prdel', 'riť', 'idiot', 'kretén', 'kreten',
  'hajzel', 'čurák', 'curak', 'zmrd', 'pica', 'jebko', 'buzerant', 'pičovina', 'picovina', 'kokotina',
  // Angličtina
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'damn', 'bastard', 'prick', 'pussy',
  'motherfucker', 'whore', 'slut', 'cock', 'bullshit', 'wanker', 'ass', 'twat', 'dickhead'
];

// Funkcia na pripojenie k MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Pripojené k MongoDB!');
  } catch (error) {
    console.error('Chyba pri pripájaní k MongoDB:', error);
  }
}

// Funkcia na kontrolu a aktualizáciu pripomienok
async function checkReminders() {
  const now = new Date();
  const pendingReminders = await Reminder.find({
    remindAt: { $lte: now }
  });

  for (const reminder of pendingReminders) {
    try {
      const guild = client.guilds.cache.get(reminder.guildId);
      const channel = guild?.channels.cache.get(reminder.channelId);
      
      if (channel) {
        await channel.send({
          content: `<@${reminder.userId}>, pripomienka: **${reminder.task}**`
        });
      }
      
      await Reminder.findByIdAndDelete(reminder._id);
    } catch (error) {
      console.error('Chyba pri odosielaní pripomienky:', error);
    }
  }
}

// Načítanie slash príkazov
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] Príkaz v súbore ${filePath} nemá povinnú vlastnosť "data" alebo "execute".`);
  }
}

// Inicializácia príkazov
client.once('ready', async () => {
  console.log(`Bot je pripravený! Prihlásený ako ${client.user.tag}`);
  
  // Nastavenie aktivity bota
  client.user.setActivity('/help pre pomoc', { type: 'WATCHING' });
  
  // Pripojenie k databáze
  await connectToDatabase();
  
  // Nastavenie intervalu pre kontrolu pripomienok (každú minútu)
  cron.schedule('* * * * *', checkReminders);
});

// Event handler pre interakcie
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) return;
    
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Pri vykonávaní príkazu nastala chyba.',
        ephemeral: true
      });
    }
  } else if (interaction.isButton()) {
    // Spracovanie tlačidiel
    const [action, listName, taskId] = interaction.customId.split(':');
    
    if (action === 'delete_task') {
      try {
        await Task.findByIdAndDelete(taskId);
        await interaction.reply({
          content: 'Úloha bola úspešne odstránená.',
          ephemeral: true
        });
        
        // Aktualizácia zoznamu úloh po odstránení
        const taskList = await Task.find({ 
          guildId: interaction.guildId,
          list: listName
        }).sort({ date: 1 });
        
        const embed = new EmbedBuilder()
          .setTitle(`Zoznam úloh: ${listName}`)
          .setColor('#0099ff')
          .setTimestamp();
          
        if (taskList.length === 0) {
          embed.setDescription('Zoznam je prázdny.');
        } else {
          let description = '';
          
          taskList.forEach((task, index) => {
            const date = task.date ? new Date(task.date).toLocaleDateString('sk-SK') : 'Žiadny dátum';
            description += `${index + 1}. **${task.task}** - ${date}\n`;
          });
          
          embed.setDescription(description);
        }
        
        const rows = [];
        let currentRow = new ActionRowBuilder();
        
        taskList.forEach((task, index) => {
          if (index > 0 && index % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
          }
          
          const button = new ButtonBuilder()
            .setCustomId(`delete_task:${listName}:${task._id}`)
            .setLabel(`Odstrániť #${index + 1}`)
            .setStyle(ButtonStyle.Danger);
            
          currentRow.addComponents(button);
        });
        
        if (currentRow.components.length > 0) {
          rows.push(currentRow);
        }
        
        await interaction.message.edit({
          embeds: [embed],
          components: rows
        });
      } catch (error) {
        console.error('Chyba pri mazaní úlohy:', error);
        await interaction.reply({
          content: 'Pri mazaní úlohy nastala chyba.',
          ephemeral: true
        });
      }
    }
  }
});

// Event handler pre správy
client.on('messageCreate', async message => {
  // Ignorovanie správ od botov
  if (message.author.bot) return;
  
  // Kontrola nadávok
  const messageContent = message.content.toLowerCase();
  let containsSwearWord = false;
  
  for (const word of swearWords) {
    if (messageContent.includes(word)) {
      containsSwearWord = true;
      break;
    }
  }
  
  if (containsSwearWord) {
    try {
      let swearCount = await SwearCount.findOne({
        guildId: message.guild.id,
        userId: message.author.id
      });
      
      if (!swearCount) {
        swearCount = new SwearCount({
          guildId: message.guild.id,
          userId: message.author.id,
          count: 0
        });
      }
      
      swearCount.count += 1;
      await swearCount.save();
      
      // Možno pridať reakciu na správu s nadávkou
      await message.react('😠');
    } catch (error) {
      console.error('Chyba pri aktualizácii počtu nadávok:', error);
    }
  }
});

// Implementácia slash príkazov
const commands = [
  {
    name: 'add',
    description: 'Pridá úlohu do zoznamu',
    options: [
      {
        name: 'task',
        description: 'Úloha na pridanie',
        type: 3, // STRING
        required: true
      },
      {
        name: 'list',
        description: 'Názov zoznamu (voliteľné)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'date',
        description: 'Dátum dokončenia (YYYY-MM-DD)',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(interaction) {
      const task = interaction.options.getString('task');
      const list = interaction.options.getString('list') || 'default';
      const dateStr = interaction.options.getString('date');
      
      let date = null;
      if (dateStr) {
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            return interaction.reply({
              content: 'Neplatný formát dátumu. Použite YYYY-MM-DD.',
              ephemeral: true
            });
          }
        } catch (error) {
          return interaction.reply({
            content: 'Neplatný formát dátumu. Použite YYYY-MM-DD.',
            ephemeral: true
          });
        }
      }
      
      try {
        const newTask = new Task({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          list,
          task,
          date
        });
        
        await newTask.save();
        
        await interaction.reply({
          content: `Úloha **${task}** bola pridaná do zoznamu **${list}**.`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Chyba pri pridávaní úlohy:', error);
        await interaction.reply({
          content: 'Pri pridávaní úlohy nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'list',
    description: 'Zobrazí zoznam úloh',
    options: [
      {
        name: 'list',
        description: 'Názov zoznamu (voliteľné)',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(interaction) {
      const listName = interaction.options.getString('list') || 'default';
      
      try {
        const taskList = await Task.find({ 
          guildId: interaction.guildId,
          list: listName
        }).sort({ date: 1 });
        
        const embed = new EmbedBuilder()
          .setTitle(`Zoznam úloh: ${listName}`)
          .setColor('#0099ff')
          .setTimestamp();
          
        if (taskList.length === 0) {
          embed.setDescription('Zoznam je prázdny.');
          return interaction.reply({ embeds: [embed] });
        }
        
        let description = '';
        
        taskList.forEach((task, index) => {
          const date = task.date ? new Date(task.date).toLocaleDateString('sk-SK') : 'Žiadny dátum';
          description += `${index + 1}. **${task.task}** - ${date}\n`;
        });
        
        embed.setDescription(description);
        
        const rows = [];
        let currentRow = new ActionRowBuilder();
        
        taskList.forEach((task, index) => {
          if (index > 0 && index % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
          }
          
          const button = new ButtonBuilder()
            .setCustomId(`delete_task:${listName}:${task._id}`)
            .setLabel(`Odstrániť #${index + 1}`)
            .setStyle(ButtonStyle.Danger);
            
          currentRow.addComponents(button);
        });
        
        if (currentRow.components.length > 0) {
          rows.push(currentRow);
        }
        
        await interaction.reply({
          embeds: [embed],
          components: rows
        });
      } catch (error) {
        console.error('Chyba pri získavaní zoznamu úloh:', error);
        await interaction.reply({
          content: 'Pri získavaní zoznamu úloh nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'reset',
    description: 'Vymaže všetky úlohy zo zoznamu',
    options: [
      {
        name: 'list',
        description: 'Názov zoznamu na vymazanie (voliteľné)',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(interaction) {
      const listName = interaction.options .getString('list') || 'default';
      
      try {
        await Task.deleteMany({
          guildId: interaction.guildId,
          list: listName
        });
        
        await interaction.reply({
          content: `Zoznam **${listName}** bol vymazaný.`,
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri mazaní zoznamu:', error);
        await interaction.reply({
          content: 'Pri mazaní zoznamu nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'count',
    description: 'Zobrazí počet nadávok používateľa',
    options: [
      {
        name: 'user',
        description: 'Používateľ (voliteľné)',
        type: 6, // USER
        required: false
      }
    ],
    async execute(interaction) {
      const targetUser  = interaction.options.getUser ('user') || interaction.user;
      
      try {
        const swearCount = await SwearCount.findOne({
          guildId: interaction.guildId,
          userId: targetUser .id
        });
        
        const count = swearCount ? swearCount.count : 0;
        
        const embed = new EmbedBuilder()
          .setTitle('Štatistika nadávok')
          .setColor('#ff0000')
          .setDescription(`Používateľ ${targetUser .toString()} použil **${count}** nadávok.`)
          .setTimestamp();
          
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri získavaní počtu nadávok:', error);
        await interaction.reply({
          content: 'Pri získavaní počtu nadávok nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'kick',
    description: 'Vykopne používateľa zo servera',
    options: [
      {
        name: 'user',
        description: 'Používateľ na vykopnutie',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Dôvod vykopnutia',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(interaction) {
      // Kontrola oprávnení
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({
          content: 'Nemáte oprávnenie na vykopnutie používateľov.',
          ephemeral: true
        });
      }
      
      const targetUser  = interaction.options.getUser ('user');
      const targetMember = interaction.guild.members.cache.get(targetUser .id);
      const reason = interaction.options.getString('reason') || 'Nebol uvedený žiadny dôvod.';
      
      // Kontrola, či je možné vykopnúť používateľa
      if (!targetMember) {
        return interaction.reply({
          content: 'Nemôžem nájsť tohto používateľa.',
          ephemeral: true
        });
      }
      
      if (!targetMember.kickable) {
        return interaction.reply({
          content: 'Nemôžem vykopnúť tohto používateľa. Možno má vyššiu rolu ako ja?',
          ephemeral: true
        });
      }
      
      try {
        await targetMember.kick(reason);
        
        const embed = new EmbedBuilder()
          .setTitle('Používateľ vykopnutý')
          .setColor('#ff9900')
          .setDescription(`Používateľ ${targetUser .toString()} bol vykopnutý.`)
          .addFields(
            { name: 'Dôvod', value: reason }
          )
          .setTimestamp();
          
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri vykopnutí používateľa:', error);
        await interaction.reply({
          content: 'Pri vykopnutí používateľa nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'ban',
    description: 'Zabanuje používateľa zo servera',
    options: [
      {
        name: 'user',
        description: 'Používateľ na zabanovanie',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Dôvod zabanovania',
        type: 3, // STRING
        required: false
      },
      {
        name: 'days',
        description: 'Počet dní na vymazanie správ (0-7 )',
        type: 4, // INTEGER
        required: false,
        choices: [
          { name: '0 dní', value: 0 },
          { name: '1 deň', value: 1 },
          { name: '3 dni', value: 3 },
          { name: '7 dní', value: 7 }
        ]
      }
    ],
    async execute(interaction) {
      // Kontrola oprávnení
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: 'Nemáte oprávnenie na zabanovanie používateľov.',
          ephemeral: true
        });
      }
      
      const targetUser  = interaction.options.getUser ('user');
      const targetMember = interaction.guild.members.cache.get(targetUser .id);
      const reason = interaction.options.getString('reason') || 'Nebol uvedený žiadny dôvod.';
      const days = interaction.options.getInteger('days') || 0;
      
      // Kontrola, či je možné zabanovať používateľa
      if (targetMember && !targetMember.bannable) {
        return interaction.reply({
          content: 'Nemôžem zabanovať tohto používateľa. Možno má vyššiu rolu ako ja?',
          ephemeral: true
        });
      }
      
      try {
        await interaction.guild.members.ban(targetUser , {
          deleteMessageDays: days,
          reason: reason
        });
        
        const embed = new EmbedBuilder()
          .setTitle('Používateľ zabanovaný')
          .setColor('#ff0000')
          .setDescription(`Používateľ ${targetUser .toString()} bol zabanovaný.`)
          .addFields(
            { name: 'Dôvod', value: reason },
            { name: 'Vymazané správy', value: `${days} dní` }
          )
          .setTimestamp();
          
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri zabanovaní používateľa:', error);
        await interaction.reply({
          content: 'Pri zabanovaní používateľa nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'mute',
    description: 'Stlmí používateľa na serveri (timeout)',
    options: [
      {
        name: 'user',
        description: 'Používateľ na stlmenie',
        type: 6, // USER
        required: true
      },
      {
        name: 'duration',
        description: 'Trvanie stlmenia v minútach',
        type: 4, // INTEGER
        required: true,
        choices: [
          { name: '1 minúta', value: 1 },
          { name: '5 minút', value: 5 },
          { name: '10 minút', value: 10 },
          { name: '1 hodina', value: 60 },
          { name: '1 deň', value: 1440 },
          { name: '1 týždeň', value: 10080 }
        ]
      },
      {
        name: 'reason',
        description: 'Dôvod stlmenia',
        type: 3, // STRING
        required: false
      }
    ],
    async execute(interaction) {
      // Kontrola oprávnení
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({
          content: 'Nemáte oprávnenie na stlmenie používateľov.',
          ephemeral: true
        });
      }
      
      const targetUser  = interaction.options.getUser ('user');
      const targetMember = interaction.guild.members.cache.get(targetUser .id);
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'Nebol uvedený žiadny dôvod.';
      
      // Kontrola, či je možné stlmiť používateľa
      if (!targetMember) {
        return interaction.reply({
          content: 'Nemôžem nájsť tohto používateľa.',
          ephemeral: true
        });
      }
      
      if (!targetMember.moderatable) {
        return interaction.reply({
          content: 'Nemôžem stlmiť tohto používateľa. Možno má vyššiu rolu ako ja?',
          ephemeral: true
        });
      }
      
      try {
        // Timeout trvanie je v ms, preto násobíme minúty * 60 * 1000
        await targetMember.timeout(duration * 60 * 1000, reason);
        
        let durationText = '';
        if (duration < 60) {
          durationText = `${duration } minút`;
        } else if (duration < 1440) {
          durationText = `${duration / 60} hodín`;
        } else if (duration < 10080) {
          durationText = `${duration / 1440} dní`;
        } else {
          durationText = `${duration / 10080} týždňov`;
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Používateľ stlmený')
          .setColor('#ffcc00')
          .setDescription(`Používateľ ${targetUser .toString()} bol stlmený.`)
          .addFields(
            { name: 'Trvanie', value: durationText },
            { name: 'Dôvod', value: reason }
          )
          .setTimestamp();
          
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri stlmení používateľa:', error);
        await interaction.reply({
          content: 'Pri stlmení používateľa nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'remind',
    description: 'Nastaví pripomienku',
    options: [
      {
        name: 'task',
        description: 'Úloha na pripomenutie',
        type: 3, // STRING
        required: true
      },
      {
        name: 'time',
        description: 'Čas pripomenutia v minútach',
        type: 4, // INTEGER
        required: true
      }
    ],
    async execute(interaction) {
      const task = interaction.options.getString('task');
      const time = interaction.options.getInteger('time');
      
      if (time <= 0) {
        return interaction.reply({
          content: 'Čas musí byť kladné číslo.',
          ephemeral: true
        });
      }
      
      try {
        const remindAt = new Date(Date.now() + time * 60000); // Konverzia minút na ms
        
        const reminder = new Reminder({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          channelId: interaction.channelId,
          task,
          remindAt
        });
        
        await reminder.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Pripomienka nastavená')
          .setColor('#00cc99')
          .setDescription(`Pripomeniem ti **${task}** o ${time} minút.`)
          .setTimestamp();
          
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error('Chyba pri nastavení pripomienky:', error);
        await interaction.reply({
          content: 'Pri nastavení pripomienky nastala chyba.',
          ephemeral: true
        });
      }
    }
  },
  {
    name: 'help',
    description: 'Zobrazí nápovedu k príkazom',
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setTitle('Nápoveda k príkazom')
        .setColor('#0099ff')
        .setDescription('Zoznam dostupných príkazov:')
        .addFields(
          { name: '/add [task] [list] [date]', value: 'Pridá úlohu do zoznamu. List a date sú voliteľné.' },
          { name: '/list [list]', value: 'Zobrazí zoznam úloh. List je voliteľný.' },
          { name: '/reset [list]', value: 'Vymaže všetky úlohy zo zoznamu. List je voliteľný.' },
          { name: '/count [user]', value: 'Zobrazí počet nadávok používateľa. User je voliteľný.' },
          { name: '/kick [user] [reason]', value: 'Vykopne používateľa zo servera. Reason je voliteľný.' },
          { name: '/ban [user] [reason] [days]', value: 'Zabanuje používateľa zo servera. Reason a days sú voliteľné.' },
          { name: '/mute [user] [duration] [reason]', value: 'Stlmí používateľa na serveri. Reason je voliteľný.' },
          { name: '/remind [task] [time]', value: 'Nastaví pripomienku o určitý počet minút.' },
          { name: '/poll [question] [options]', value: 'Vytvorí hlasovanie s otázkou a možnosťami.' },
          { name: '/clear [amount]', value: 'Vymaže určitý počet správ z kanálu.' },
          { name: '/stats', value: 'Zobrazí štatistiky bota a servera.' },
          { name: '/help', value: 'Zobrazí túto nápovedu.' }
        )
        .setTimestamp();
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
];

// Registrácia príkazov na Discord API
async function registerCommands() {
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v9');

  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Začínam registráciu príkazov...');
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });
    console.log('Príkazy boli úspešne zaregistrované!');
  } catch (error) {
    console.error('Chyba pri registrácii príkazov:', error);
  }
}

// Spustenie bota
client.login(process.env.DISCORD_TOKEN).then(() => {
  registerCommands();
});
