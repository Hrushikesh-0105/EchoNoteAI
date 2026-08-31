# 🎙️ EchoNoteAI — AI Meeting Summarizer

EchoNoteAI is your personal AI-powered meeting assistant. It records your online meetings and uses generative AI to summarize them — so you never miss a detail again.

🚀 **One-click record. Seamless summarization. Instant replay.**

---

## 🌟 Features

- 🧩 **Browser Extension** — Screen-record your meetings effortlessly.
- 🔒 **Authentication** — Secure sign-up/login with Clerk.
- 📦 **Session Storage** — All your recordings and summaries in one place.
- 🤖 **OCR + AI Summarization** — Automatically convert screen recordings into concise summaries using OCR and Gemini API.
- 🔊 **Text-to-Speech** — Playback your meeting summary like a podcast.

---

## ✨ Demo

> Shows login/signup flow and dashboard view.

![Login and Dashboard](./assets/website.gif)


> Demonstrates extension recording and session creation.

![Extension Working](./assets/extension.gif)


> Summary of the meeting/class.

![Example Summary Page](./assets/summary.png)

---

## 🛠️ How It Works

### 1. 📝 Sign Up
- User signs up via the EchoNoteAI **website** (React + Clerk).
- Once signed in, the website mints a short-lived token and hands it to the extension
  (if installed) via `chrome.runtime.sendMessage` — no cookies involved.

### 2. 🔌 Install the Extension
- Manually load the extension in Chrome:
  - Go to `chrome://extensions/`
  - Enable **Developer Mode**
  - Click **"Load unpacked"**
  - Select the `web_extension/` folder

### 3. 🎥 Start Recording
- Click "Record" in the extension.
- Screenshots are captured every 5 seconds (configurable via `SCREENSHOT_INTERVAL_MS` in
  `web_extension/frontend/config.js`) and sent to the server (base64-encoded).
- Each session is stored in MongoDB with a unique `sessionId`.

### 4. 🧠 OCR + AI Summary
- Each image is processed using **OCR.Space API**.
- Extracted text is concatenated and stored.
- When you open a session, the full text is summarized using **Gemini API** (only once per session).

### 5. 📚 View or Listen to Summary
- Summaries are shown on your dashboard.
- You can read or use **Text-to-Speech (TTS)** to listen.

---

## 🧱 Tech Stack

| Component       | Technology Used                        |
|----------------|---------------------------------------- |
| 🌐 Website      | React, TailwindCSS, Clerk Auth         |
| 🧩 Extension    | HTML, CSS, JavaScript                  |
| 🖥️ Server       | Node.js, Express.js, MongoDB           |
| 🧠 AI APIs      | OCR.Space API, Gemini API              |
| 🔊 TTS          | SpeechSynthesis                        |

---

## 📁 Project Structure

```
EchoNoteAI/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── api/         # HTTP calls to the server, grouped by resource
│   │   ├── components/  # Reusable UI (Navbar, TTS, auth-sync components)
│   │   ├── pages/        # Route-level views (Landing, Dashboard, SummaryPage)
│   │   └── utils/
│   └── .env.example
├── server/           # Node.js/Express backend
│   ├── routes/        # Path + middleware + controller wiring only
│   ├── controllers/    # Request/response handling
│   ├── services/        # Business logic
│   │   └── external/      # One client per third-party API (Clerk, Gemini, OCR.space)
│   ├── middlewares/
│   ├── prompts/         # LLM prompts, as named exports
│   ├── schemas/
│   └── .env.example
├── web_extension/    # MV3 Chrome extension (screen capture → server)
├── assets/            # Images, GIFs
├── package.json      # Root workspace — see Quick Start below
└── README.md
```

---

## 🚀 Quick Start

This repo is an npm workspace — one install, one command, both the website and the
server come up together.

```bash
git clone <this-repo>
cd EchoNoteAI

cp server/.env.example server/.env   # then fill in the values (see comments in the file)
cp client/.env.example client/.env   # then fill in the values

npm install   # installs client + server dependencies in one shot
npm run dev   # runs the website (:5173) and the server (:3000) together
```

That's it for the website + server. **The browser extension is a separate, manual step**
— Chrome doesn't allow installing an extension from the command line:

1. Go to `chrome://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked**, select the `web_extension/` folder
4. Copy the extension ID shown on its card into `client/.env`'s `VITE_EXTENSION_ID`,
   then restart `npm run dev` (Vite only reads `.env` at startup)

See `server/.env.example` and `client/.env.example` for what each variable is and where
to get it (Clerk, Gemini, OCR.space, MongoDB Atlas).

---

## 👨‍💻 Authors

Built with ❤️ by Hrushikesh Musaloj & Mudit Kesharia
