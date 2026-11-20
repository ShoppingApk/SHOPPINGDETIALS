# Kaasni

A mobile-first Indian fashion and lifestyle shopping app (pink and purple theme, product grid, category chips, bottom navigation on phones). It includes a private messaging area that only specially created accounts can open.

**Stack:** React 18, Vite, Tailwind CSS, React Router, axios and socket.io-client · Node.js, Express and Socket.IO · MongoDB Atlas with Mongoose · JWT and bcrypt · Cloudinary (optional).
**Hosting:** everything runs on free tiers: Vercel (frontend), Render (API) and MongoDB Atlas M0 (database).

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
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)

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
│  └─ vercel.json            SPA rewrites + security headers
├─ server/                   Express API + Socket.IO (deployed to Render)
│  ├─ config/  models/  routes/  controllers/  middleware/  validators/
│  ├─ services/chatService.js
│  ├─ socket/                Socket.IO auth, events, presence
│  ├─ data/products.js       sample catalogue
│  ├─ seed.js                npm run seed
│  └─ scripts/               create-admin, create-chatuser
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

### `client/.env` (on Vercel: Settings → Environment Variables)
| Variable | Description |
|---|---|
| `VITE_API_URL` | The API's base URL, e.g. `https://kaasni-api.onrender.com`. It is public; never put secrets in `VITE_` variables. |

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

In `server/`: `npm start` (production), `npm run dev`.
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
- It also locks on logout, after 10 minutes of inactivity, and after 2 minutes in a background tab.
- The hide button, or pressing **Esc twice**, returns to the shop home page immediately. The Back button won't reopen the chat.
- Optional setting: hide immediately when switching tabs.

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
  - messages: 20 per 10 seconds per connection.
- **Headers and limits:**
  - helmet on the API (strict CSP, no `x-powered-by`, `no-referrer`);
  - CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` and Permissions-Policy on the frontend (`vercel.json`);
  - JSON bodies capped at 100 KB.
- **CORS:** limited to `CLIENT_URL` for both the REST API and Socket.IO.
- **Messages:**
  - text is encrypted with AES-256-GCM (random IV per message, authenticated);
  - ciphertext is never sent to clients;
  - deleted-for-everyone content is wiped from the database.
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
