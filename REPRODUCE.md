# Sentinel Pipeline Reproducibility Instructions

Follow these instructions to reproduce the complete Sentinel ML training, probability calibration, E2E Express API checks, and UI dashboard.

---

## 1. Setup Environment
Ensure Python 3.10+ and Node.js 18+ are installed locally. Create virtual environment and install packages:
```bash
# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install Node dependencies
npm install
```

---

## 2. Configuration Setup
Create your local `.env` configuration file from the template:
```bash
cp .env.example .env
```
Ensure that the `GEMINI_API_KEY` in `.env` is set to a valid 45-character placeholder or your actual key:
`GEMINI_API_KEY=AIzaSyB3B_SentinelKeyForValidationPurposeOnly12345`

---

## 3. Dataset Preprocessing & Model Training
Execute the training pipeline chronologically:
```bash
# Preprocess NeurIPS BAF dataset chunks (Month 0-4 train, Month 5 validation, Month 6-7 test)
.venv/bin/python3 ml/preprocessing.py

# Train LightGBM Booster model
.venv/bin/python3 ml/train.py

# Fit Platt Probability Calibration parameters and generate Sweep matrices
.venv/bin/python3 ml/calibrate.py
```

---

## 4. Launch Validation Quality Gate
Run the master E2E integration test suite, executing database migrations, checks for secrets, and programmatically calling transaction endpoints:
```bash
npm run production:check
```
Telemetry outputs are saved to `artifacts/production-check/report.json` and `report.md`.

---

## 5. Launch B2B Sentinel Platform
Start both the FastAPI model server daemon and the main Node Express backend:
```bash
# Compile and start server
npm run build
npm start
```
Open `http://localhost:3000` to interact with the Sentinel Dashboard, test custom rules, simulate normal/spike/cluster scenarios, and view operational safety alerts.
