const TelegramBot = require('node-telegram-bot-api');

function createBot() {
  const token = process.env.BOT_TOKEN;
  const webAppUrl = process.env.WEBAPP_URL;

  if (!token) throw new Error('BOT_TOKEN is missing from .env');
  if (!webAppUrl || !webAppUrl.startsWith('https://')) {
    throw new Error('WEBAPP_URL must be a public https:// URL for the Telegram Mini App to open');
  }

  const bot = new TelegramBot(token, { polling: true });

  const openButton = {
    reply_markup: {
      inline_keyboard: [[{ text: '⚽ Open Match Dossier', web_app: { url: webAppUrl } }]]
    }
  };

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      'Match Dossier — pick an upcoming fixture and get a weighted read on H2H, form, injuries, table position and home/away splits.',
      openButton
    );
  });

  bot.onText(/\/predict/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Tap below to open the dashboard:', openButton);
  });

  // Sets the persistent blue "menu" button next to the message box to open the Mini App directly.
  bot.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Match Dossier', web_app: { url: webAppUrl } }
  }).catch((e) => console.warn('Could not set chat menu button:', e.message));

  bot.on('polling_error', (err) => console.error('Telegram polling error:', err.message));

  return bot;
}

module.exports = { createBot };
