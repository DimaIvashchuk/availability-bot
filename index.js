import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import XLSX from 'xlsx';
import Airtable from 'airtable';
import { yesnoOptions, jobOptions } from './keyboards';

const superId = 492010109;

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: 'keyeXmuoRswcRk4U6'
});
const base = Airtable.base('app549q1olFomIHg0');

const workbook = XLSX.readFile('./data.xlsx');

let worksheets = {};
for (const sheetName of workbook.SheetNames) {
  worksheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

const bot = new TelegramBot('5258739177:AAHfNiDZufhUm5hptkDs63nw4eV9jViv_mM', { polling: true });

const chats = {};
const userRes = {};

bot.setMyCommands([
  {command: '/start', description: 'Подати данні про свою доступність'},
  {command: '/table', description: 'Подивитись доступність працівників'},
]);

const sendDataToTable = async (chatId) => {
  const data = await base('availability').select({
    filterByFormula: `{User name} = '${userRes[chatId]['username']}'`
  }).firstPage();

  if (data.length !== 0) {
    data[0].id
    await base('availability').update([
      {
        "id": data[0].id,
        "fields": {
          "User name": userRes[chatId]['username'],
          "Availability": userRes[chatId]['Availability'],
          "Deal with": userRes[chatId]['DealWith'],
        }
      }
    ]);

    await bot.sendMessage(chatId, 'Дякую, на цьому все :)');

    return;
  }

  await base('availability').create([
    {
      "fields": {
        "User name": userRes[chatId]['username'],
        "Availability": userRes[chatId]['Availability'],
        "Deal with": userRes[chatId]['DealWith'],
      }
    }
  ])

  await bot.sendMessage(chatId, 'Дякую, на цьому все :)');
}

bot.on('message', async msg => {
  const { chat: { id: chatId }, text } = msg;

  if (chats[chatId] && chats[chatId].waiting && chats[chatId].question === 'doing') {
    userRes[chatId]['DealWith'] = text;
    chats[chatId] = { waiting: false, question: '' };
    sendDataToTable(chatId)

    return;
  }

  if (text !== '/start' && text !== '/table') {
    return await bot.sendMessage(chatId, 'Соррі, я нечекаю від тебе повідомлення');
  }
});

const startSurvey = async (chatId) => {
  await bot.sendMessage(chatId, 'Ти в безпеці?', yesnoOptions);
  chats[chatId] = { waiting: true, question: 'safe' };
};

bot.onText(/\/start/, async msg => {
  const { chat: { id: chatId }, from: { username } } = msg;

  if (!worksheets.users.find(v => v.chatId === chatId)) {
    worksheets.users.push({
      "chatId": chatId,
      "username": username,
    });

    XLSX.utils.sheet_add_json(workbook.Sheets['users'], worksheets.users)
    XLSX.writeFile(workbook, 'data.xlsx');
    await bot.sendMessage(chatId, 'Hello, you have been registred');
  }

  startSurvey(chatId);
});

bot.onText(/\/table/, async (msg) => {
  const { chat: { id: chatId } } = msg;
  await bot.sendMessage(chatId, 'Данні можеш подивитись тут: https://airtable.com/shrsys9iJVvUzRRBG');
});

bot.on('callback_query', async msg => {
  const data = msg.data;
  const chatId = msg.message.chat.id;

  if (!chats[chatId] || chats[chatId].waiting === false) {
    return await bot.sendMessage(chatId, 'Соррі, я нечекаю від тебе повідомлення');
  }

  if (['yes', 'no'].includes(data)) {
    if (chats[chatId].question === 'safe') {
      userRes[chatId] = {};
      userRes[chatId]['AreUSafe'] = data;
      userRes[chatId]['username'] = `${msg.from.username} - ${msg.from.first_name} ${msg.from.last_name}`;
      if (data === 'no') {
        await bot.sendMessage(
          superId,
          `Хей, співробітник ${msg.from.username} - ${msg.from.first_name} ${msg.from.last_name} не відчуває себе у безпеці`
        );
      }

      await bot.sendMessage(chatId, 'Тобі потрібна допомога?', yesnoOptions);
      chats[chatId] = { waiting: true, question: 'help' };

      return;
    }

    if (chats[chatId].question === 'help') {
      userRes[chatId]['AreUNeedHelp'] = data;
      if (data === 'yes') {
        await bot.sendMessage(
          superId,
          `Хей, співробітник ${msg.from.username} - ${msg.from.first_name} ${msg.from.last_name} потребує допомоги`
        );
      }

      await bot.sendMessage(chatId, 'На скільки ти сьогодні доступний?', jobOptions);
      chats[chatId] = { waiting: true, question: 'job' };

      return;
    }
    
  } else {
    if (chats[chatId].question === 'job') {
      userRes[chatId]['Availability'] = `${data}%`;

      if (data === '0') {
        userRes[chatId]['DealWith'] = '';
        sendDataToTable(chatId);

        return;
      }

      await bot.sendMessage(chatId, 'Чим ти займаєшься?');
      chats[chatId] = { waiting: true, question: 'doing' };

      return;
    }
  }
});

cron.schedule('00 00 10 * * 0-6', () => startAllSurvey())

const startAllSurvey = () => {
  let worksheets_a = {};
  for (const sheetName of workbook.SheetNames) {
    worksheets_a[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }

  worksheets_a.users.forEach((v, index) => {
    setTimeout(() => startSurvey(v.chatId), index * 2000);
  });
};


startAllSurvey();