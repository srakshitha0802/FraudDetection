# 🛡️ Sentinel PayGuard • Autonomous AI Fraud Detection & Real-Time Risk Engine

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Sentinel PayGuard** is an advanced, autonomous AI-powered fraud detection, risk scoring, and real-time transaction analysis platform designed for modern payment infrastructure (UPI, Credit Card, Net Banking, Crypto Wallets). It combines machine learning risk classifiers (XGBoost/Gradient Boosted Decision Trees), deterministic rule engines, graph-based mule ring detection, and autonomous LLM tool-calling agents to intercept fraudulent activity in real time.

---

## ✨ Key Features

- **⚡ Real-Time Transaction Risk Engine**: Evaluates payment transactions in under 50ms using 18+ velocity and behavioral features.
- **🔊 Web Audio API Buzz Synthesizer Engine**:
  - Native Web Audio API sound synthesis with multiple severity audio signatures:
    - 🚨 `SIREN_BUZZ` (High/Critical Risk cyber-siren with FM oscillation)
    - ⚡ `ELECTRO_BUZZ` (Medium Risk double-pulse square wave)
    - 🛰️ `PULSE_BUZZ` (Tactical low-frequency buzz)
    - ✅ `SYNTH_CHIME` (Smooth harmonic 3-tone chime for approved payments)
  - 🗣️ **Web Speech API Voice Alert (TTS)**: Spoken voice announcement for blocked high-risk transactions.
  - 📳 **Haptic Hardware Vibration API**: Tactile vibration feedback on mobile touch devices.
- **🛡️ Futuristic Cyber-Shield Pop-Up HUD**:
  - Live animated HTML5 Canvas soundwave equalizer visualizer.
  - Interactive multi-tab breakdown: Risk Score Gauge %, Policy Enforcement Badge (`BLOCKED`, `FLAGGED`, `APPROVED`), Autonomous AI Tool Steps Terminal Log, Sound Profile HUD, and Raw JSON Event Payload viewer.
  - 12-second auto-dismiss countdown timer bar with pause-on-hover logic.
- **🤖 Autonomous AI Investigation Agent**: Executes autonomous tool-calling loops to inspect device fingerprints, query graph databases for mule accounts, and dispatch instant SMS & Email security alerts.
- **🕸️ Graph Engine & Mule Syndicate Detection**: Analyzes network node centrality to discover organized fraud rings and money mule networks.
- **📊 Real-Time Live Feed & Threat Simulator**: Simulate legimate, account takeover (ATO), and mule syndicate attack scenarios in 1-click.
- **🔍 ScamChecker AI**: Multimodal scam and phishing detection using Google Gemini AI for suspicious text, screenshots, and URLs.

---

## 🏗️ Architecture Overview

```
                        ┌──────────────────────────────────────────┐
                        │   Incoming Transaction Payload (UPI/CC)  │
                        └────────────────────┬─────────────────────┘
                                             │
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │    Feature Extraction (18+ Features)     │
                        └────────────────────┬─────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
        ┌───────────────────────────┐                 ┌───────────────────────────┐
        │  Deterministic Rule Engine│                 │  ML XGBoost Classifier    │
        │    (10 Security Rules)    │                 │   (Behavioral Model)      │
        └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │   Autonomous AI Investigation Agent      │
                        │    (Gemini Tool Calling Loop)            │
                        └────────────────────┬─────────────────────┘
                                             │
                      ┌──────────────────────┼──────────────────────┐
                      ▼                      ▼                      ▼
           ┌────────────────────┐ ┌───────────────────┐ ┌────────────────────┐
           │ Graph Engine (Mule)│ │ Risk Gauge Score  │ │ SMS & Email Alerts │
           └────────────────────┘ └───────────────────┘ └────────────────────┘
                                             │
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │  Web Audio Buzz & Cyber-Shield Pop HUD   │
                        └──────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Recharts
- **Audio Synthesizer**: HTML5 Web Audio API (`AudioContext`), Web Speech API (`SpeechSynthesis`)
- **Backend**: Node.js, Express, TypeScript, ESBuild, TSX
- **AI & ML**: Google Gemini AI (`@google/genai`), Custom Rules & Graph Intelligence Engines
- **Build Tooling**: Vite 6, ESBuild

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/srakshitha0802/FraudDetection.git
cd FraudDetection
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Set your configuration parameters:

```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Production Build & Deployment

### Build the Application

To create an optimized production build of both the React frontend and Express backend:

```bash
npm run build
```

This compiles the static assets into `dist/` and bundles the server into `dist/server.cjs`.

### Start Production Server

```bash
npm run start
```

---

## ☁️ Deployment Guides

### Option A: Deploy on Render / Railway / Heroku

1. Connect your GitHub repository `srakshitha0802/FraudDetection`.
2. Set Build Command: `npm run build`
3. Set Start Command: `npm run start`
4. Add Environment Variable: `GEMINI_API_KEY` (and `PORT=3000`)

### Option B: Deploy with Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
```

---

## 📡 API Endpoints

### 1. Analyze Transaction
`POST /api/transactions/analyze`

**Request Body:**
```json
{
  "user_id": "U102",
  "amount": 85000,
  "currency": "INR",
  "merchant_category": "TRANSFER",
  "transaction_type": "UPI",
  "device_id": "DEV778",
  "location": "Hyderabad",
  "recent_password_reset": true,
  "failed_login_count_24h": 4
}
```

**Response:**
```json
{
  "transaction": {
    "transaction_id": "TX_9812401",
    "risk_score": 89,
    "risk_level": "HIGH",
    "policy_decision": "BLOCKED"
  },
  "risk_breakdown": {
    "final_risk_score": 89,
    "risk_level": "HIGH",
    "policy_decision": "BLOCKED",
    "rule_trigger_count": 4
  },
  "investigation": {
    "investigation_id": "INV_9812401",
    "summary": "High velocity anomaly combined with recent password reset.",
    "toolInvocations": []
  }
}
```

---

## 🧪 Testing

To verify TypeScript code compilation:

```bash
npx tsc --noEmit
```

To run build verification:

```bash
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
