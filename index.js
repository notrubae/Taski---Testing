// index.js - hlavný súbor bota
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Konfigurácia bota
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Vytvorenie inštancie klienta
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

// Cesty k súborom s dátami
const todosPath = path.join(__dirname, 'data/todos.json');
const swearCountPath = path.join(__dirname, 'data/swear_count.json');

// Vytvorenie priečinka data, ak neexistuje
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Načítanie dát alebo vytvorenie prázdnych súborov
let todos = {};
let swearCount = {};

try {
  if (fs.existsSync(todosPath)) {
    todos = JSON.parse(fs.readFileSync(todosPath, 'utf8'));
  } else {
    fs.writeFileSync(todosPath, JSON.stringify({}));
  }

  if (fs.existsSync(swearCountPath)) {
    swearCount = JSON.parse(fs.readFileSync(swearCountPath, 'utf8'));
  } else {
    fs.writeFileSync(swearCountPath, JSON.stringify({}));
  }
} catch (error) {
  console.error('Chyba pri načítaní dát:', error);
}

// Uloženie dát
function saveTodos() {
  fs.writeFileSync(todosPath, JSON.stringify(todos, null, 2));
}

function saveSwearCount() {
  fs.writeFileSync(swearCountPath, JSON.stringify(swearCount, null, 2));
}

// Nadávky na sledovanie
const swearWords = [
  // slovenské nadávky
  'kokot', 'kurva', 'piča', 'jebať', 'jebe', 'jebal', 'dojebať', 'pojebať', 'dojebaný', 'pojebaný', 
  'hovno', 'chuj', 'prdel', 'riť', 'čurák', 'kokotina', 'do piče', 'prúser', 'sračka', 'skurvený',
  'vytrtkať', 'strtkať', 'suka', 'nasrať', 'dosrať', 'posrať', 'sráč', 'debil', 'kretén', 'idiot',
  'zmrd', 'hajzel', 'buzerant', 'pica', 'jebko',
  // anglické nadávky
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'motherfucker',
  'bastard', 'bullshit', 'damn', 'twat', 'wanker', 'slut', 'whore'
];

// Registrovanie príkazov
const commands = [
  {
    name: 'add',
    description: 'Pridá úlohu do zoznamu',
    options: [
      {
        name: 'list',
        description: 'Názov zoznamu (nepovinné)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'task',
        description: 'Úloha na pridanie',
        type: 3, // STRING
        required: true
      },
      {
        name: 'date',
        description: 'Dátum úlohy (nepovinné)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'list',
    description: 'Zobrazí zoznam úloh',
    options: [
      {
        name: 'list',
        description: 'Názov zoznamu (nepovinné)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'reset',
    description: 'Vymaže zoznam',
    options: [
      {
        name: 'list',
        description: 'Názov zoznamu na vymazanie',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'count',
    description: 'Ukáže počet nadávok používateľa'
  }
];

// Pripojenie k API a registrácia príkazov
client.once('ready', async () => {
  console.log(`Bot je online ako ${client.user.tag}`);
  
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    console.log('Registrujú sa aplikačné príkazy...');
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    
    console.log('Úspešne zaregistrované aplikačné príkazy');
  } catch (error) {
    console.error('Chyba pri registrácii príkazov:', error);
  }
});

// Handler pre spracovania príkazov
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  // Spracovanie príkazov
  if (interaction.isCommand()) {
    const { commandName, options } = interaction;
    
    // /add príkaz
    if (commandName === 'add') {
      const list = options.getString('list') || 'default';
      const task = options.getString('task');
      const date = options.getString('date') || '';
      
      if (!todos[list]) {
        todos[list] = [];
      }
      
      todos[list].push({
        task: task,
        date: date,
        id: Date.now().toString() // jednoduchý unikátny identifikátor
      });
      
      saveTodos();
      
      await interaction.reply({
        content: `Úloha "${task}" bola pridaná do zoznamu "${list}" ${date ? `s dátumom ${date}` : ''}`,
        ephemeral: true
      });
    }
    
    // /list príkaz
    else if (commandName === 'list') {
      const list = options.getString('list') || 'default';
      
      if (!todos[list] || todos[list].length === 0) {
        await interaction.reply({
          content: `Zoznam "${list}" je prázdny alebo neexistuje.`,
          ephemeral: true
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`Zoznam úloh: ${list}`)
        .setColor('#3498db')
        .setDescription(
          todos[list].map((item, index) => 
            `${index + 1}. ${item.task} ${item.date ? `(${item.date})` : ''}`
          ).join('\n') || 'Žiadne úlohy v tomto zozname'
        )
        .setFooter({ text: 'Pre vymazanie úlohy použite tlačidlá nižšie' });
      
      const buttons = new ActionRowBuilder();
      
      // Maximálne 5 tlačidiel v jednom rade (limit Discord API)
      const maxButtons = Math.min(5, todos[list].length);
      
      for (let i = 0; i < maxButtons; i++) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`delete_${list}_${todos[list][i].id}`)
            .setLabel(`${i + 1}`)
            .setStyle(ButtonStyle.Danger)
        );
      }
      
      if (todos[list].length > 0) {
        await interaction.reply({
          embeds: [embed],
          components: [buttons]
        });
      } else {
        await interaction.reply({
          embeds: [embed]
        });
      }
    }
    
    // /reset príkaz
    else if (commandName === 'reset') {
      const list = options.getString('list') || 'default';
      
      if (todos[list]) {
        delete todos[list];
        saveTodos();
        await interaction.reply({
          content: `Zoznam "${list}" bol vymazaný.`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `Zoznam "${list}" neexistuje.`,
          ephemeral: true
        });
      }
    }
    
    // /count príkaz
    else if (commandName === 'count') {
      const userId = interaction.user.id;
      const count = swearCount[userId] || 0;
      
      await interaction.reply({
        content: `Používateľ <@${userId}> má na konte ${count} nadávok.`,
        ephemeral: false
      });
    }
  }
  
  // Spracovanie tlačidiel
  else if (interaction.isButton()) {
    const [action, list, itemId] = interaction.customId.split('_');
    
    if (action === 'delete' && todos[list]) {
      const itemIndex = todos[list].findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        const removedItem = todos[list].splice(itemIndex, 1)[0];
        saveTodos();
        
        await interaction.reply({
          content: `Úloha "${removedItem.task}" bola odstránená zo zoznamu "${list}".`,
          ephemeral: true
        });
        
        // Aktualizácia pôvodnej správy so zoznamom
        const embed = new EmbedBuilder()
          .setTitle(`Zoznam úloh: ${list}`)
          .setColor('#3498db')
          .setDescription(
            todos[list].map((item, index) => 
              `${index + 1}. ${item.task} ${item.date ? `(${item.date})` : ''}`
            ).join('\n') || 'Žiadne úlohy v tomto zozname'
          )
          .setFooter({ text: 'Pre vymazanie úlohy použite tlačidlá nižšie' });
        
        const buttons = new ActionRowBuilder();
        
        const maxButtons = Math.min(5, todos[list].length);
        
        for (let i = 0; i < maxButtons; i++) {
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`delete_${list}_${todos[list][i].id}`)
              .setLabel(`${i + 1}`)
              .setStyle(ButtonStyle.Danger)
          );
        }
        
        if (todos[list].length > 0) {
          await interaction.message.edit({
            embeds: [embed],
            components: [buttons]
          });
        } else {
          await interaction.message.edit({
            embeds: [embed],
            components: []
          });
        }
      }
    }
  }
});

// Sledovanie správ na nadávky
client.on('messageCreate', message => {
  // Ignoruj správy od botov
  if (message.author.bot) return;
  
  const content = message.content.toLowerCase();
  
  for (const word of swearWords) {
    if (content.includes(word)) {
      const userId = message.author.id;
      
      // Zvýšiť počítadlo nadávok
      if (!swearCount[userId]) swearCount[userId] = 0;
      swearCount[userId]++;
      
      saveSwearCount();
      
      // Neodpovedaj na správu, iba zaznamenaj
      break;
    }
  }
});

// Prihlásenie bota
client.login(TOKEN);
