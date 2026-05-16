# CityMind MY

AI-powered traffic and walkability analysis advisor for Jabatan Pengangkutan Jalan (JPJ) Malaysia.

Built with React + TypeScript + Vite on the frontend and FastAPI + Strands Agent (Amazon Bedrock) on the backend.

## Features

- AI-generated traffic and walkability recommendations for Malaysian roads
- Interactive Leaflet map with landmark overlays
- Priority-coded recommendation cards with cost breakdowns
- Gantt implementation timeline
- PDF report generation (ReportLab)
- Bilingual UI (English / Bahasa Malaysia)

## Development

```bash
npm run dev
```

This starts both the FastAPI backend (port 8000) and the Vite dev server (port 5173) concurrently.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API origin (leave empty for local dev proxy) |
