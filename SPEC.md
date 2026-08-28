# Trading Journal — ფუნქციონალური სპეციფიკაცია

ეს დოკუმენტი აღწერს **ყველა** ფუნქციას ძველი Flask ვერსიიდან.
ახალი ვერსია (Hono + TypeScript + Cloudflare Workers) უნდა იმეორებდეს ამ ქცევას 1:1.

---

## 1. მონაცემთა მოდელი (D1 / SQLite)

### `trades`
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `trade_datetime` | TEXT NOT NULL | ფორმატი `YYYY-MM-DD HH:MM:SS` |
| `asset` | TEXT NOT NULL | მაგ. EURUSD, BTCUSD |
| `direction` | TEXT NOT NULL | მხოლოდ `Long` ან `Short` |
| `entry_price` | REAL NOT NULL | |
| `stop_loss` | REAL NULL | |
| `take_profit` | REAL NULL | |
| `risk_percent` | REAL NULL | 0–100 |
| `risk_reward` | TEXT NULL | თავისუფალი ტექსტი, მაგ. `1:3` |
| `setup` | TEXT NULL | მრავალხაზიანი |
| `chart_link` | TEXT NULL | URL (TradingView და ა.შ.) |
| `emotion_open` | TEXT NULL | ჩამონათვალიდან |
| `result` | REAL NULL | P/L; `NULL` = ღია ტრეიდი |
| `conclusion` | TEXT NULL | მრავალხაზიანი |
| `emotion_close` | TEXT NULL | მრავალხაზიანი |
| `screenshot` | TEXT NULL | R2 key |
| `screenshot2` | TEXT NULL | R2 key |
| `external_id` | TEXT NULL | MT5 deal id — dedupe-ისთვის |
| `source` | TEXT NULL | `mt5` ან NULL (ხელით შეყვანილი) |
| `created_at` | TEXT | ავტომატური timestamp |

**ინდექსი:** უნიკალური `external_id`-ზე, მხოლოდ როცა `external_id IS NOT NULL AND != ''`.

### `monthly_configs`
| სვეტი | ტიპი |
|---|---|
| `month_id` | TEXT PK — ფორმატი `YYYY-MM` |
| `starting_balance` | REAL NOT NULL |

### `mt5_status`
| სვეტი | ტიპი |
|---|---|
| `id` | INTEGER PK, ყოველთვის `1` (ერთი ჩანაწერი) |
| `payload` | TEXT NOT NULL — JSON |
| `updated_at` | TEXT |

---

## 2. გვერდები და როუტები

| Method | Path | აღწერა |
|---|---|---|
| GET | `/` | მთავარი — ანალიტიკა + ტრეიდების ცხრილი |
| POST | `/` | თვიური საწყისი ბალანსის შენახვა (`form_type=balance`) |
| GET | `/trade/new` | ახალი ტრეიდის ფორმა |
| POST | `/trade/new` | ტრეიდის შექმნა |
| GET | `/trade/:id` | ტრეიდის დეტალური გვერდი |
| GET | `/trade/:id/edit` | რედაქტირების ფორმა |
| POST | `/trade/:id/edit` | ტრეიდის განახლება |
| POST | `/trade/:id/delete` | წაშლა (JS `confirm()` დადასტურებით) |
| GET | `/uploads/:filename` | სქრინის ჩვენება |

---

## 3. მთავარი გვერდი (`/`)

### 3.1 თვის არჩევა
- Dropdown-ში ჩანს ყველა თვე: `monthly_configs.month_id` **UNION** `trades`-ის `substr(trade_datetime,1,7)`, დალაგებული კლებადობით.
- არჩევისას ფორმა ავტომატურად იგზავნება (`onchange`).
- **თვის განსაზღვრის ლოგიკა:** თუ URL-ში მოთხოვნილი თვე სიაშია — ის; თუ არაა სიაში, მაინც ემატება სიას; თუ სია ცარიელია — მიმდინარე თვე; სხვა შემთხვევაში მიმდინარე თვე თუ სიაშია, თორემ ყველაზე ახალი.
- თვის ლეიბლი ქართულად: `იანვარი 2026` — `იანვარი`, `თებერვალი`, `მარტი`, `აპრილი`, `მაისი`, `ივნისი`, `ივლისი`, `აგვისტო`, `სექტემბერი`, `ოქტომბერი`, `ნოემბერი`, `დეკემბერი`.

### 3.2 MT5 Live პანელი
ჩანს **მხოლოდ** თუ `mt5_status` ცხრილში ჩანაწერია. მწვანე ბორდერით. აჩვენებს:
`balance` ($, 2 ათწილადი) · `equity` · `symbol` · `regime` · `open_positions` ("N open") · `last_signal` (თუ არის) · `_updated_at`.
არარსებული ველი → `—` ან `0`.

### 3.3 თვიური საწყისი ბალანსი (ფორმა)
- ველები: `month_id` (`<input type="month">`, default = არჩეული თვე), `starting_balance` (number, step any, min 0).
- ვალიდაცია: რიცხვი და `>= 0`, თორემ error flash `შეიყვანეთ სწორი საწყისი ბალანსი (დადებითი რიცხვი).`
- თვის ვალიდაცია: სიგრძე 7 და მე-5 სიმბოლო `-`, თორემ `აირჩიეთ სწორი თვე.`
- წარმატება: `{თვე} — საწყისი ბალანსი შენახულია.` + redirect იმავე თვეზე.
- UPSERT `month_id`-ზე.
- თუ ბალანსი უკვე შენახულია, ქვემოთ ჩანს მწვანე ტექსტი მიმდინარე მნიშვნელობით.
- თუ ბალანსი **არ** არის — ყვითელი გაფრთხილება: `გთხოვთ, მიუთითოთ ამ თვის საწყისი ბალანსი სტატისტიკისთვის.`

### 3.4 ანალიტიკის ბარათები (8 ცალი)
**რიგი 1:**
1. **Total P&L** — ყველა დახურული ტრეიდის `result`-ის ჯამი. მწვანე თუ `>= 0`, წითელი თუ ნაკლები. `+` პრეფიქსი დადებითზე.
2. **Final Balance** — `starting_balance + total_pnl`. ბალანსის გარეშე → `—`.
3. **Monthly Growth %** — `total_pnl / starting_balance * 100`. თუ ბალანსი 0 ან არ არის → `—`.
4. **Win Rate** — `win_count / closed_count * 100`, 1 ათწილადი. ქვეშ: `{W}W / {L}L / {BE}BE`.

**რიგი 2:**
5. **ტრეიდები (თვე)** — სულ რაოდენობა; ქვეშ `დახურული: N`.
6. **საშ. მოგება** — მოგებიანების საშუალო (`result > 0`), მწვანე, `+$`.
7. **საშ. ზარალი** — ზარალიანების საშუალო (`result < 0`), წითელი.
8. **საწყისი ბალანსი** — შენახული მნიშვნელობა.

**განმარტებები:**
- `closed_count` = ტრეიდები სადაც `result IS NOT NULL`
- `win` = `result > 0`, `loss` = `result < 0`, `breakeven` = `result == 0`
- 0-ზე გაყოფისას ყველგან `0` ან `—`

### 3.5 გრაფიკები (Chart.js)
- **Equity Curve** (line): ჩანს თუ საწყისი ბალანსი მითითებულია.
  - პირველი წერტილი: ლეიბლი `საწყისი`, მნიშვნელობა = საწყისი ბალანსი.
  - შემდეგ ქრონოლოგიურად (`trade_datetime ASC, id ASC`) მხოლოდ დახურული ტრეიდები, კუმულატიური ჯამით.
  - ლეიბლი = `trade_datetime`-ის პირველი 16 სიმბოლო.
  - ფერი `#3b82f6`, fill, tension 0.25. Tooltip-ში `$` და ათწილადები.
- **განაწილება** (pie): ჩანს დამატებით მხოლოდ თუ `closed_count > 0`.
  - ლეიბლები: `მოგება` / `ზარალი` / `უცვლელი`; ფერები `#10b981` / `#ef4444` / `#94a3b8`; legend ქვემოთ.
- თუ ბალანსი არის, მაგრამ დახურული ტრეიდი არაა → წყვეტილი ჩარჩო ტექსტით `ამ თვეში შედეგიანი ტრეიდები არ არის — გრაფიკები გამოჩნდება პირველი P/L-ის შემდეგ.`
- გრაფიკების ფერები ეგუება dark/light თემას.

### 3.6 ძებნა და ფილტრი
- `q` — LIKE ძებნა 4 ველზე: `asset`, `setup`, `conclusion`, `direction`.
- `asset` — ზუსტი დამთხვევა; dropdown ივსება არჩეული თვის უნიკალური აქტივებით (`ORDER BY asset COLLATE NOCASE`), პირველი ოფცია `ყველა აქტივი`.
- ღილაკები: `ფილტრი`, და `გასუფთავება` (ჩანს მხოლოდ თუ ფილტრი აქტიურია).
- ფილტრი ინახავს არჩეულ თვეს.

### 3.7 ტრეიდების ცხრილი
სვეტები: **თარიღი** (16 სიმბოლო) · **აქტივი** (+ 📷 ან 📷×2 თუ სქრინებია) · **მიმართ.** (ფერადი badge: Long მწვანე / Short წითელი) · **შესვლა** · **SL / TP** · **რისკი** (`%`) · **R:R** · **ემოცია** · **შედეგი** (მწვანე/წითელი, 2 ათწილადი) · **დეტალები →**

- დალაგება: `trade_datetime DESC, id DESC`.
- მთელი მწკრივი დაჭერადია → გადაჰყავს დეტალურ გვერდზე.
- ცარიელი მდგომარეობა: `ამ თვეში ჩანაწერები არ არის.` + ლინკი `დაამატე ტრეიდი`.
- ცარიელი ველები → `—`.

---

## 4. ტრეიდის ფორმა (`/trade/new`, `/trade/:id/edit`)

`multipart/form-data`, 3 სექციად დაყოფილი.

### სექცია 1 — ძირითადი
| ველი | ტიპი | სავალდებულო |
|---|---|---|
| `trade_datetime` | `datetime-local` | ✅ |
| `asset` | text (placeholder `მაგ. EURUSD, BTC`) | ✅ |
| `direction` | radio `Long` / `Short` (ღილაკის სტილში) | ✅ |
| `entry_price` | number, step any | ✅ |
| `stop_loss` | number, step any | — |
| `take_profit` | number, step any | — |
| `risk_percent` | number, 0–100 | — |
| `risk_reward` | text (`მაგ. 1:3`) | — |
| `emotion_open` | select | — |

### სექცია 2 — სეტაპი და სქრინები
| ველი | ტიპი |
|---|---|
| `setup` | textarea (3 რიგი) |
| `chart_link` | url |
| `screenshot` | file |
| `screenshot2` | file |

### სექცია 3 — შედეგი
| ველი | ტიპი |
|---|---|
| `result` | number, step any (`მაგ. 150 ან -50`) |
| `conclusion` | textarea (4 რიგი) |
| `emotion_close` | textarea (2 რიგი) |

### ემოციების სია (select)
`Calm`, `Confident`, `FOMO`, `Anxious`, `Greedy`, `Fearful`, `Impatient`, `Neutral`, `Excited`, `Frustrated`

### ვალიდაცია (სერვერზე)
1. `თარიღი და დრო სავალდებულოა.`
2. `აქტივი სავალდებულოა.`
3. `აირჩიეთ მიმართულება (Long/Short).` — მხოლოდ ეს ორი მნიშვნელობა
4. `შესვლის ფასი სავალდებულოა.`

შეცდომისას: ფორმა ბრუნდება **შევსებული მონაცემებით** + error flash-ები.
რიცხვითი ველები: ცარიელი ან არავალიდური → `NULL` (არა 0).

### წარმატება
- შექმნა: `ტრეიდი წარმატებით დაემატა.` → redirect `/` ტრეიდის თვეზე.
- განახლება: `ჩანაწერი განახლდა.` → redirect `/trade/:id`.

---

## 5. სქრინშოტები

- დაშვებული გაფართოებები: `png`, `jpg`, `jpeg`, `gif`, `webp` (`jpeg` ინახება როგორც `jpg`).
- მაქს. ზომა: **5 MB** ერთ ფაილზე; მთელი მოთხოვნა: **12 MB**.
- ფაილის სახელი: `trade_{id}_{16-სიმბოლოიანი-hex}.{ext}`.
- შეცდომები: `დაშვებულია მხოლოდ სურათები: PNG, JPG, GIF, WEBP` / `ფაილი ძალიან დიდია (მაქს. 5 MB)`.
- ფორმაში არჩევისთანავე ჩანს **preview** (client-side).
- რედაქტირებისას: არსებული სქრინი ჩანს thumbnail-ად + checkbox `წაშლა`; ახალი ფაილის ატვირთვა **ცვლის** ძველს (ძველი იშლება).
- ტრეიდის წაშლისას ორივე სქრინიც იშლება.
- დეტალურ გვერდზე: გვერდიგვერდ (თუ ორივეა), `object-contain`, დაჭერით იხსნება სრული ზომით ახალ ტაბში.

---

## 6. დეტალური გვერდი (`/trade/:id`)

- ← `უკან სიაში`
- სათაური: აქტივი + Long/Short badge + სრული თარიღი
- `შედეგი` ბლოკი მარჯვნივ (მხოლოდ თუ `result` არსებობს), მწვანე/წითელი
- **სქრინები** სექცია (თუ არის)
- **ფასები და რისკი**: შესვლის ფასი, Stop-Loss, Take-Profit, რისკი %, R:R, ემოცია გახსნისას
- **სეტაპი**: ტექსტი (`whitespace-pre-wrap`) + `გახსენი გრაფიკი` ლინკი (თუ `chart_link` არის)
- **დასკვნა და ემოცია დახურვისას**: ორ სვეტად
- ღილაკები: `რედაქტირება` (ლურჯი) და `წაშლა` (წითელი, `confirm('ნამდვილად გსურთ ამ ტრეიდის წაშლა?')`)
- ტრეიდი ვერ მოიძებნა → flash `ჩანაწერი ვერ მოიძებნა.` + redirect `/`

---

## 7. API (MT5 / Xelius EA)

| Method | Path | Auth | აღწერა |
|---|---|---|---|
| GET | `/api/health` | — | `{"ok": true, "service": "trading-journal"}` |
| POST | `/api/trades` | ✅ | ტრეიდის შექმნა/განახლება |
| POST | `/api/mt5/status` | ✅ | Live heartbeat |
| GET | `/api/mt5/status` | ✅ | ბოლო სტატუსი |

**ავტორიზაცია:** `X-API-Key: <key>` ან `Authorization: Bearer <key>`. არასწორი → `401 {"ok": false, "error": "unauthorized"}`.

### `POST /api/trades` — ველების ალიასები
JSON body იღებს ორივე დასახელებას:

| ჟურნალის ველი | ალტერნატივა (MT5) |
|---|---|
| `trade_datetime` | `time` |
| `asset` | `symbol` |
| `entry_price` | `entry` |
| `stop_loss` | `sl` |
| `take_profit` | `tp` |
| `result` | `profit` |
| `conclusion` | `comment` |
| `risk_reward` | `rr` |
| `external_id` | `deal_id` |

**გარდაქმნები:**
- `direction`: `BUY`→`Long`, `SELL`→`Short` (რეგისტრის მიუხედავად); `Long`/`Short` უცვლელად.
- ISO თარიღი `2026-07-18T14:05:00` → `2026-07-18 14:05:00` (პირველი 19 სიმბოლო).
- `emotion_open` default = `Neutral`; `source` default = `mt5`.

**Upsert:** თუ `external_id` უკვე არსებობს → UPDATE, პასუხი `200 {"ok":true,"id":N,"updated":true}`.
თუ არა → INSERT, პასუხი `201 {"ok":true,"id":N,"updated":false}`.
ვალიდაციის შეცდომა → `400 {"ok":false,"errors":[...]}` (იგივე 4 წესი, რაც ფორმაზე).

### `POST /api/mt5/status`
ნებისმიერი JSON ობიექტი ინახება `payload`-ად (`id=1` upsert). არა-ობიექტი → `400 {"ok":false,"error":"JSON object required"}`.

### `GET /api/mt5/status`
`{"ok":true,"status":{...payload, "_updated_at":"..."}}` ან `{"ok":true,"status":null}`.

---

## 8. UI / ლეიაუტი

- **Tailwind CSS** (CDN) + **Chart.js 4.4.1** (CDN) — build step არ არის.
- ენა: `lang="ka"`, მთელი ინტერფეისი ქართულად.
- **Nav** (sticky, blur): `TJ` ლოგო + `Trading Journal` · `+ ახალი ტრეიდი` ღილაკი · თემის გადამრთველი (მზე/მთვარე).
- **Dark mode:** `class` სტრატეგია, არჩევანი `localStorage['theme']`-ში; default = სისტემის `prefers-color-scheme`.
- **Flash შეტყობინებები:** `success` მწვანე / `error` წითელი, გვერდის თავში.
- **ფერები:** surface `#0f1419`, card `#1a2332`, accent `#3b82f6` (hover `#2563eb`); light: `#f8fafc` / `#ffffff`.
- ყველა რიცხვი `tabular-nums`; ფული 2 ათწილადით; Win Rate 1 ათწილადით.
- სრულად რესპონსიული (`grid-cols-1` → `sm:2` → `lg:4`).

---

## 9. ახალ ვერსიაში დამატებული / შეცვლილი

| # | რა | რატომ |
|---|---|---|
| 1 | **Login** (პაროლი + ხელმოწერილი cookie) | ძველ ვერსიას საერთოდ არ ჰქონდა — ინტერნეტში ღია იქნებოდა |
| 2 | **API გასაღები სავალდებულო** | ძველში ცარიელი გასაღები = ღია API |
| 3 | **სქრინები R2-ზე** | Workers-ს ლოკალური დისკი არ აქვს |
| 4 | **დროის ზონა UTC+4 (თბილისი)** | Workers UTC-ზე მუშაობს; `datetime('now','localtime')` არასწორ თვეს მოგვცემდა |
| 5 | **Zod ვალიდაცია + TypeScript ტიპები** | `_float_or_none`-ის ტიპის ხელით შემოწმებების ნაცვლად |
| 6 | **`secret_key` კონფიგში** | ძველში hardcode იყო |
| 7 | **`GET /api/mt5/status` გასაღებით** | ძველში ღია იყო — ბალანსს ყველა ხედავდა |

## 10. რა **არ** გადმოგვაქვს
- ძველი მონაცემები (7 ტრეიდი, 2 თვის ბალანსი) — სუფთა ბაზით ვიწყებთ
- Docker / docker-compose — Cloudflare-ზე საჭირო აღარაა
- Python კოდი
