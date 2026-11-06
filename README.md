# 🎙️ EchoNoteAI — AI Meeting & Lecture Summarizer

EchoNoteAI records what's on your screen during an online meeting or class and turns it into
notes: a full summary, a timeline of topics with key screenshots, equations rendered properly,
and a read-aloud mode.

🚀 **One-click record. Automatic notes. Listen back anytime.**

---

## 🌟 Features

- 🧩 **Chrome extension recorder.** Pick a tab, window or screen and it takes a screenshot every
  5 seconds. Recordings stop on their own after 1 hour, and the extension shows a countdown in
  the last 5 minutes.
- 🔒 **Sign-in with Clerk.** The website signs you in and hands the extension its own
  short-lived token, so you never sign in twice.
- ☁️ **Screenshot storage.** Screenshots are uploaded through the server to Cloudinary, and each
  one is saved with the time it was taken.
- 🔎 **Background OCR.** Text is read from every screenshot with OCR.space by a separate worker
  that pulls jobs from a RabbitMQ queue. Failed jobs are retried, and recording never waits on
  OCR.
- 🧠 **Structured AI summaries (Gemini).** Each summary has:
  - a **complete summary** of the whole session
  - a **timeline**: the session split into topics, where the AI chooses the boundaries. Each
    topic has a heading, a summary and 1–3 key screenshots with captions.
  - **equations** as LaTeX, each with a spoken version, so read-aloud says *"x squared plus
    one"* instead of reading out LaTeX
- 🧮 **Math rendering.** Equations are typeset with KaTeX. Copying a summary gives you
  Markdown with `$...$` math.
- 🔊 **Read-aloud.** Hear the full summary, or one topic at a time, using your browser's
  speech engine.
- 🖼️ **Screenshot gallery.** Browse every screenshot with its time, in full size, with keyboard
  navigation.
- 📊 **Live status.** The dashboard and summary page show each session's progress: Recording,
  Reading screenshots (with a progress bar), Generating, Ready or Failed (with Retry).
- 🗑️ **Delete sessions.** Delete a finished session from the dashboard or its summary page.
  This removes its screenshots from Cloudinary and its OCR text and summary from the
  database. A session can't be deleted while it's still recording.
- 📝 **Request logging.** Every API request and response is logged in brief, with secrets
  hidden and long text cut short.

---

## ✨ Demo

> Sign-in flow and dashboard.

![Login and Dashboard](./assets/website.gif)

> Recording with the extension.

![Extension Working](./assets/extension.gif)

> A session summary.

![Example Summary Page](./assets/summary.png)

---

## 🛠️ How It Works

```
 Chrome extension ──screenshots──▶  API (Express)  ──upload──▶ Cloudinary
                                      │      │
                     sessions/images  │      │ jobs
                                      ▼      ▼
                                  MongoDB   RabbitMQ ──▶ Worker ──▶ OCR.space (text)
                                      ▲                    │   └──▶ Gemini (summary)
                                      └────── results ─────┘
 Website (React) ◀──── session, screenshots, summary ──── API
```

1. **Sign in** on the website. It sends the extension a token through
   `chrome.runtime.sendMessage`, so no cookies are involved.
2. **Record.** The extension creates a session, then uploads a JPEG every 5 seconds. The API
   stores it in Cloudinary, adds it to the session's `images` list as `processing`, and queues an
   OCR job.
3. **OCR.** The worker reads the text from each screenshot and marks it `completed`. A screenshot
   still failing after 3 attempts is marked `failed`.
4. **Stop.** Click Stop or end screen sharing. A recording also ends at the 1-hour limit, or when
   the session has had no new screenshot for over a minute and someone opens its summary.
5. **Summarize.** Opening the session on the website asks for the summary. It's generated once,
   when the session is finished and every screenshot's OCR is done or has failed. The worker
   sends Gemini the OCR text with timestamps and gets back structured JSON: topics, key
   screenshots, equations and the complete summary. The result is saved on the session.
6. **Read, listen, browse.** The summary page has three tabs: **Summary**, **Timeline** and
   **Screenshots**.

---

## 🧱 Tech Stack

| Component     | Technology                                                        |
|---------------|-------------------------------------------------------------------|
| 🌐 Website    | React 19, Vite, TailwindCSS, Clerk, react-markdown + KaTeX        |
| 🧩 Extension  | Chrome Manifest V3, HTML/CSS/JavaScript, `getDisplayMedia`        |
| 🖥️ API        | Node.js, Express, Mongoose, multer, express-rate-limit            |
| ⚙️ Worker     | Node.js, RabbitMQ (amqplib) with retry and dead-letter queues     |
| 🗄️ Storage    | MongoDB (remote, e.g. Atlas), Cloudinary (screenshots)            |
| 🧠 AI         | OCR.space, Google Gemini (structured output via `@google/genai`)  |
| 🐳 Runtime    | Docker Compose: api, worker, client and rabbitmq on one network   |
| 🔊 TTS        | Browser SpeechSynthesis                                           |

---

## 📁 Project Structure

```
echo-note/
├── .env.example          # All configuration in one file; copy to .env
├── docker-compose.yml     # Services: rabbitmq, api, worker, client (network echonote-net)
├── docker-compose.dev.yml # Dev overrides: live reload, source mounts, RabbitMQ UI
├── package.json           # npm workspace root + docker scripts
├── client/                # Website (React + Vite)
│   └── src/
│       ├── api/             # HTTP calls to the API
│       ├── components/      # Timeline, gallery, lightbox, TTS, status badge, markdown
│       ├── hooks/           # useSummary: requests and polls a session's summary
│       ├── pages/           # Landing, Dashboard, SummaryPage
│       └── utils/           # Equations, speech text, time formatting, Cloudinary URLs
├── server/                # API + worker (same image, different entry point)
│   ├── server.js            # API entry point
│   ├── worker.js            # Worker entry point (OCR + summary consumers)
│   ├── routes/ controllers/ middlewares/
│   ├── services/            # Session logic, summary gate, summary input/output
│   │   └── external/          # Cloudinary, OCR.space, Gemini, Clerk clients
│   ├── queue/               # RabbitMQ connection, topology, publisher
│   ├── workers/             # Queue consumers with retry/dead-letter handling
│   ├── prompts/             # Gemini prompt + JSON schema
│   ├── schemas/             # Mongoose models (user, session)
│   └── config/              # Session limits
├── web_extension/         # Chrome extension (MV3)
│   └── frontend/config.js   # API/website URLs and screenshot interval
└── assets/                # README images
```

---

## 🚀 Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose v2)
- Node.js 20+ and npm, for installing packages and running lint/build on your machine
- Google Chrome
- Accounts and keys for the services below

| Service | What it's for | Where to get it |
|---|---|---|
| MongoDB | Users and sessions | [MongoDB Atlas](https://www.mongodb.com/atlas): cluster → Connect → Drivers |
| Clerk | Sign-in | [Clerk dashboard](https://dashboard.clerk.com): API Keys (secret + publishable) |
| Gemini | Summaries | [Google AI Studio](https://aistudio.google.com/apikey) |
| OCR.space | Text from screenshots | [Free key](https://ocr.space/ocrapi/freekey) |
| Cloudinary | Screenshot storage | [Cloudinary console](https://console.cloudinary.com): Settings → API Keys. The key needs **upload** permission |

### 1. Configure

All configuration is one file at the repo root:

```bash
git clone <this-repo>
cd echo-note
cp .env.example .env
```

Fill in the **Required** section of `.env`. The comments in `.env.example` explain each
variable. Everything under **Optional** has working defaults. Leave `VITE_EXTENSION_ID` for now;
you'll get it in step 3.

### 2. Start the app

```bash
npm install   # installs client + server packages on your machine (for your editor, lint, build)
npm run dev   # builds and starts rabbitmq, api, worker and client in Docker
```

| What | URL |
|---|---|
| Website | http://localhost:5173 |
| API | http://localhost:3000 |
| RabbitMQ management UI | http://localhost:15672 (login from `RABBITMQ_USER` / `RABBITMQ_PASS`) |

Code changes reload automatically. The api and worker restart via nodemon, and the website
updates via Vite hot reload.

### 3. Install the extension

Chrome can't install an unpacked extension from the command line, so this step is manual:

1. Open `chrome://extensions/` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `web_extension/` folder.
3. Copy the extension ID from its card into `VITE_EXTENSION_ID` in `.env`.
4. Run `npm run dev` again. The website reads `.env` only at startup.

### 4. Use it

1. Sign in on the website. The extension receives its token automatically.
2. Open the extension, give the session a title, and click **Record**. Choose what to share.
3. Click **Stop** when you're done, then **View summary on website**. You can also open the
   session from the dashboard.
4. The summary page shows progress while screenshots are read and the summary is generated. It
   updates on its own.

---

## 🧰 Commands

| Command | What it does |
|---|---|
| `npm run dev` | Build and start every service (attached; Ctrl+C stops them) |
| `npm run dev:down` | Stop and remove the containers (RabbitMQ data is kept in a volume) |
| `npm run dev:logs` | Follow the logs of every service |
| `npm run build` | Production build of the website into `client/dist` |
| `npm run lint -w client` | Lint the website |

Other useful commands:

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api worker` follows
  the logs of just the api and worker.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --scale worker=2` runs
  more workers for faster OCR.

---

## ⚙️ Configuration notes

- **One `.env` for everything.** Docker Compose loads it into the api and worker. The website
  container gets only the `VITE_*` values, which are public by design.
- **Changing `.env`.** Run `npm run dev` again. Restarting a container doesn't reload the file.
- **Limits.**
  - `MAX_SESSION_DURATION_MS` sets the 1-hour recording cap. Set it to `120000` to test the
    time limit in 2 minutes.
  - `STALE_SESSION_MS` sets the 1-minute auto-close.
  - `MAX_IMAGES_PER_SESSION` caps the number of screenshots in a session.
- **Screenshot interval.** It's `SCREENSHOT_INTERVAL_MS` in `web_extension/frontend/config.js`.
  The default is 5 seconds; reload the extension after changing it.
- **Other origins.** For anything other than localhost, change these:
  - `API_BASE_URL` and `WEBSITE_URL` in `web_extension/frontend/config.js`
  - `host_permissions` and the content script `matches` in `web_extension/manifest.json`
  - `VITE_API_BASE_URL` and `CORS_ALLOWED_ORIGINS` in `.env`

---

## 🩺 Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Screenshot uploads fail with `502 UPLOAD_FAILED`, and the log shows Cloudinary `403` | The Cloudinary API key lacks upload ("create") permission. Give the key full access in Settings → API Keys, or create a new key. |
| `RabbitMQ connect failed … retrying` at startup | Normal for a few seconds while RabbitMQ boots. The api and worker reconnect on their own. |
| Website says it couldn't load sessions, or the API returns 401 | Check that `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` come from the same Clerk app. |
| Extension says you're not signed in | Check `VITE_EXTENSION_ID` matches the extension's card, run `npm run dev` again, then reload the website. |
| Summary failed: "No readable text was found" | OCR found no text in any screenshot. Retrying won't help. |
| Summary failed for another reason | Click **Retry**. Check `GEMINI_API_KEY` and `GEMINI_MODEL`, and the worker logs. |

---

## 🔭 Future Work

- **Private screenshots.** Screenshot links are currently public. Serve them through the API
  with signed or expiring URLs.
- **Production deployment.** Production Docker images (static website on nginx, slim
  Node image), a production compose file, and packaging the extension for the Chrome Web Store.
- **Tests and health checks.** Unit tests for the summary gate and the summary input/output
  steps, API tests, and container health checks.
- **Vision input.** Send key screenshots to Gemini alongside the OCR text, for diagrams and
  slides with little text.
- **Smarter screenshots.** Skip near-identical screenshots while recording to save storage
  and OCR calls.
- **Session management.** Rename sessions.
- **More features.** Search across sessions, and export to PDF or Markdown files.
- **Live notes.** Build the timeline while a recording is still running.
- **Audio.** Capture tab audio and transcribe it alongside the screen text.

---

## 👨‍💻 Authors

Built with ❤️ by Hrushikesh Musaloj & Mudit Kesharia
