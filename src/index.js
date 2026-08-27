require('dotenv').config();
const { createServer } = require('./server');
const { createBot } = require('./bot');

const PORT = process.env.PORT || 3000;

const app = createServer();
app.listen(PORT, () => console.log(`Match Dossier web server listening on :${PORT}`));

try {
  createBot();
  console.log('Telegram bot started (polling).');
} catch (e) {
  console.error('Bot did not start:', e.message);
  console.error('The web dashboard still works standalone at your WEBAPP_URL — fix .env and restart to enable the bot.');
}
