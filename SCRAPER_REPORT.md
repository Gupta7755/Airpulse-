# Scraper Test Report

**Date:** 22 Oct 2026  
**Scope:** all 10 Python scrapers in `scrapers/`  
**Method:** each scraper was run on its own against the live websites, the same way the scheduler runs it (`python scrapers/<name>/<name>_scraper.py`, 5-minute limit). Its log, its output files and its source code were then reviewed.

---

## 1. Summary

All 10 scripts **run without crashing**: every one exited with code 0 and wrote its output. Only **3 of 10 collect real prices from the website**. The other 7 either fail to read prices, mostly because the site blocks the bot, or never read prices at all and calculate them from a fixed table.

| # | Scraper | Runs? | Time | Quotes | Site reached? | Prices real? | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **EaseMyTrip** | ✅ | 295 s | 851 | ✅ Yes | ✅ **Real, per flight** | **Working** |
| 2 | **Akasa Air** | ✅ | 32 s | 160 | ✅ Yes | ✅ **Real, per flight** (91%) | **Working** (minor gaps) |
| 3 | **Air India** | ✅ | 49 s | 720 | ✅ Yes | ⚠️ Real daily lowest fare, copied to every flight | **Partly working** |
| 4 | **IndiGo** | ✅ | 12 s | 798 | ⚠️ Partly | ⚠️ 1 real fare per route, the rest calculated | **Partly working (has bugs)** |
| 5 | **Cleartrip** | ✅ | 6 s | 258 | ✅ Yes (32 prices on page) | ❌ Ignores the page, calculates prices | **Not working** |
| 6 | **MakeMyTrip** | ✅ | 6 s | 258 | ❌ Blocked by Akamai | ❌ Calculated | **Not working** |
| 7 | **Skyscanner** | ✅ | 5 s | 264 | ❌ Blocked ("Are you a robot?") | ❌ Calculated | **Not working** |
| 8 | **Goibibo** | ✅ | 5 s | 264 | ❌ Empty page | ❌ Calculated | **Not working** |
| 9 | **Yatra** | ✅ | 4 s | 258 | ❌ Empty page | ❌ Calculated | **Not working** |
| 10 | **ixigo** | ✅ | 4 s | 264 | ⚠️ Menu only, no results | ❌ Calculated | **Not working** |

"Runs?" means the script completes without errors. "Prices real?" means the fares come from the website's own data and not from a formula.

**Every scraper reports `status: SUCCESS` even when it was blocked**, because the success flag is hard-coded. The dashboard's crawler health page therefore shows all 10 as healthy.

---

## 2. Working scrapers

### 1. EaseMyTrip ✅ Working
- Searches every route and booking window on EaseMyTrip, about 28 s per route.
- Reads prices from EaseMyTrip's own search response (fields `TF` / `PT`). The saved response file contains 1,308 such fare fields.
- Result: 851 quotes, 335 different fares, ₹3,573 to ₹49,395, different prices per flight.
- Note: it is slow (about 5 minutes). If a site response is slow, it could hit the scheduler's time budget.

### 2. Akasa Air ✅ Working, minor gaps
- Calls Akasa's own availability API for a 60-day fare calendar and a per-flight search.
- Result: 160 quotes, 86 different fares, ₹5,486 to ₹21,423.
- **Gap:** 14 quotes (9%) use the built-in default price ₹6,200 / ₹6,500.
  - **Same-day (T+0) on 9 routes:** the search returned no bookable flights for today, so the scraper filled in the default. These should be skipped, not filled.
  - **BOM-GOI on every window:** no Akasa flights were found on this route, so all its prices are defaults.

---

## 3. Partly working scrapers

### 3. Air India ⚠️ Partly working
- ✅ **Prices are real:** Air India's fare API returned a 55-day calendar of the lowest fare per day for all 10 routes.
- ❌ **The same price is given to every flight.** Each route and booking window has only one price, so all 12 flights on a day show an identical fare (60 of 60 route/window groups are flat). A daily-lowest fare is not the price of each flight.
- ❌ **Flight list is fake.** Air India's schedule request returned nothing, so the scraper used its built-in list of 12 flights (AI 2757 at 00:15, AI 2653 at 04:30, …). **The same 12 flights and timings are used for all 10 routes** (only 1 distinct timetable), for example the same "DEL-BOM" timings on BOM-GOI.
- Reason: the schedule search only tries one route (DEL-BLR) through the website form, and when that form does not respond, it falls back.

### 4. IndiGo ⚠️ Partly working, has bugs
- ✅ Got real "fare radar" prices (IndiGo's cheapest fare per destination) for 4 of 5 origin cities: BLR, BOM, CCU and MAA.
- ❌ **Bug 1: the Delhi fare query crashes.** Log: `Origin DEL radar query warning: function takes exactly 5 arguments (1 given)` and `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x8b`. A response handler tries to read a compressed (gzip, byte `0x8b`) response as text, and the resulting error breaks the Delhi request. Delhi is in 4 of the 10 routes.
  - **DEL-HYD** has no other source, so it falls back to the flat **₹6,500** default.
- ❌ **Bug 2: the schedule download fails.** Log: `Schedule extraction note: Page.evaluate: TypeError: Failed to fetch`. It then loads an **older saved copy** (`airline_schedules_response.json`), so flight times may be out of date.
- ❌ **Only one real number per route.** Other booking windows are calculated with fixed multipliers. For example, DEL-BOM is T+7 ₹8,659 → T+1 ₹11,690 (×1.35) → T+45 ₹5,628 (×0.65), and the same ratios apply on every route.

---

## 4. Not working scrapers (reasons)

These 6 scrapers share the same design. **Phase 1** opens one search page to save a screenshot and text. **Phase 2** generates every quote from a fixed table: `CORRIDOR_BASE_FARES × booking-window multiplier × fixed time-of-day factor × small per-site adjustment`. Phase 2 does not use the website at all, so the "quotes" exist even when the site blocks the bot. That is why they finish in 4–6 seconds.

| Scraper | What the site returned | Reason it does not work |
|---|---|---|
| **Cleartrip** | ✅ A real results page with **32 prices** (₹6,813, ₹6,299, …) | **Code problem, not blocking.** The page loads fine, but the scraper never reads prices from it and calculates them instead. *This is the easiest one to fix.* |
| **MakeMyTrip** | ❌ The text `200-OK` only | **Blocked by Akamai Bot Manager.** The log confirms it: `Akamai Bot Challenge detected… bot mitigation engaged.` |
| **Skyscanner** | ❌ "Are you a person or a robot?" | **Blocked by a CAPTCHA / bot check.** |
| **Goibibo** | ❌ Empty page (0 characters) | **Blocked or not rendered.** Goibibo belongs to the same group as MakeMyTrip, uses the same bot protection, and served nothing to the headless browser. |
| **Yatra** | ❌ Empty page (0 characters) | **Blocked or not rendered.** The results did not load in the headless browser. |
| **ixigo** | ⚠️ Site menu only, no flight results | **Results never load.** The scraper waits a fixed few seconds, and results are loaded later by JavaScript (or blocked). |

Even on the sites that block, the code would not use real prices if the page did load, because Phase 2 never reads the page.

---

## 5. Problems that affect all scrapers

1. **Fake success status.** Every scraper records `status: SUCCESS`, and some record `http_status=200`, whatever really happened. Blocked runs look healthy on the dashboard.
2. **No "real vs calculated" label.** Calculated quotes are stored with a real-looking `source` (for example `makemytrip.com`), so nothing in the database separates real from generated prices.
3. **Silent default prices.** ₹6,200 / ₹6,500 are used when data is missing instead of skipping the quote.
4. **Redrawn screenshots.** `backend/screenshot_service.py` redraws the "proof" screenshots with Pillow after each crawl, so they are not the page the scraper saw.
5. **Cloud mode is fully simulated.** On Render (`RENDER` env var set), the scheduler skips these scrapers and runs `backend/live_crawler_engine.py`, which creates quotes with `random`.
6. **Docker image cannot run them.** The backend image does not install Playwright's browser, so inside Docker the scheduled scrape is expected to fail and add no new quotes (not tested in this run).

---

## 6. Recommended fixes (in priority order)

| Priority | Fix | Effort |
|---|---|---|
| 1 | **Make the status honest:** record `BLOCKED` or `FAILED` when the page is blocked or empty, and stop hard-coding `SUCCESS` / `200` | Small |
| 2 | **Add a `price_origin` field** (`scraped` / `derived` / `default`) to every quote, and show it on the dashboard | Small |
| 3 | **Drop default prices:** skip a quote when no real fare exists (Akasa T+0, Akasa BOM-GOI, IndiGo DEL-HYD) | Small |
| 4 | **Cleartrip:** parse the 32 real prices already on the results page | Medium |
| 5 | **IndiGo:** stop the response handler from decoding compressed bodies (wrap it in `try/except`, or skip non-JSON responses) so the Delhi fare query works | Small |
| 6 | **Air India:** fetch the schedule for each route from the schedules API instead of using one built-in list. Label the fare as "lowest fare of the day", not per-flight | Medium |
| 7 | **ixigo:** wait for the results to appear (`wait_for_selector`) instead of a fixed delay | Medium |
| 8 | **MakeMyTrip, Goibibo, Skyscanner, Yatra:** these use commercial bot protection. Getting real data needs an official partner/affiliate API or a licensed data provider. Check each site's terms of use before trying anything else | Large |

---

## 7. Detailed code review, file by file

The 10 files are 468–662 lines each. They fall into two groups:

- **Group A, airline/OTA API scrapers** (Air India, IndiGo, Akasa, EaseMyTrip): written separately, they really query the site's data.
- **Group B, template scrapers** (Cleartrip, MakeMyTrip, Goibibo, ixigo, Skyscanner, Yatra): copies of one template. Goibibo, ixigo and Skyscanner are **95% identical**, and Cleartrip and Yatra are 89% identical. The main differences are the site name, the URL and a different hard-coded fare table.

### Common to all 10

| Item | Detail |
|---|---|
| Syntax | ✅ All 10 parse correctly (Python `ast` check) |
| Browser | Playwright Chromium, headless. Tries channels `chrome` → `msedge` → bundled Chromium |
| Routes | The same 10 routes and 6 booking windows (T+0 … T+45), dates from `date.today()` |
| Output files | `flights.json`, `airline_fares_response.json`, `airline_schedules_response.json`, `captured_api_requests.json`, `flight_results_dom.html` / `.txt` / `.png` |
| Status | Hard-coded `"status": "SUCCESS"` in `flights.json` in **all 10** files |
| Error handling | Many `except Exception: pass` blocks (2–6 per file) that hide failures |

### Group A: real-data scrapers

#### `air_india/airindia_scraper.py` (629 lines)
| Step | Lines | What it does | Issue |
|---|---|---|---|
| Fare calendar | 225–268 | POSTs to `api.airindia.com/airline-fares/v1/search` for each route (55-day lowest-fare calendar) | ✅ Works: 10/10 routes returned 55 days |
| API key | 53 | `OCP_SUBSCRIPTION_KEY` is hard-coded. It is Air India's public website key, not ours | Will break if Air India rotates it |
| Schedules | 281–319 | Waits for a `flight-information/v1/schedules` response, and only tries one route (DEL-BLR) via the website form | ❌ Usually captures nothing |
| Schedule fallback | 402–429 | Built-in list of 12 flights (`AI 2757` 00:15 …) | ❌ **The same 12 flights are used for all 10 routes** |
| Date matching | 462–471 | Uses the nearest available date if the exact one is missing | Can silently reuse another day's fare |
| Pricing | 485–496 | Puts the day's single lowest fare on **every** flight | ❌ All flights in a window have the same price |
| Status | 544–545 | `crawler_status="SUCCESS"`, `http_status=200` hard-coded | ❌ |
| DB | ✅ Writes to MongoDB via `ingest_scraper_batch` | |

#### `indigo/indigo_scraper.py` (662 lines)
| Step | Lines | What it does | Issue |
|---|---|---|---|
| Response handler | ~240–256 | Reads every IndiGo response as JSON | ❌ **Crashes on gzip-compressed responses** (`UnicodeDecodeError … 0x8b`) and breaks the next request |
| Fare radar | 281–298 | `6ewai.goindigo.in/r10next/web/fare-radar?origin=X` for 5 origin cities | ⚠️ 4/5 worked. **DEL failed** because of the bug above |
| Route fare | 300–327 | Uses the forward route, else the reverse route, else the average for the origin city, else **₹6,500** | DEL-HYD ended up as ₹6,500 |
| Other windows | `get_yield_multiplier` | Fixed multipliers (T+1 ×1.35, T+45 ×0.65) applied to one real fare | ❌ Only 1 real number per route |
| Schedules | 378–389 | Fetches IndiGo's schedule file | ❌ `Failed to fetch`, then loads an **old cached copy** |
| Window fallback | 518 | `win_pricing.get("total_fare", 6500.0)` | Silent default |
| Status | 577–578 | `SUCCESS` / `200` hard-coded | ❌ |
| DB | ✅ Writes to MongoDB | |

#### `akasa_air/akasaair_scraper.py` (567 lines)
| Step | Lines | What it does | Issue |
|---|---|---|---|
| Session | 150–192 | Gets a session token from Akasa's site (needed for its API) | ✅ Works |
| Calendar | 203–228 | `prod-bl.qp.akasaair.com/api/ibe/availability/v2/search`, 60-day lowest-fare calendar | ✅ Works |
| Per-flight search | 316–332 | `…/availability/search`, the real flight list with fares | ✅ Works |
| No-flight fallback | 371–378 | Calendar price, else **₹6,200** | ❌ Used for T+0 on 9 routes |
| Fare fallback | 457 | **₹6,500** if a flight has no fare | ❌ Used on all of BOM-GOI |
| Status | 509–510 | `SUCCESS` / `200` hard-coded | ❌ |
| DB | ✅ Writes to MongoDB | |

#### `easemytrip/easemytrip_scraper.py` (581 lines)
| Step | Lines | What it does | Issue |
|---|---|---|---|
| Search | 271 | Opens `flight.easemytrip.com/FlightList/Index` for every route × window (60 searches) | ✅ Works, about 28 s per route |
| Price source 1 | 300–333 | Reads EaseMyTrip's own JSON (`lstFr`, `TF`, `PT`, `APT`) | ✅ **Real per-flight fares**, used today |
| Price source 2 | ~402 | Reads `₹` prices from the page, else **₹6,200** | Fallback |
| Price source 3 | ~450 | `base_tariffs × multiplier`, default **₹6,500** | Calculated fallback |
| Status | 508–509 | `SUCCESS` / `200` hard-coded | ❌ |
| Speed | — | 295 s total, close to a 5-minute budget | ⚠️ Risk of timeout |
| DB | ✅ Writes to MongoDB | |

### Group B: template scrapers

All six follow the same two phases:

| Phase | Lines (Goibibo) | What it does |
|---|---|---|
| 1. Page snapshot | 210–297 | Opens **one** search page (DEL-BOM, T+7), waits a **fixed 2.5 s**, saves HTML, text and screenshot. Uses the browser flag `--disable-blink-features=AutomationControlled` (tries to hide automation) |
| Fake evidence | 299–308 | If the browser fails and no old file exists, writes a **fake results page** and a **1×1-pixel placeholder PNG** as the "screenshot" |
| 2. Price generation | 313–411 | For every route × window × flight: `CORRIDOR_BASE_FARES[route] × WINDOW_MULTIPLIERS[days] × slot factor (0.93–1.07) × carrier factor`. **The page from Phase 1 is never read** |
| Fare split | 175–179 | Base fare = total × 0.81, taxes = the rest (not real tax data) |
| Flight details | 92–157 | Hard-coded 4–6 flights per route. Every flight is labelled non-stop, terminal "1" and "Daily" |
| Status | 419 | `"status": "SUCCESS"` hard-coded |

**Proof that the prices never change:** I compared each scraper's prices with the copy committed earlier.

| Scraper | Identical fares |
|---|---|
| Cleartrip | 258 / 258 |
| Goibibo | 264 / 264 |
| Yatra | 258 / 258 |
| **MakeMyTrip** | **258 / 258, between a run on 13 Sep and today, 5 weeks apart** |

Per-file differences:

| File | Lines | Differences from the template | DB write |
|---|---|---|---|
| `cleartrip_scraper.py` | 486 | URL builder. The page **does** load real prices, but they are ignored | ❌ Only via `run_all_scrapers.py` |
| `makemytrip_scraper.py` | 549 | Detects the Akamai block (line 333) and sets `BLOCKED_AKAMAI_RECOVERED` in the DB record (469), but still writes `SUCCESS` to the file (480). `ota_jitter()` (212–214) adds a fixed per-flight price change | ✅ |
| `yatra_scraper.py` | 497 | Same `ota_jitter()` (196–198) | ❌ Only via the runner |
| `goibibo_scraper.py` | 468 | Base template | ❌ Only via the runner |
| `ixigo_scraper.py` | 468 | 95% the same as Goibibo | ❌ Only via the runner |
| `skyscanner_scraper.py` | 468 | 95% the same as Goibibo | ❌ Only via the runner |

`ota_jitter()` uses `hashlib`, so the "variation" is the same every run.

Scrapers marked "only via the runner" never write to MongoDB themselves. Their quotes reach the dataset only when `scripts/run_all_scrapers.py` merges every `flights.json` into `data/all_normalized_flights.json`.

### Bugs found (code defects, apart from site blocking)

| # | File | Bug |
|---|---|---|
| 1 | indigo | The response handler crashes on gzip bodies, which breaks the Delhi fare request |
| 2 | air_india | One built-in timetable is reused for all 10 routes |
| 3 | air_india | The daily lowest fare is applied to every flight |
| 4 | cleartrip | Real prices on the loaded page are never parsed |
| 5 | all 6 template scrapers | Prices come only from hard-coded tables and are identical every day |
| 6 | all 6 template scrapers | A fake DOM and a 1×1 PNG are written as "evidence" when the browser fails |
| 7 | template scrapers | `browser` is not initialised before `if not browser:` (Goibibo line 244), so it raises `NameError` if every channel fails (caught silently) |
| 8 | all 10 | `SUCCESS` / `200` hard-coded whatever the result |
| 9 | akasa, indigo, easemytrip | Silent ₹6,200 / ₹6,500 default prices |
| 10 | 5 template scrapers | Don't write to the DB themselves (inconsistent with the others) |

---

## 8. How to reproduce

```powershell
# from the project root, with the virtual environment active
python scrapers\cleartrip\cleartrip_scraper.py      # one scraper
python scripts\run_all_scrapers.py                  # all scrapers
```

Each scraper writes to `scrapers/<name>/`:
- `flights.json`: the quotes
- `flight_results.txt` and `flight_results_dom.html`: what the site returned (check these to see whether it was blocked)
- `captured_api_requests.json`: requests made to the site
