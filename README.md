# Trading Journal

ტრეიდების პირადი ჟურნალი — Hono + TypeScript **Cloudflare Workers**-ზე.
მონაცემები **D1**-ში (SQLite), სქრინშოტები **R2**-ში.

სრული ფუნქციონალი აღწერილია [`SPEC.md`](./SPEC.md)-ში.

## სტეკი

| ფენა | ტექნოლოგია |
|---|---|
| სერვერი | Cloudflare Workers + [Hono](https://hono.dev) |
| ბაზა | Cloudflare D1 (SQLite) |
| ფაილები | Cloudflare R2 |
| UI | `hono/jsx` server-side rendering + Tailwind CSS (CDN) |
| გრაფიკები | Chart.js 4 (CDN) |

Build step არ არის — Tailwind და Chart.js CDN-იდან იტვირთება.

## ლოკალურად გაშვება

```bash
npm install
npm run db:migrate:local  # სქემა ლოკალურ D1-ში
npm run dev               # http://127.0.0.1:8787
```

ლოკალური პაროლი და გასაღებები — `.dev.vars` ფაილში (git-ში არ ხვდება).

```
AUTH_PASSWORD=local-dev-password
SESSION_SECRET=local-dev-session-secret-change-me
JOURNAL_API_KEY=local-dev-api-key
```

## Cloudflare-ზე განთავსება

### 1. ავტორიზაცია

```bash
npx wrangler login
```

### 2. ბაზა და bucket

```bash
npx wrangler d1 create trading-journal
npx wrangler r2 bucket create trading-journal-uploads
```

`d1 create`-ის შედეგში მიღებული **`database_id`** ჩასვი `wrangler.toml`-ში
(`REPLACE_WITH_YOUR_D1_ID`-ის ნაცვლად).

### 3. სქემა

```bash
npm run db:migrate:remote
```

### 4. საიდუმლოები

```bash
npx wrangler secret put AUTH_PASSWORD      # ჟურნალში შესასვლელი პაროლი
npx wrangler secret put SESSION_SECRET     # გრძელი შემთხვევითი სტრიქონი
npx wrangler secret put JOURNAL_API_KEY    # MT5 EA-სთვის
```

`SESSION_SECRET`-ის გენერაცია:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

```bash
npm run deploy
```

მისამართი: `https://trading-journal.<შენი-subdomain>.workers.dev`

## GitHub-იდან ავტომატური deploy (Workers Builds)

ყოველ `git push`-ზე Cloudflare თვითონ ააწყობს და გამოაქვეყნებს.

> მიბმულია: `iazarashvili/trading-data` → Worker `trading-journal`, ბრენჩი `main`.

### 1. რეპოზიტორია

შექმენი **პრივატული** რეპო GitHub-ზე, შემდეგ:

```bash
git remote add origin https://github.com/<შენი-მომხმარებელი>/<რეპო>.git
git push -u origin main
```

### 2. დაკავშირება

Cloudflare Dashboard → **Workers & Pages** → `trading-journal` →
**Settings → Build → Connect to Git** → აირჩიე რეპო.

| პარამეტრი | მნიშვნელობა |
|---|---|
| Build command | `npm run typecheck` (ან ცარიელი) |
| Deploy command | `npx wrangler deploy` |
| Branch | `main` |

### 3. რა **არ** ხდება ავტომატურად

- **მიგრაციები.** სქემის ცვლილების შემდეგ ხელით: `npm run db:migrate:remote`
- **საიდუმლოები.** `AUTH_PASSWORD`, `SESSION_SECRET`, `JOURNAL_API_KEY` Cloudflare-ში ცხოვრობს,
  რეპოში არასდროს — `wrangler secret put`-ით ეყენება ერთხელ.

### რა არ უნდა მოხვდეს git-ში

`.gitignore` უკვე ფარავს: `.dev.vars` (ლოკალური პაროლები), `.wrangler/`, `node_modules/`.
`wrangler.toml`-ში მხოლოდ `database_id`-ია — ეს იდენტიფიკატორია, არა საიდუმლო,
და შენი Cloudflare-ის ანგარიშზე წვდომის გარეშე უსარგებლოა.

## უსაფრთხოება

- **ყველა UI გვერდი** პაროლითაა დაცული (`AUTH_PASSWORD`). სესია — ხელმოწერილი
  cookie (HMAC-SHA256), ვადა 30 დღე.
- **API როუტები** — `X-API-Key` ან `Authorization: Bearer`. თუ `JOURNAL_API_KEY`
  არ არის დაყენებული, API 500-ს აბრუნებს (და არა ღია წვდომას).
- `GET /api/health` ერთადერთი ღია endpoint-ია.

## MT5 (Xelius EA) კავშირი

### 1. MT5-ში დაუშვი WebRequest

**Tools → Options → Expert Advisors → Allow WebRequest for listed URL**
დაამატე: `https://trading-journal.<შენი-subdomain>.workers.dev`

### 2. EA პარამეტრები

| Input | მნიშვნელობა |
|---|---|
| `InpJournalEnabled` | `true` |
| `InpJournalURL` | `https://trading-journal.<subdomain>.workers.dev` |
| `InpJournalApiKey` | იგივე რაც `JOURNAL_API_KEY` |
| `InpJournalStatusSec` | `60` |

### API endpoints

| Method | Path | Auth | აღწერა |
|---|---|---|---|
| GET | `/api/health` | — | ჯანმრთელობის შემოწმება |
| POST | `/api/trades` | ✅ | ტრეიდის შექმნა/განახლება (`external_id`-ით dedupe) |
| POST | `/api/mt5/status` | ✅ | Live heartbeat |
| GET | `/api/mt5/status` | ✅ | ბოლო live სტატუსი |

EA-ს ველების ალიასები მხარდაჭერილია: `symbol`→`asset`, `sl`→`stop_loss`,
`tp`→`take_profit`, `profit`→`result`, `comment`→`conclusion`, `deal_id`→`external_id`,
`BUY`→`Long`, `SELL`→`Short`.

მაგალითი:

```bash
curl -X POST https://trading-journal.<subdomain>.workers.dev/api/trades \
  -H "X-API-Key: შენი-გასაღები" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSD","direction":"BUY","entry":64000,"profit":120.5,
       "time":"2026-08-18T14:00:00","setup":"ConsolBreakout","deal_id":"mt5-1"}'
```

## სტრუქტურა

```
src/
├── index.ts              აპლიკაციის აწყობა და middleware
├── types.ts              ტიპები + ემოციების სია
├── lib/
│   ├── analytics.ts      სტატისტიკა, equity curve, განაწილება
│   ├── auth.ts           სესია, პაროლი, API გასაღები
│   ├── date.ts           თბილისის დრო (UTC+4), ქართული თვეები
│   ├── flash.ts          ერთჯერადი შეტყობინებები
│   ├── trade-input.ts    ფორმის/JSON-ის დამუშავება და ვალიდაცია
│   └── uploads.ts        სქრინშოტები R2-ში
├── db/                   D1 მოთხოვნები
├── routes/               როუტები
└── views/                JSX კომპონენტები
```

## სასარგებლო ბრძანებები

| ბრძანება | აღწერა |
|---|---|
| `npm run dev` | ლოკალური სერვერი |
| `npm run typecheck` | ტიპების შემოწმება |
| `npm run deploy` | Cloudflare-ზე ატვირთვა |
| `npm run db:migrate:remote` | ახალი მიგრაციების გაშვება |
| `npx wrangler tail` | ლოგები რეალურ დროში |
| `npx wrangler d1 execute trading-journal --remote --command "SELECT COUNT(*) FROM trades"` | ბაზის შემოწმება |
