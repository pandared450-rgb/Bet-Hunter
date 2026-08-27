# Match Dossier — Football Prediction Telegram Mini App

A Telegram Mini App that analyzes an upcoming football fixture using:

- Head-to-head record
- Recent form (last 5 matches)
- Injuries
- League table position
- Home / away split (home team's home record vs away team's away record)

...and combines them into a weighted Home / Draw / Away percentage, shown with the
reasoning behind it. Data comes from **API-Football** (api-sports.io). Your API key
lives only on the server — the browser/Mini App never sees it.

## How it's built

```
football-predict-bot/
├── src/
│   ├── index.js        # starts the web server + the bot
│   ├── server.js       # Express app: serves the Mini App, proxies API-Football
│   ├── bot.js           # Telegram bot: /start button + persistent menu button
│   ├── apiFootball.js   # all outbound calls to api-sports.io
│   └── predictor.js     # the weighted scoring model (pure functions)
└── public/
    ├── index.html        # Mini App UI shell
    ├── style.css          # theming (adapts to Telegram's dark/light mode)
    └── app.js             # frontend logic, calls our own /api/* routes
```

The bot and the web dashboard run **in the same Node process** — one `npm start`
gets you both, which keeps free-tier hosting simple.

## 1. Get your credentials

1. **Telegram bot token**: message [@BotFather](https://t.me/BotFather) → `/newbot` →
   follow the prompts → copy the token it gives you.
2. **API-Football key**: sign up free at
   [dashboard.api-football.com](https://dashboard.api-football.com) → copy your key
   from the dashboard. (You said you already have one — use that.)

## 2. Push this to GitHub

```bash
cd football-predict-bot
git init
git add .
git commit -m "Match Dossier: football prediction Telegram Mini App"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is already in `.gitignore` — never commit your real token/key.

## 3. Deploy it somewhere public over HTTPS

Telegram Mini Apps must open at a public `https://` URL. Any of these work and have
free tiers: **Render**, **Railway**, **Fly.io**, or your own VPS with a reverse proxy
(Caddy/Nginx) and a domain.

Example with **Render**:

1. New → Web Service → connect your GitHub repo.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables (from your `.env`, see step 4): `BOT_TOKEN`,
   `API_FOOTBALL_KEY`, `WEBAPP_URL`, `PORT` (Render sets `PORT` itself — you can
   leave your own `PORT` var out and the app will still bind correctly since we read
   `process.env.PORT`).
5. Deploy. Render gives you a URL like `https://match-dossier.onrender.com`.

## 4. Set environment variables

Copy `.env.example` to `.env` locally for testing, and set the same values in your
host's dashboard for production:

```
BOT_TOKEN=<your bot token>
API_FOOTBALL_KEY=<your API-Football key>
WEBAPP_URL=https://match-dossier.onrender.com   # your deployed URL from step 3
PORT=3000
```

`WEBAPP_URL` **must** be the exact public HTTPS URL from your deployment — the bot
sends this URL to Telegram as the Mini App target.

## 5. Run it

Locally:
```bash
npm install
npm start
```

In production, your host runs `npm start` automatically after each deploy (per the
start command in step 3).

## 6. Open it in Telegram

1. Find your bot in Telegram (the username you gave BotFather) and send `/start`.
2. Tap the **⚽ Open Match Dossier** button — the Mini App opens inside Telegram.
3. There's also a persistent menu button (bottom-left, next to the message box) set
   automatically on startup.

If Telegram refuses to open the Mini App and shows a domain error, go back to
BotFather → your bot → **Bot Settings → Menu Button → Configure Menu Button** (or
`/setdomain`) and register the same HTTPS domain from `WEBAPP_URL`.

## Retuning the model

All the weights live in one place — `src/predictor.js`:

```js
const WEIGHTS = {
  form: 0.25,
  h2h: 0.15,
  split: 0.25,
  table: 0.20,
  injury: 0.15
};
```

Change these numbers (they don't need to sum to 1 — they're relative) and restart to
change how much each factor pulls the final percentage.

## Notes

- This produces a statistical read, not a guarantee. Treat it as one input, not a
  final answer — especially around injuries and small-sample head-to-head records.
- API-Football's free plan has a daily request cap; each fixture analysis makes 5
  calls (H2H, two team-stats calls, standings, two injury calls). Watch your usage
  if you plan to add many leagues or a heavily-used bot.
- If you outgrow the "run bot + web server in one process" setup (e.g. you want
  webhook mode instead of polling for scale), that's a small change to `src/bot.js`
  and `src/server.js` — ask and it can be added.
