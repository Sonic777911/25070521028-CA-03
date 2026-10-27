# PersonaX

PersonaX is a local, educational behavioral competency assessment prototype. Candidates answer timed open-ended and multiple-choice prompts; an evaluator can review written answers, add ratings and notes, and view a descriptive competency profile. The frontend is React, the API is Node.js/Express, and MongoDB stores the data. It is not a medical or psychological diagnostic tool.

## Features

- Candidate self-registration and candidate/evaluator sign-in selection
- Backend-provisioned evaluator account with hashed password storage
- Role-specific dashboards and candidate assessment access
- Candidates can start a new assessment after completing one; each attempt and its responses are retained separately
- Evaluators can switch between a candidate's saved attempts and review each attempt's responses by section
- Candidate registration with a system-generated candidate code
- Four dynamically loaded assessment sections: picture story, situation response, word association, and behavioral choice
- Visible section countdowns and a 15-second per-word countdown for 60 randomized word-association stimuli
- MongoDB persistence for candidates, assessments, questions, responses, and evaluations
- Evaluator dashboard with open responses, per-question ratings (1–5) and notes
- Results page with competency scores and separate response dynamics
- Two user-supplied picture-story images; each gets a 1-minute viewing phase followed by a 4-minute writing phase. The situation section has 30 sentence-completion prompts with a shared 15-minute limit, and ten choice questions are seeded.
- Thirty behavioral-choice questions with a 15-minute section timer
- Sixty randomized word-association prompts, shown one at a time with a 15-second response window

## Technology

React, CSS, Node.js, Express, MongoDB, and Mongoose. Passwords are stored as scrypt hashes; signed bearer tokens protect role-specific APIs.

## Structure

```text
server.js                 Express server and MongoDB connection
client/src/main.jsx       React sign-in, dashboards, assessment, and review UI
vite.config.js            React frontend build configuration
middleware/auth.js        Role-aware API authentication
models/User.js            Candidate and evaluator accounts
models/                   Mongoose schemas
routes/                   REST API endpoints
scripts/seed.js           Upsert assessment prompts and deactivate unselected stock pictures without deleting response history
scripts/seed-words.js     Refresh the 60 word-association stimuli
public/                   Built React app and shared assets
public/css/style.css      Responsive styling
public/js/                Browser-side workflows
public/images/            Local sample story illustrations
```

## Install and run

1. Install Node.js and MongoDB Community Server. Start the MongoDB service.
2. From this project directory run `npm install`.
3. `.env` defaults to `mongodb://127.0.0.1:27017/personax` and port `3000`.
4. Seed the question collection with `npm run seed`. This safely adds or refreshes prompts without deleting existing records. `npm run seed:words` can refresh the word stimuli alone.
5. Provision an evaluator by setting `EVALUATOR_EMAIL` and `EVALUATOR_PASSWORD` in the process environment, then run `npm run bootstrap:evaluator`. The script stores a scrypt hash in MongoDB; evaluator accounts cannot be created from the public sign-up form.
6. For development, run `npm run dev` and `npm run start` in separate terminals. Vite serves the React UI and Express serves the API. For a production-style local run, use `npm run build` followed by `npm start`.
7. Open [http://localhost:3000](http://localhost:3000) for the built app. Check [http://localhost:3000/api/status](http://localhost:3000/api/status).

In MongoDB Compass connect to `mongodb://127.0.0.1:27017`; open database `personax`.

## API overview

- `GET /api/status` — server/database status
- `POST /api/auth/register`, `POST /api/auth/login` — create an account or sign in
- `GET /api/candidates` — evaluator-only candidate list
- `GET /api/questions?section=picture|situation|word|choice` — dynamically load questions
- `POST /api/assessments/start`, `GET /api/assessments/:id`, `POST /api/assessments/:id/complete`
- `GET /api/assessments/:id/responses`
- `POST /api/responses` — create/update one response per assessment and question
- `POST /api/evaluations`, `GET /api/evaluations/:assessmentId`
- `GET /api/results/:candidateId` — aggregated profile and response dynamics

## Scoring methodology

Each behavioral-choice option has dimension-specific weights from 1 to 5. For each dimension, selected choice weights are converted to a 0–100 range (`weight / 5 × 100`). Evaluator ratings use `(rating − 1) / 4 × 100`. Where both kinds of evidence exist, available individual observations are averaged equally; where only one kind exists, its average is used. A dimension with no evidence displays as unrated. Overall score is the average of rated dimensions. The profile does not infer traits from response speed or open-ended writing. Evaluator ratings are human judgments and should be interpreted with context.

Response dynamics report attempted and skipped responses, completion against the currently seeded question bank, average/fastest/longest response time, and total assessment duration. Response time is not used to award competency points.

## Limitations and future work

Evaluator accounts must be provisioned by an administrator with the backend bootstrap script. Candidate resume flow, export, item-level section analytics, and production privacy controls are not included. Timer values are enforced in the browser and are not tamper-proof. A production deployment needs access controls, consent/retention policies, server-side timing validation, and a reviewed scoring rubric. Expand the question bank by editing `scripts/seed.js`. Story images are local assets.
