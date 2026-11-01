# CityMind

An AI urban-mobility advisor for Malaysian cities that combines traffic and walkability insights, accessible (OKU) facility locations and an AI assistant in one web app.

**Live demo:** coming soon (being moved to a new LLM backend) <!-- replace with the Vercel URL once it is back up -->

> Grand Finalist (solo entry, representing APU), AWS CendekiAwan Bedrock AI Solution Challenge, October 2026

## Features

- **AI assistant:** [TBC: one line on what users ask and what it recommends], powered by a large language model
- **Interactive map:** Leaflet map with OKU (accessibility) facility markers
- **Analytics dashboard:** Recharts charts of [TBC: what the dashboard shows]
- [TBC: any other feature worth a line]

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS v4 |
| Maps and charts | Leaflet / react-leaflet, Recharts |
| AI | AWS Bedrock (competition version) <!-- add "Google Gemini API" after the switch --> |
| Hosting | Vercel |

## Run it locally

```bash
git clone https://github.com/Chris812-CS/CityMind-MY.git
cd CityMind-MY
npm install
cp .env.example .env   # add your own API keys here; never commit .env
npm run dev
```

Then open http://localhost:5173.

### Environment variables

| Name | What it is |
| --- | --- |
| [TBC: e.g. `AWS_REGION`, `GEMINI_API_KEY`] | [TBC] |

## Project structure

```
src/
  components/   UI components
  [TBC: other folders]
```

## Author

Christian Teo Li Xin · [LinkedIn](https://linkedin.com/in/christian-teo-li-xin)
