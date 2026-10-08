# MeetingFlow — AI Meeting → Action Management Platform

> **Turn every meeting into organized work.**

MeetingFlow is an executive-grade web application built to automatically convert completed Google Meet conferences into structured, actionable business outputs: executive summaries, timestamped decisions, team action items, user-specific to-dos, Jira issues, and Google Calendar reminders.

---

## 1. Tech Stack

- **Frontend**:
  - React 19 (`^19.0.0`)
  - TypeScript
  - Vite
  - Tailwind CSS (with custom editorial pastel palette)
  - React Router DOM v7
  - Lucide React icons
- **Backend**:
  - Node.js & Express
  - TypeScript
  - Zod validation
- **Database & Storage**:
  - PostgreSQL with Prisma ORM
  - Standalone Zero-Config Fallback Store for instant Demo Mode
- **Google Workspace**:
  - Google Calendar API
  - Google Meet REST API (with authenticated transcript artifact retrieval)
- **AI Intelligence**:
  - Google Gemini API (Configurable via `GEMINI_MODEL`, default `gemini-2.5-flash`)
  - Strict anti-hallucination rules with timestamped extraction
- **Task Management**:
  - Jira REST API (single & bulk issue synchronization)

---

## 2. Design System & Editorial Aesthetic

MeetingFlow employs a premium, distraction-free editorial productivity aesthetic inspired by Linear and Notion.

### Color Tokens
- **Background**: `#F2F4F1` (Soft warm mist)
- **Primary Surface**: `#FAFBF8` (Clean editorial card)
- **Sidebar**: `#1B211E` (Deep espresso charcoal)
- **Text Primary**: `#171B19` (High-contrast charcoal)
- **Text Secondary**: `#68716B` (Slate grey)
- **Border**: `#DCE2DC` (Fine structural lines)
- **Functional Pastel Accents**:
  - **Pastel Blue**: `#DCEAF0` (Meeting tags & Calendar events)
  - **Pastel Lavender**: `#E6E0ED` (Gemini AI insights & summaries)
  - **Pastel Butter**: `#E9EFAF` (Pending / Review alerts)
  - **Pastel Peach**: `#F2DDD2` (Due Today / Overdue highlights)
  - **Pastel Sage**: `#DDE9DF` (Completed tasks & positive stats)

---

## 3. Real Mode vs. Demo Mode

### Real Mode Workflow
1. User logs in with Google OAuth 2.0 with Calendar & Meet scopes.
2. MeetingFlow syncs upcoming meetings from Google Calendar.
3. Meeting concludes.
4. MeetingFlow inspects the Google Meet conference space artifacts.
5. If Google Workspace is still generating the audio transcript, the status is set to `TRANSCRIPT_PENDING` (with a retry trigger).
6. When the transcript is ready, it is retrieved and normalized into `{ speaker, timestamp, text }`.
7. Normalized entries are sent to Gemini using `GEMINI_MODEL` with strict anti-hallucination prompting (no invented owners or deadlines).
8. Results are stored in PostgreSQL; tasks are allocated to attendees; users can push issues to Jira or schedule Calendar reminders.

### Demo Mode Workflow
- Clearly labeled with a persistent `DEMO MODE` badge.
- Pre-seeded with 5 upcoming meetings and 5 completed meetings with rich multi-speaker transcripts.
- Pre-loaded with realistic personal to-dos, team actions, decisions, and analytics.
- Interactive buttons ("Simulate New Meeting", "Process Meeting") walk through the 4-stage pipeline:
  - `Meeting completed ✓`
  - `Checking transcript...`
  - `Transcript received ✓`
  - `Analyzing meeting with Gemini...`
  - `Action items extracted ✓`
- Simulates Jira tickets (e.g., `JIRA-141`) and Google Calendar reminders without claiming external API success when keys are not configured.

---

## 4. Quick Start & Installation

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 10+
- (Optional) Docker for local PostgreSQL

### 1. Install Dependencies
```bash
npm run install:all
```
Or individually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Inside `.env`:
```env
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meetingflow?schema=public

# Google Workspace OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Gemini AI (Server-Side Only - Never Exposed to Frontend)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Jira REST API
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_DEFAULT_PROJECT=MF
```

> **Security Rule**: The frontend never requests or renders `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, or `JIRA_API_TOKEN`.

### 3. Run Development Servers
To run both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
- **Backend**:
  ```bash
  cd server && npm run dev
  ```
- **Frontend**:
  ```bash
  cd client && npm run dev
  ```

---

## 5. PostgreSQL & Prisma Setup (Optional for Production)

To spin up local PostgreSQL with Docker:
```bash
docker compose up -d
```
Run Prisma migrations:
```bash
cd server
npm run prisma:push
```

*Note: If PostgreSQL is not running, the application starts immediately in Zero-Config Demo Mode using its in-memory typed persistence store.*

---

## 6. Testing Integrations

Navigate to `/integrations` in the browser:
- **Google Workspace**: View Calendar & Meet connection status.
- **Gemini AI**: View configured model name (`GEMINI_MODEL`), verify AI pipeline status, and run `[Test AI Analysis]`.
- **Jira**: Input your Jira Base URL, email, and API token, and click `[Test Jira Connection]`.

---

## 7. Responsive Breakpoints

MeetingFlow is engineered and tested across:
- **Desktop** (`1440px`, `1280px`): Persistent espresso sidebar (`#1B211E`), multi-column cards, full analytics.
- **Tablet** (`1024px`, `768px`): Responsive card grid, slide-over drawer navigation.
- **Mobile** (`390px`, `375px`): Fixed bottom navigation (`Home`, `Meetings`, `Tasks`, `Analytics`, `More`), single-column cards, thumb-friendly task completion targets, zero horizontal overflow.
