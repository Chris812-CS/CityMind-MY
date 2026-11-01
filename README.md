# CityMind

An AI traffic and walkability advisor for Malaysian roads. You describe a location, its traffic conditions and your constraints, and an AI agent returns prioritised recommendations, an analytics dashboard and a downloadable PDF report.

**Live demo:** coming soon (being moved to a new LLM backend) <!-- replace with the Vercel URL once it is back up -->

> Grand Finalist (solo entry, representing APU), AWS CendekiAwan Bedrock AI Solution Challenge, October 2026

## Features

- **AI recommendations:** an agent built with the Strands Agents SDK on Amazon Bedrock (Claude Sonnet 4.5) produces recommendations in four categories: traffic flow, public transport, pedestrian walkability, and policy and enforcement. Each one has a responsible party, a timeline and a priority (Critical, High or Medium).
- **Constraint checking:** recommendations that break the budget or policy limits you enter are listed separately as deferred, not mixed in with the rest.
- **Analytics dashboard:** severity score, time lost per commuter, accident risk, affected commuters, recommendations by category, budget breakdown, and an implementation timeline (Gantt chart), built with Recharts.
- **Interactive map:** Leaflet map of the selected location, with OKU (accessibility) facility markers.
- **PDF report:** a formal report with a unique reference number, generated server-side with ReportLab.
- **Input safety:** all input is sanitised on the server (HTML, control characters and prompt-injection patterns are stripped, with a 2,000-character limit per field) before it reaches the AI.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS v4, Leaflet / react-leaflet, Recharts |
| Backend | Python, FastAPI, Pydantic, ReportLab, bleach |
| AI | Strands Agents SDK, Amazon Bedrock (Claude Sonnet 4.5) <!-- add "Google Gemini API" after the switch --> |
| Hosting | Vercel (frontend), Render (backend) |

## API

| Method | Endpoint | What it does |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/analyze` | Runs the AI analysis and returns structured recommendations |
| `POST` | `/report` | Turns an analysis into a PDF report |

## Run it locally

You need Python 3.12+, Node.js 18+, and access to Amazon Bedrock.

```bash
git clone https://github.com/Chris812-CS/CityMind-MY.git
cd CityMind-MY

# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cd ..

# Frontend
npm install
npm install --prefix frontend

# Start both (Windows)
npm run dev
```

Frontend: http://localhost:5173 · Backend: http://localhost:8000

On macOS/Linux, start them separately: `uvicorn main:app --reload --port 8000 --app-dir backend`, then `npm run dev --prefix frontend`.

### Environment variables

Locally, put these in a `.env.local` file in the project root (it is git-ignored). In production, the AWS variables live in the Render backend's environment settings and `VITE_API_URL` in Vercel, never in the code:

| Name | What it is |
| --- | --- |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock API key (backend only) |
| `AWS_DEFAULT_REGION` | AWS region where Bedrock is enabled |
| `VITE_API_URL` | Backend URL for the frontend in production; leave unset locally (Vite proxies to `localhost:8000`) |

## Project structure

```
backend/
  main.py            FastAPI app and routes
  agent.py           Bedrock agent and system prompt
  models.py          Pydantic request/response models
  sanitizer.py       Server-side input sanitisation
  pdf_generator.py   PDF report generation
frontend/src/
  components/        Input form, map, recommendation cards, dashboard, PDF button
  hooks/             API calls (useAnalysis)
  constants/         Pre-set locations
  types/             API types
```

## Author

Christian Teo Li Xin · [LinkedIn](https://linkedin.com/in/christian-teo-li-xin)
