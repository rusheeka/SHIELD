# SHIELD Frontend (Team-B2)

Frontend web interface for **SHIELD: An Intelligent QR Code and Digital Payment Threat Detection System with Secure Gateway Validation and Risk Scoring**.

## Features Implemented

- **Payment & QR Inspector (`src/components/ScannerPanel.jsx`)**:
  - Upload QR code images (routed to the Python `OpenCV` backend `/api/decode-qr`, with native browser `BarcodeDetector` fallback).
  - Parse and inspect `upi://pay`, `upi://collect`, standalone VPAs, and web payment links in real time.
  - One-click test scenarios for legitimate merchants, collect traps, phishing URLs, and shortened links.
- **Threat & Risk Assessment (`src/components/RiskReportPanel.jsx`)**:
  - Animated `0–100` threat gauge with `LOW`, `MEDIUM`, and `HIGH` risk classification.
  - **Secure Gateway Validation** checks (HTTPS/TLS, domain typosquatting, NPCI PSP handle registry, payee identity consistency, and collect-request detection).
  - Transparent ML risk feature breakdown, detected threat indicators, and preventive user recommendations.
- **Transaction Threat Audit Log (`src/components/AuditHistoryTable.jsx`)**:
  - Searchable, risk-filterable audit table backed by **Supabase** (`scan_logs` table) with automatic `localStorage` fallback when Supabase credentials are omitted.
- **Seamless Simulation Mode**:
  - Works immediately offline or without the Python server running via `src/utils/riskAnalyzer.js`, and switches automatically to live Python API mode when `GET /api/health` responds.

## Getting Started

```bash
npm install
npm run dev
```

Run unit tests for the UPI parser, gateway validator, and risk-scoring engine:

```bash
npm test
```

## Environment Variables (`.env`)

Copy `.env.example` to `.env` to connect your Python backend and Supabase project:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Table Schema (`scan_logs`)

```sql
create table if not exists public.scan_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  channel text,
  "inputType" text,
  target text,
  "payeeName" text,
  amount numeric default 0,
  currency text default 'INR',
  "riskScore" integer not null,
  "riskLevel" text not null,
  verdict text not null,
  "gatewayStatus" text not null,
  mode text default 'simulation',
  reported boolean default false
);
```

