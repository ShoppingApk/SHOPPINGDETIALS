# Kaasni

A mobile-first Indian fashion and lifestyle shopping app (pink and purple theme, product grid, category chips, bottom navigation on phones). It includes a private messaging area that only specially created accounts can open.

**Stack:** React 18, Vite, Tailwind CSS, React Router, axios and socket.io-client · Node.js, Express and Socket.IO · MongoDB Atlas with Mongoose · JWT and bcrypt · Cloudinary (optional).
**Hosting:** everything runs on free tiers: Vercel or Netlify (frontend), Render (API) and MongoDB Atlas M0 (database). Calls need no paid service.

> The private messaging feature is meant to stay unknown to ordinary shoppers. If that matters to you, keep this repository **private**: the code and these docs describe it.

---

## Contents
1. [Features](#features)
2. [Project structure](#project-structure)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Scripts](#scripts)
6. [Seeding data and creating the first admin](#seeding-data-and-creating-the-first-admin)
7. [Roles and the private area](#roles-and-the-private-area)
8. [Free deployment: Atlas, Render and Vercel](#free-deployment-atlas--render--vercel)
9. [Keeping Render awake](#keeping-render-awake-free-uptime-pinger)
10. [Calls (audio and video)](#calls-audio-and-video)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)

API reference: **[API_DOCS.md](API_DOCS.md)**

---

## Features

**Shopping (everyone)**
- Accounts: register, log in, log out, edit profile, change password.
- Home page:
  - auto-sliding banners and category chips;
  - "Trending" and "Deals of the day" rails;
  - an infinite-scroll product feed.
- Search: debounced suggestions, recent searches, and filters for category, price, brand, size and rating. Sorting and pagination are kept in the URL.
- Product page:
  - image gallery, price with MRP and discount;
  - size (required) and colour choice, quantity;
  - Add to bag, Buy now, wishlist;
  - reviews and similar products.
- Bag and checkout:
  - bag with quantity changes and a price summary (free delivery from ₹499);
  - wishlist;
  - checkout with saved or new addresses, **Cash on Delivery only** (no real payments).
- Orders: order history and detail with a status timeline; you can cancel until the order ships.

**Admin panel** (`/admin`, admins only)
- Dashboard: revenue, order counts, low-stock items, recent orders.
- Products: create, edit, hide or show, and delete. Images can be uploaded to Cloudinary or added as image links.
- Orders: filter by status; placed → shipped → delivered, or cancel (stock is restored).
- Users: search and filter, **create chatusers** with a generated temporary password, and **disable or enable** accounts. Disabling signs the user out everywhere.

**Private messaging** (chatusers only, see [below](#roles-and-the-private-area))
- One-to-one, real-time chat (Socket.IO) with typing indicators, online and last-seen status, and sent, delivered and read ticks.
- Image sharing (with Cloudinary) and an emoji picker.
- Delete for me, or delete for everyone (within 1 hour).
- Message text is encrypted at rest with AES-256-GCM.
- Quick hide (panic) and automatic locking.
- **One-to-one voice and video calls** (WebRTC):
  - incoming-call screen with a ringtone, mute, camera on/off and switch, speaker choice, and a draggable self-view;
  - quality indicator; video adapts automatically to the network and voice is always protected first;
  - automatic reconnection;
  - a call log in the chat and a built-in Call test page.
  See [Calls](#calls-audio-and-video).

---

## Project structure
```
shopchat/
├─ client/                   React app (deployed to Vercel)
│  ├─ src/api/               axios instance + one file per API area
│  ├─ src/context/           Auth, Cart, Wishlist, Chat (unlock state)
│  ├─ src/components/        shared UI (Navbar, SearchBar, ProductCard, Modal, admin/…)
│  ├─ src/pages/             shop pages + pages/admin/*
│  ├─ src/chat/              private messaging UI, lazy-loaded only after unlock
│  │  └─ call/               WebRTC calls (useCall, callService, call screens, Call test)
│  ├─ vercel.json            SPA rewrites + security headers (Vercel)
│  └─ netlify.toml           the same for Netlify
├─ server/                   Express API + Socket.IO (deployed to Render)
│  ├─ config/  models/  routes/  controllers/  middleware/  validators/
│  ├─ services/              chatService, callManager (call state), iceService (STUN/TURN)
│  ├─ socket/                Socket.IO auth, events, presence, calls.js (call signaling)
│  ├─ tests/                 unit tests (npm test)
│  ├─ data/products.js       sample catalogue
│  ├─ seed.js                npm run seed
│  └─ scripts/               create-admin, create-chatuser
├─ deploy/coturn/            optional self-hosted TURN server (docker compose + guide)
├─ render.yaml               optional Render Blueprint
├─ API_DOCS.md
└─ package.json              root scripts (dev runs client + server together)
```

---

## Local setup

**You need:** Node.js 20 or newer, and a free MongoDB Atlas cluster (see [Deployment, step 1](#1-mongodb-atlas-database)).

```bash
cd shopchat
npm run install:all                  # installs root, server and client dependencies

cp server/.env.example server/.env   # Windows: copy server\.env.example server\.env
cp client/.env.example client/.env
```

Fill in `server/.env`: at minimum `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_KEY` and `CHAT_UNLOCK_KEYWORD`. Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY (64 hex chars)
```

Then:
```bash
npm run seed     # 48 sample products + the first admin
npm run dev      # API on http://localhost:5000, app on http://localhost:5173
```

> **Windows PowerShell:** if you see "running scripts is disabled", run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `npm.cmd`, or the Command Prompt.

---

## Environment variables

### `server/.env` (on Render: the service's Environment settings)
| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | Atlas connection string, with the database name (e.g. `/kaasni?`) |
| `JWT_SECRET` | yes | 32+ random characters. Production refuses to start with a weak value. |
| `JWT_EXPIRES_IN` | no | Session length, default `7d` |
| `CLIENT_URL` | yes in prod | Frontend origin(s) for CORS and Socket.IO, comma-separated, no trailing slash |
| `NODE_ENV` | prod | `production` on Render (enables secure cookies and hides error details) |
| `PORT` | no | Defaults to 5000; Render sets it for you |
| `ENCRYPTION_KEY` | for chat | 64 hex characters. **Keep it safe and never change it**, or old messages become unreadable. |
| `CHAT_UNLOCK_KEYWORD` | for chat | The secret search word that opens the private area. It only ever lives on the server. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | optional | Enables image uploads (product photos and chat images) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for seeding | Used by `npm run seed` and `npm run create-admin` |
| `TURN_PROVIDER` | optional | Calls: `none` (default, STUN only), `static`, `coturn-secret`, `cloudflare` or `metered`. See [Calls](#calls-audio-and-video). |
| `TURN_URLS` | static, coturn-secret | Comma-separated `turn:`/`turns:` URLs (never port 53) |
| `TURN_USERNAME` / `TURN_CREDENTIAL` | static | Fixed TURN login |
| `TURN_SHARED_SECRET` | coturn-secret | coturn's `static-auth-secret` |
| `TURN_KEY_ID` / `TURN_KEY_API_TOKEN` | cloudflare | Cloudflare TURN key ID and API token |
| `METERED_API_KEY` / `METERED_APP_NAME` | metered | Metered API key and app name (`<name>.metered.live`) |

### `client/.env` (on Vercel: Settings → Environment Variables)
| Variable | Description |
|---|---|
| `VITE_API_URL` | The API's base URL, e.g. `https://kaasni-api.onrender.com`. It is public; never put secrets in `VITE_` variables. |

The frontend needs nothing else, not even for calls: TURN settings live only on the API.

---

## Scripts

Run these from the `shopchat` folder.

| Command | What it does |
|---|---|
| `npm run install:all` | Installs all dependencies |
| `npm run dev` | Starts the API (nodemon) and the client (Vite) together |
| `npm run seed` | Replaces products with the 48-item sample catalogue and creates the admin if none exists. Safe to re-run. |
| `npm run create-admin` | Creates the admin from `.env`, or promotes that account and resets its password |
| `npm run create-chatuser -- <email> <password> <name>` | Creates a chatuser, or converts an existing account (resetting its password) |

In `server/`: `npm start` (production), `npm run dev`, `npm test` (call signaling and TURN unit tests).
In `client/`: `npm run dev`, `npm run build`, `npm run preview`.

---

## Seeding data and creating the first admin

1. In `server/.env`, set `ADMIN_NAME`, `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`.
2. Run `npm run seed`. It inserts the sample products and creates that admin **if no admin exists yet**.
   - To create or reset the admin later, run `npm run create-admin`.
3. Log in with those details. You're taken to **/admin**. Your account menu also has an *Admin panel* link.

Re-running the seed replaces all products and clears reviews, bags and wishlists, because product ids change. Users, orders and messages are kept.

Seeding production: the scripts use whatever `MONGO_URI` is in your local `server/.env`. Point it at the production Atlas database and run them from your computer. That's the simplest option, because Render's free tier has no shell.

---

## Roles and the private area

| Role | How it's created | Can do |
|---|---|---|
| `user` | Public sign-up | Shop |
| `chatuser` | Admin panel → Users → *Create chatuser*, or `npm run create-chatuser` | Shop, plus the private area |
| `admin` | `npm run seed` / `npm run create-admin` | Admin panel. Admins **cannot** open the private area. |

**Opening the private area (chatusers only).** For everyone else, nothing happens and nothing is downloaded.
- Type the secret word (`CHAT_UNLOCK_KEYWORD`) in the search bar and press Enter. The server checks it in constant time, so it never appears in the frontend code.
- Or tap the logo **5 times within 3 seconds**.

The private area lives at `/c`. Everyone else sees the normal 404 page there, and every `/api/chat/*` request from them gets the same 404 as an unknown address.

**Locking and quick hide**
- The unlock is kept **in memory only**, so reloading the page locks it.
- It also locks on logout, after 10 minutes of inactivity, and after 2 minutes in a background tab. The last two are paused during a call.
- The hide button, or pressing **Esc twice**, returns to the shop home page immediately. The Back button won't reopen the chat.
- Optional setting: hide immediately when switching tabs.
- Locking or hiding during a call ends the call at once and turns the camera and microphone off.

New chatusers get a temporary password and are prompted to change it under Profile.

---

## Free deployment (Atlas + Render + Vercel)

Order: **database → API → frontend → connect them**. Put the code on GitHub first (a private repository is fine):

```bash
cd shopchat
git init && git add . && git commit -m "Initial commit"
# create an empty private repo on GitHub, then:
git remote add origin https://github.com/<you>/kaasni.git
git branch -M main && git push -u origin main
```

Check that `.env` files are **not** in the commit (`git status` must not list them); `.gitignore` already excludes them.

### 1. MongoDB Atlas (database)
1. Sign up at https://www.mongodb.com/cloud/atlas/register and create an **M0 (Free)** cluster. Choose AWS, Mumbai (`ap-south-1`) for India.
2. **Security → Database & Network Access → Database Users → Add user.** Use "Autogenerate password" and save the password somewhere safe.
3. **IP Access List → Add IP Address → Allow access from anywhere (`0.0.0.0/0`).** Render's free tier has no fixed IP, so this is required; the database password is still the real protection.
4. **Connect → Drivers → Node.js** and copy the string. Replace `<db_password>` with the password (no `< >`), and add the database name after `.net/`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/kaasni?retryWrites=true&w=majority&appName=Cluster0
   ```
5. From your computer, with this `MONGO_URI` in `server/.env`, run `npm run seed` to load products and create the admin.

### 2. Cloudinary (optional, for image uploads)
1. Sign up at https://cloudinary.com (the free plan is enough).
2. In the dashboard under **API Keys**, copy the Cloud name, API key and API secret into the `CLOUDINARY_*` variables.

Without Cloudinary, products use image links and image sharing in messages is turned off.

### 3. Render (API)
1. Sign up at https://render.com with GitHub.
2. Click **New + → Web Service** and pick your repository. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm ci --omit=dev` |
   | Start Command | `npm start` |
   | Instance type | **Free** |
   | Health Check Path (Advanced) | `/api/health` |

   Alternatively: **New + → Blueprint**, which reads [`render.yaml`](render.yaml) and asks for the secret values.
3. **Environment.** Add `NODE_ENV=production`, `NODE_VERSION=22`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `ENCRYPTION_KEY`, `CHAT_UNLOCK_KEYWORD`, and the optional `CLOUDINARY_*`.
   - Set `CLIENT_URL` to `http://localhost:5173` for now; you'll update it in step 5.
   - Use the **same `ENCRYPTION_KEY`** as your local `.env` if both use the same database.
4. Deploy. When it's live, open `https://<your-service>.onrender.com/api/health`. It should show `{"status":"ok",...}`.

### 4. Vercel (frontend)
1. Sign up at https://vercel.com with GitHub.
2. Click **Add New → Project**, import the repo, and set:

   | Field | Value |
   |---|---|
   | Root Directory | `client` |
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. **Environment Variables:** `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
4. Deploy and note your URL, e.g. `https://kaasni.vercel.app`.

[`client/vercel.json`](client/vercel.json) already makes page reloads on routes like `/products` work, and adds the security headers.

### 5. Connect them
1. In Render → Environment, set `CLIENT_URL=https://kaasni.vercel.app` (your exact Vercel URL, no trailing slash).
   - To also allow Vercel preview URLs, comma-separate them.
   - Save; Render redeploys automatically.
2. If you ever change `VITE_API_URL`, **redeploy on Vercel**, because Vite builds it into the app.
3. Open your Vercel URL, log in as the admin, and try an order and the admin panel. Create two chatusers to test messaging.

---

## Keeping Render awake (free uptime pinger)

Render's free web services **go to sleep after about 15 minutes without traffic**. The next visitor then waits roughly 30–60 seconds while it wakes. The app copes (longer timeouts, a "server is waking up" message), but real-time chat and first page loads feel slow.

To keep it awake, have a free monitor request the health endpoint every 5–10 minutes:

**UptimeRobot** (https://uptimerobot.com, free)
1. Click **Add New Monitor**. Monitor type: **HTTP(s)**.
2. URL: `https://<your-service>.onrender.com/api/health`
3. Monitoring interval: **5 minutes**. Save.

**Or cron-job.org** (https://cron-job.org, free): create a cron job with the same URL, set to run **every 10 minutes**.

Notes:
- The free plan includes **750 instance hours per month**, which is enough for one service running all month (about 744 hours). Don't keep several free services awake at once, or the hours run out.
- Free-tier rules change from time to time; check Render's current free plan limits.
- A sleeping service also drops live chat connections. Clients reconnect automatically and re-fetch missed messages.

---

## Calls (audio and video)

One-to-one voice and video calls inside the private area, built on WebRTC. Socket.IO carries the call setup (signaling). The audio and video go **directly between the two browsers**, or through a TURN relay when a direct path isn't possible.

- **Privacy:**
  - calls are always end-to-end encrypted by WebRTC (DTLS-SRTP), so neither the API nor a TURN relay can hear or see them;
  - nothing is recorded, and SDP and ICE details are never logged;
  - only unlocked chatusers can call or be called;
  - a locked or offline user simply shows as **"Unavailable"** to the caller;
  - calls are logged in the chat as missed, declined or completed (with duration).
- **Where to start:** the phone and camera buttons in a conversation's header.
- **Check your network:** **Settings → Call test** shows which connection types work (host, srflx, relay) and whether a TURN relay is working.
- **Voice quality comes first:**
  - echo cancellation, noise suppression and auto gain;
  - Opus mono at about 36 kbps with forward error correction and DTX;
  - audio is sent at high priority.
- **Video:** starts at 640×360, 24 fps. On a poor network it lowers the bitrate and resolution, then pauses itself (voice continues, "Poor connection" is shown) and comes back when the network improves.
- **Reconnection:** on a network drop or a Wi-Fi ↔ mobile data switch, the call reconnects automatically ("Reconnecting…"). It ends cleanly if it can't recover within about 30 seconds.

### Do I need a TURN server?
**STUN** (free, the default) lets two browsers find each other's public address. That's enough for most calls between home Wi-Fi networks. Some networks (many mobile carriers, offices, hotels) block direct connections; there a **TURN** server must relay the call. Without TURN, those calls fail with *"Could not connect on this network"*.

| Option | Cost / sign-up | Effort | Good for |
|---|---|---|---|
| **STUN only** (`none`) | Free, nothing to sign up for | None | Trying it out; Wi-Fi to Wi-Fi |
| **Cloudflare TURN** (`cloudflare`) | Free allowance each month (see Cloudflare's pricing page); free account | 5 min | **Recommended** for real use |
| **Metered** (`metered`) | Small free monthly allowance; free account | 5 min | Real use, low volume |
| **Your own coturn** (`coturn-secret`) | Free VM (Oracle Always Free); the VM sign-up may ask for a card for verification | 30–60 min | Full control, high volume |

Check each provider's current free limits before relying on them. Only calls that actually need the relay use TURN data: roughly 40 MB per hour for voice and 500 MB per hour for video.

### Option A: STUN only (default)
Nothing to do. Leave `TURN_PROVIDER` unset (or `none`). The server logs a startup warning, and the Call test page says *"STUN only: calls may fail on some mobile or strict networks"*.

### Option B: Cloudflare TURN (recommended)
1. Create a free account at <https://dash.cloudflare.com>.
2. In the sidebar, open **Realtime** (sometimes listed as *Calls*) → **TURN Server** → **Create**, and give it a name (e.g. `kaasni`). Cloudflare may ask you to confirm a payment method for usage beyond the free allowance.
3. Copy the **Turn Token ID** and the **API Token**. The token is shown only once.
4. On Render, open your API service → **Environment** and add:

   | Key | Value |
   |---|---|
   | `TURN_PROVIDER` | `cloudflare` |
   | `TURN_KEY_ID` | the Turn Token ID |
   | `TURN_KEY_API_TOKEN` | the API token |

5. Save (Render restarts the service), then open **Settings → Call test** in the app. It should say **"TURN relay is working"**.

The API asks Cloudflare for credentials that last 1 hour, caches them briefly, and removes the port-53 URLs that browsers block.

### Option C: Metered
1. Sign up for free at <https://www.metered.ca/stun-turn>. Create an app; its address looks like `yourapp.metered.live`.
2. In the dashboard, open **TURN Server** (or **Developers**) and copy the **API key** used for the *TURN credentials API*.
3. On Render, add:

   | Key | Value |
   |---|---|
   | `TURN_PROVIDER` | `metered` |
   | `METERED_API_KEY` | the API key |
   | `METERED_APP_NAME` | `yourapp`, the part before `.metered.live` |

4. Save, and run the Call test.

### Option D: Your own coturn server
Follow **[deploy/coturn/COTURN_SETUP.md](deploy/coturn/COTURN_SETUP.md)**: a step-by-step guide for a free Oracle Cloud or Google Cloud VM with Docker. It covers firewall ports, optional TLS on 443, and testing. Then on Render:

| Key | Value |
|---|---|
| `TURN_PROVIDER` | `coturn-secret` |
| `TURN_SHARED_SECRET` | the same secret as on the VM |
| `TURN_URLS` | `turn:VM_IP:3478?transport=udp,turn:VM_IP:3478?transport=tcp` (plus `turns:your-domain:5349?transport=tcp` with TLS) |

Any other TURN service with a fixed username and password works with `TURN_PROVIDER=static`, plus `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL`.

**Vercel / Netlify:** nothing to add for calls. TURN secrets never go into `VITE_` variables or the frontend.

### Calls troubleshooting

| Problem | What to check |
|---|---|
| "Permission denied" for microphone or camera | Click the lock icon in the address bar → allow Microphone/Camera, then try again. On phones: browser settings → Site settings. Calls need **https** (or `localhost`). |
| "Being used by another app" | Close other apps or tabs using the camera or microphone (Zoom, Meet, another call). |
| "Could not connect on this network" | Run **Settings → Call test** on both devices. With *STUN only*, add TURN (options B–D). Try **Retry** or **Switch to audio only**. |
| Works on Wi-Fi, fails on mobile data | Typical NAT/firewall problem. Add a TURN server; for very strict networks use TURN over TLS on port 443 (coturn guide, step 9). |
| No audio at all | Make sure neither side is muted (the call screen shows "You are muted" or "… is muted"). If "Tap to turn on sound" appears, tap it (browser autoplay rules). Check the **Speaker** choice and the device volume. |
| One-way audio | One side's microphone is muted or blocked, or a firewall lets traffic through in only one direction. Check permissions on both devices, then add TURN. |
| Call connects but no video | The camera may be off or used by another app, or video paused itself on a poor connection ("Video paused: poor connection"). It resumes automatically when the network improves. |
| Echo | Usually one side is on loudspeaker at high volume, or on two devices in the same room. Use headphones or lower the volume. Echo cancellation is on by default. |
| Choppy voice | Weak network: the quality bars show red or amber. Move closer to Wi-Fi, or switch to audio only. Voice is prioritised over video automatically. |
| Call test shows no *relay* with TURN configured | Check the TURN variables on Render (exact values, no spaces), and the firewall ports for your own coturn. |
| Call ended when switching apps | The *Hide when I switch tabs* setting is on; it hides the chat (and ends the call) on purpose. Turn it off if you switch apps during calls. |

---

## Security

- **Passwords:**
  - hashed with bcrypt (12 rounds);
  - strength rules enforced on the server;
  - login errors don't reveal whether an email exists.
- **Sessions (JWT):**
  - sent as a Bearer header, which works across the Vercel and Render domains, and also set as an httpOnly, `Secure`, `SameSite=None` cookie in production;
  - tokens are **invalidated after a password change**;
  - disabled accounts are rejected on every request and every socket connection, and get signed out (401).
- **Roles:**
  - `protect` and `authorize(...)` middleware guard admin routes;
  - public sign-up can only create `user` accounts;
  - private routes return a plain 404 to everyone but chatusers.
- **Input validation:**
  - express-validator on every body, query and route parameter;
  - typed and length-limited socket payloads;
  - image type and size checks on uploads.
- **Injection and parameter tampering:**
  - `express-mongo-sanitize`, plus a flat query parser (no `?a[b]=` objects) and a parameter-pollution guard;
  - search terms are regex-escaped.
- **Rate limits:**
  - login and register: 20 per 15 minutes per IP;
  - API: 300 per minute per IP;
  - unlock attempts: 10 per 5 minutes per account;
  - messages: 20 per 10 seconds per connection;
  - call invites: 5 per minute per user; call signaling is limited per connection;
  - ICE server list: 30 per 10 minutes per account.
- **Headers and limits:**
  - helmet on the API (strict CSP, no `x-powered-by`, `no-referrer`);
  - CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` and Permissions-Policy on the frontend (`vercel.json` / `netlify.toml`);
  - camera, microphone and screen wake lock are allowed for the site's own origin only, and blocked in any embedded frame;
  - JSON bodies capped at 100 KB.
- **CORS:** limited to `CLIENT_URL` for both the REST API and Socket.IO.
- **Messages:**
  - text is encrypted with AES-256-GCM (random IV per message, authenticated);
  - ciphertext is never sent to clients;
  - deleted-for-everyone content is wiped from the database.
- **Calls:**
  - WebRTC media is always encrypted (DTLS-SRTP), peer to peer or through TURN, and is never recorded or logged;
  - signaling is validated (UUID call IDs, only the two participants, from the tab in the call; unknown or ended calls are ignored);
  - TURN secrets stay on the server, and browsers get short-lived credentials;
  - locked or offline users only ever appear as "Unavailable".
- **Secrets:**
  - only in environment variables; `.env` files are git-ignored;
  - the unlock keyword never reaches the browser;
  - production refuses to start with a weak `JWT_SECRET` or a missing `CLIENT_URL`.
- **Not included:**
  - real payments;
  - email verification and password-reset emails (admins can reset a password by re-running `create-admin` or `create-chatuser`);
  - end-to-end encryption (the server can decrypt messages).

  Run `npm audit` in `server/` and `client/` from time to time.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm` not recognized / "running scripts is disabled" | Install Node.js LTS and reopen VS Code. Then run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `npm.cmd`. |
| `Missing required env vars` | `server/.env` doesn't exist or is incomplete; copy it from `.env.example`. |
| `MONGO_URI ... placeholder values` | Paste the real Atlas string, without `< >` around the password. |
| `bad auth : authentication failed` | Wrong database user password; reset it in Atlas → Database Access. |
| Can't connect to Atlas / timeout | Add `0.0.0.0/0` (or your IP) under Network Access. Office networks sometimes block port 27017. |
| Browser shows a **CORS** error | `CLIENT_URL` on Render must exactly match the site's origin: `https`, no trailing slash. |
| Site loads but data doesn't | Check `VITE_API_URL` on Vercel, then **redeploy**. Open `/api/health` to wake Render. |
| First request is slow | Render was asleep; see [Keeping Render awake](#keeping-render-awake-free-uptime-pinger). |
| `Refusing to start in production` | Set a long random `JWT_SECRET` and `CLIENT_URL` on Render. |
| Image upload says "not configured" | Add the three `CLOUDINARY_*` variables, or use image links. |
| Old messages show "could not be decrypted" | `ENCRYPTION_KEY` changed; restore the original value. |
| Port 5000 already in use (locally) | Another server is running; stop it, or set `PORT` in `server/.env` and `VITE_API_URL` to match. |
