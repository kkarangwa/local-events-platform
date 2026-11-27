# Gada Events
### A digital platform for career and learning events in Kigali

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-blue)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/unit%20tests-22%20passing-brightgreen)](#8-running-the-tests)

| | |
|---|---|
| **Live website** | https://gada-events.onrender.com |
| **Live API** | https://gada-events-api.onrender.com (health check: `/api/db-health`) |
| **Repository** | https://github.com/kkarangwa/local-events-platform |
| **Developer** | Karangwa Kethia, BSc Software Engineering, African Leadership University |
| **Supervisor** | David Ineza Tuyishimire |

> The live site runs on Render's free plan. After a quiet period the API sleeps, so the **first** request can take up to a minute. Open the site once, wait, then use it normally.

---

## Contents

1. [What Gada Events does](#1-what-gada-events-does)
2. [Features](#2-features)
3. [Technology stack](#3-technology-stack)
4. [Project structure](#4-project-structure)
5. [Run it on your computer (step by step)](#5-run-it-on-your-computer-step-by-step)
6. [Try every feature with the demo accounts](#6-try-every-feature-with-the-demo-accounts)
7. [Environment variables](#7-environment-variables)
8. [Running the tests](#8-running-the-tests)
9. [API reference](#9-api-reference)
10. [Database](#10-database)
11. [How the main features work](#11-how-the-main-features-work)
12. [Deploying to Render](#12-deploying-to-render)
13. [Troubleshooting](#13-troubleshooting)
14. [Security and privacy](#14-security-and-privacy)
15. [Limitations and future work](#15-limitations-and-future-work)
16. [Demonstration video and report](#16-demonstration-video-and-report)

---

## 1. What Gada Events does

Career and learning events in Kigali (trainings, workshops, networking events) are usually posted only on each organizer's own social media, so people outside that circle never hear about them. Organizers also cannot tell whether they reached the right people, and free events rarely collect feedback.

Gada Events closes those three gaps:

- **Visibility:** one place to find career and learning events, with full details.
- **Audience:** organizers say who an event is for; the platform recommends it to matching participants and shows the organizer an audience-match score.
- **Feedback:** after an event, registered attendees rate it, and the organizer gets an AI summary of what to keep, what to fix and what to do next.

There are two roles: **participant** and **organizer**. The role is chosen at sign-up.

## 2. Features

**Participants**
- Sign up (with Privacy Policy consent), log in, delete their account.
- Browse published events without logging in; search by keyword; filter by category and by Today / Tomorrow / This Weekend.
- Open an event page: date, time, venue, capacity, organizer profile and a Google Maps view of the venue.
- Register for an event (duplicate and full-event checks; Mobile Money code for paid events).
- Set interests, age range and experience level, and get "Recommended for you" events ranked by a match score.
- Rate an event they registered for, once the event date has arrived (1 to 5 stars plus three optional comments).

**Organizers**
- Create, edit, publish and remove events. New events start as drafts.
- Describe the target audience: audience tags, age ranges and experience level.
- Dashboard per event: registrations against capacity, estimated attendance and audience-match percentage.
- "Feedback & AI insights": all ratings and comments (without names) and an AI summary with what attendees liked, what to improve and ideas for the next event.
- Company profile shown on every public event page.

**Platform**
- JWT login that expires after 2 hours; role checks on every protected route.
- Passwords hashed with bcrypt (cost 12).
- If the AI service is busy or unavailable, the server retries once and then falls back to a keyword summary, so organizers always get a result.

## 3. Technology stack

| Layer | Technology |
|---|---|
| Website | React 19, React Router, Vite |
| API | Node.js 22, Express 5, `pg`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv` |
| Database | PostgreSQL 16 or newer |
| AI | Google Gemini API (REST `generateContent`), optional |
| Tests | Node's built-in test runner (`node --test`) |
| Hosting | Render (static site, web service, PostgreSQL), defined in `render.yaml` |

## 4. Project structure

```text
local-events-platform/
├── client/                      React website
│   ├── src/
│   │   ├── App.jsx              all page routes (9 paths)
│   │   ├── auth/
│   │   │   ├── AuthContext.jsx  login state, token in localStorage (gada_auth)
│   │   │   └── ProtectedRoute.jsx  keeps each role in its own dashboard
│   │   └── pages/
│   │       ├── Home.jsx, Events.jsx, EventDetails.jsx
│   │       ├── Login.jsx, Register.jsx, Privacy.jsx
│   │       ├── ParticipantDashboard.jsx, RecommendedEvents.jsx, FeedbackForm.jsx
│   │       ├── OrganizerDashboard.jsx, FeedbackInsights.jsx
│   │       └── DeleteAccount.jsx
│   ├── .env.example
│   └── package.json
├── server/                      Express API
│   ├── server.js                all routes, auth middleware, database pool
│   ├── matching.js              audience tags and the match score
│   ├── insights.js              AI feedback summary and keyword fallback
│   ├── db/
│   │   ├── schema.sql           creates the 5 tables (runs automatically on start)
│   │   └── seed.js              demo accounts and events (npm run seed)
│   ├── tests/                   22 unit tests
│   ├── .env.example
│   └── package.json
├── render.yaml                  Render Blueprint (database, API, website)
└── README.md
```

## 5. Run it on your computer (step by step)

### 5.1 Install these first

| Tool | Version | Check with |
|---|---|---|
| Node.js (includes npm) | 20 or newer (22 recommended) | `node -v` |
| PostgreSQL | 14 or newer | `psql --version` |
| Git | any | `git --version` |

### 5.2 Get the code

```bash
git clone https://github.com/kkarangwa/local-events-platform.git
cd local-events-platform
```

### 5.3 Create the database

Start PostgreSQL, then create an empty database:

```bash
createdb gada_events
# or, inside psql:
# CREATE DATABASE gada_events;
```

You do **not** need to create tables by hand. The API runs `server/db/schema.sql` every time it starts and creates anything that is missing.

### 5.4 Set up and start the API

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Open `server/.env` and fill in your values:

```env
PORT=5001
JWT_SECRET=any-long-random-text
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=gada_events
DB_USER=postgres
DB_PASSWORD=your-postgres-password

# Optional: AI summaries. Free key at https://aistudio.google.com
GEMINI_API_KEY=
```

Load the demo data (recommended), then start the API:

```bash
npm run seed     # demo organizer, participant and 4 events
npm start        # or: npm run dev  (restarts on file changes)
```

You should see:

```text
Database schema checked.
Gada Events API running on port 5001
```

Check it in the browser: http://localhost:5001/api/db-health should answer `{"success":true,...}`.

### 5.5 Set up and start the website

Open a **second** terminal:

```bash
cd client
npm install
cp .env.example .env        # contains VITE_API_URL=http://localhost:5001
npm run dev
```

Open **http://localhost:5173**.

### 5.6 Other commands

| Folder | Command | What it does |
|---|---|---|
| `server` | `npm start` | Start the API |
| `server` | `npm run dev` | Start the API with auto-restart (nodemon) |
| `server` | `npm run seed` | Add demo accounts and events (safe to run again) |
| `server` | `npm test` | Run the 22 unit tests |
| `client` | `npm run dev` | Start the website in development mode |
| `client` | `npm run build` | Build the website into `client/dist` |
| `client` | `npm run preview` | Serve the built website locally |
| `client` | `npm run lint` | Run ESLint |

## 6. Try every feature with the demo accounts

After `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Organizer | `organizer@gada.demo` | `GadaDemo2026!` |
| Participant | `participant@gada.demo` | `GadaDemo2026!` |

The seed creates four published events. "CV and LinkedIn Clinic" is dated **today**, and the demo participant is already registered for it, so you can test feedback straight away.

A short walkthrough:

1. **Browse** without logging in: open *Events*, search, try the category and *Today* filters, open an event.
2. **Participant:** log in as the participant. Open *Recommended for you* and edit the answers to see the ranking change. Register for another event. Under *My registrations*, click **★ Rate this event** on "CV and LinkedIn Clinic" and send a rating.
3. **Organizer:** log in as the organizer. Each event card shows registrations, estimated attendance and audience match. Click **★ Feedback & AI insights** on "CV and LinkedIn Clinic", then **Generate insights**.
   - With `GEMINI_API_KEY` set, the note under the result says it came from AI.
   - Without a key, you get the keyword summary ("Basic keyword summary").
4. **Create an event:** *Create event*, fill in "Who is this event for?", save (draft), then **Publish**.
5. **Privacy:** open `/privacy`; on either dashboard, use *Delete my account* (asks for the password).

"Rate this event" only appears from the day of the event onwards. To test it on your own event, create one dated today.

## 7. Environment variables

**`server/.env`**

| Name | Required | Example | Purpose |
|---|---|---|---|
| `PORT` | no | `5001` | API port (default 5001) |
| `JWT_SECRET` | **yes** | long random text | Signs login tokens. The API will not start without it |
| `CLIENT_ORIGIN` | yes | `http://localhost:5173` | Website address allowed by CORS (comma-separate several) |
| `DATABASE_URL` | one of these two | `postgresql://user:pass@host:5432/gada_events` | Full connection string (used on Render) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | one of these two | `localhost`, `5432`, ... | Separate local settings |
| `DB_SSL` | no | `false` | Set `false` for a local database reached through `DATABASE_URL` |
| `GEMINI_API_KEY` | no | from Google AI Studio | Turns on AI feedback summaries |
| `GEMINI_MODEL` | no | `gemini-flash-latest` | Gemini model name (default `gemini-flash-latest`) |
| `GEMINI_RETRY_DELAY_MS` | no | `2000` | Wait before retrying a busy (429/5xx) Gemini call |
| `AUTO_MIGRATE` | no | `false` | Skip running `schema.sql` on start |

**`client/.env`**

| Name | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | **yes** | `http://localhost:5001` | Address of the API |

Never commit `.env` files. `.gitignore` already excludes them.

## 8. Running the tests

```bash
cd server
npm test
```

Expected ending:

```text
# tests 22
# pass 22
# fail 0
```

| File | Tests | What they check |
|---|---|---|
| `tests/matching.test.js` | 13 | Match score (perfect match 100, one shared tag 35 interest points, open events, score stays 0 to 100); audience-tag and targeting validation |
| `tests/insights.test.js` | 9 | Average rating; keyword summary; **the AI prompt never contains names, emails or phone numbers**; fallback with no key or on failure; a valid AI reply is parsed; a busy (503) Gemini is retried once; a wrong key (403) is not retried |

The AI tests replace `fetch` with a fake, so they never call Google and need no key or internet.

## 9. API reference

Base URL: `http://localhost:5001` (local) or `https://gada-events-api.onrender.com` (live). Protected routes need the header `Authorization: Bearer <token>`, where the token comes from login or sign-up.

**Health**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | API is running |
| GET | `/api/db-health` | public | API can reach the database |

**Accounts**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Sign up `{name, email, password, role, acceptPrivacy: true}` |
| POST | `/api/auth/login` | public | Log in `{email, password}`, returns `{token, user}` |
| GET | `/api/auth/me` | logged in | Current user |
| DELETE | `/api/auth/me` | logged in | Delete account and personal data `{password}` |

**Events**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/events` | public | All published events |
| GET | `/api/events/:id` | public | One published event |
| POST | `/api/events` | organizer | Create (saved as draft) |
| PATCH | `/api/events/:id` | organizer (owner) | Edit |
| PATCH | `/api/events/:id/publish` | organizer (owner) | Publish |
| DELETE | `/api/events/:id` | organizer (owner) | Remove (refused if people registered) |
| GET | `/api/audience-tags` | public | Allowed audience tags, age ranges, levels |

**Registrations**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/events/:id/register` | participant | Register `{full_name, email, phone, payment_reference?}` |
| GET | `/api/participant/registrations` | participant | My registrations |
| GET | `/api/organizer/events/:id/registrations` | organizer (owner) | Registrants of one event |
| PATCH | `/api/registrations/:id/attendance` | organizer (owner) | Mark attended `{attended}` |
| PATCH | `/api/registrations/:id/confirm-payment` | organizer (owner) | Confirm a Mobile Money payment |

**Profiles, recommendations and dashboard**

| Method | Path | Access | Purpose |
|---|---|---|---|
| PATCH | `/api/participant/profile` | participant | Interests, age range, experience level |
| GET | `/api/recommendations` | participant | Top 6 upcoming events by match score |
| GET | `/api/organizer/me` | organizer | Organizer profile |
| PATCH | `/api/organizer/profile` | organizer | Company name, website, email, description |
| GET | `/api/organizer/events` | organizer | Own events with registrations, estimated attendance, audience match, feedback count |

**Feedback and AI insights**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/events/:id/feedback` | participant (registered, event date reached) | `{rating 1-5, liked?, improve?, want_next?}`; sending again updates it |
| GET | `/api/organizer/events/:id/feedback` | organizer (owner) | All feedback (no names) and the saved summary |
| POST | `/api/organizer/events/:id/insights` | organizer (owner) | Generate or refresh the summary |

`POST /api/ussd` is a prototype for basic phones (Africa's Talking format). It is not connected to a live short code.

## 10. Database

Five tables, created by `server/db/schema.sql`:

| Table | Holds | Key rules |
|---|---|---|
| `users` | Participants and organizers | `email` unique; `role` is participant or organizer; `privacy_consent_at` |
| `events` | Events | `organizer_id` → users; `status` draft or published; `capacity` > 0; target audience columns |
| `registrations` | Who registered for what | UNIQUE (`event_id`, `participant_id`); `attended`, `payment_status` |
| `event_feedback` | Ratings and comments | `rating` 1 to 5; UNIQUE (`event_id`, `participant_id`); deleted with the event or user |
| `event_insights` | Last AI or keyword summary per event | one row per event; `source` is `ai` or `basic` |

## 11. How the main features work

- **Match score** (`server/matching.js`, `computeMatchScore`): out of 100. Shared interests 50 points (35 for one shared tag), age range 25, experience level 25. A question the organizer left open counts as a full match. The score only changes the **order** of recommendations; no event is hidden.
- **Audience match** on the organizer dashboard: the average match score of everyone registered.
- **Estimated attendance:** each registrant's past attendance rate when recorded, otherwise 65% (free) or 85% (paid).
- **Registration:** runs in one transaction with the event row locked (`SELECT ... FOR UPDATE`), so two people cannot take the last place at the same time.
- **AI insights** (`server/insights.js`): `buildPrompt` sends only ratings and comment text to Gemini and asks for JSON (summary, liked, improve, next_ideas). Busy answers (429, 5xx) are retried once; on any other failure, `basicInsights` summarises the most common phrases on the server.

## 12. Deploying to Render

1. In Render choose **New > Blueprint** and pick this repository. `render.yaml` creates `gada-events-db`, `gada-events-api` and `gada-events`.
2. On **gada-events-api → Environment** set `CLIENT_ORIGIN` to the website address and, optionally, `GEMINI_API_KEY`. `DATABASE_URL` and `JWT_SECRET` are filled in by the Blueprint.
3. On **gada-events → Environment** set `VITE_API_URL` to the API address.
4. Deploy both. The API creates the tables on first start. To add demo data, run `npm run seed` from the API's Shell.
5. After new code is pushed, redeploy the website with **Manual Deploy → Clear build cache & deploy**.

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `JWT_SECRET is missing from server/.env` | Create `server/.env` from `.env.example` and set `JWT_SECRET` |
| `password authentication failed` / `database "gada_events" does not exist` | Check `DB_USER`, `DB_PASSWORD`, and run `createdb gada_events` |
| Events page says "We could not load events" | API not running, or `VITE_API_URL` is wrong. Restart `npm run dev` after editing `client/.env` |
| CORS error in the browser console | Add the website address to `CLIENT_ORIGIN` in `server/.env` and restart the API |
| No "Rate this event" button | It appears only on the event date or later, and only for registered participants |
| Insights say "Basic keyword summary (AI not available)" | No `GEMINI_API_KEY`, or Gemini was busy. Check the API log for `AI insights failed` and the status code |
| Live site very slow on first load | Free Render service waking up; wait up to a minute |

## 14. Security and privacy

- Passwords hashed with bcrypt (cost 12); the hash is never returned by the API.
- Signed JWT, 2-hour expiry; `requireAuth` and `requireRole` on every protected route; organizers can only change their own events.
- All SQL uses placeholders (`$1, $2`), which prevents SQL injection.
- Sign-up requires Privacy Policy consent, stored as `privacy_consent_at` (Rwanda Law No. 058/2021).
- Account deletion removes the user's data in one transaction.
- Feedback reaches organizers without names; only rating and comment text go to Gemini.
- CORS limited to `CLIENT_ORIGIN`; request bodies capped at 20 KB; secrets only in environment variables.

## 15. Limitations and future work

- The USSD menu for basic phones is a prototype and not connected to a live short code.
- Being registered does not prove attendance; the API can mark attendance but the dashboard has no button yet.
- No administrator role, online payments or ticketing.
- The AI summaries were tested with test feedback, not yet with real event feedback.
- Free hosting sleeps when idle.

## 16. Demonstration video and report

- **Demonstration video:** https://drive.google.com/file/d/1QhYVqA_Vud_0UhygsOt_9lAC1YjrTCwF/view?usp=drive_link
- **Capstone report:** submitted as a PDF; it contains the full design (ERD, class, use case and sequence diagrams), testing and results.

---

*Gada Events: helping the right people find the events that grow them.*
