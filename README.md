# 🪵 Channapatna Toys — AI-Based Fair Pricing Platform

> **Protecting 200-year-old artisan craft with machine learning.**  
> An end-to-end AI platform that predicts fair marketplace prices and computes transparent cost breakdowns for GI-tagged Channapatna wooden toys.

---

## 📸 Overview

Channapatna (*Gombegala Ooru* — "Toy City") toys are a 200-year-old heritage craft from Karnataka, India, awarded **Geographical Indication Tag #18**. Artisans hand-carve toys from sustainably-harvested **Hale Mara** (*Wrightia tinctoria*) and color them with 100% natural vegetable lacquers.

This platform bridges traditional craft economics with modern AI — preventing intermediary wage exploitation for **3,000+ artisan families** across Karnataka.

**What it does:**
- 📈 **Market Price Predictor** — ML model estimates marketplace selling price using toy dimensions, material, and category
- 🛡️ **Fair Price Calculator** — Computes transparent, itemised cost breakdown (materials + labour + overhead + profit)
- 🔬 **Model Insights Dashboard** — Live metrics from the production Random Forest model
- 🪵 **About Page** — Heritage and mission of the Channapatna craft

---

## 🏗️ Architecture

```
channapatna-toys/
│
├── backend/
│   ├── main.py               # FastAPI REST API (all endpoints)
│   └── pricing_engine.py     # ML inference + artisan cost calculator
│
├── frontend/
│   ├── index.html            # Single-page multi-view frontend
│   ├── app.js                # All frontend logic (SPA router, API calls, charts)
│   ├── frontend.css          # Full design system & component styles
│   └── assets/               # Images: logo, banners, card images
│
├── routes/
│   └── etsy.js               # Node.js Etsy integration route (optional)
├── services/
│   └── etsy/                 # Etsy API service client (optional)
│
├── preprocessing.py          # ML training pipeline (run once to retrain)
├── price_model.pkl           # Trained Random Forest model artifact
├── tfidf_vectorizer.pkl      # Fitted TF-IDF vocabulary
├── feature_columns.json      # Ordered feature schema for prediction
├── mlr_metrics.json          # Model evaluation metrics (JSON)
├── feature_encoder.pkl       # Categorical encoder artifact
│
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
├── server.js                 # Express.js API server (optional Node layer)
├── serve_frontend.py         # Standalone optional Python static file server
└── MODEL_DOCUMENTATION.md   # Deep-dive mathematical + architectural docs
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Python | 3.10+ |
| pip | 23+ |
| Node.js | 18+ (optional, for Express layer) |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Raksh13-gg/channaptna_final.git
cd channaptna_final
```

---

### Step 2 — Set Up Python Environment

```bash
# Create and activate a virtual environment (recommended)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt
```

---

### Step 3 — Start the FastAPI Backend

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be live at: **http://127.0.0.1:8000**  
Interactive API docs: **http://127.0.0.1:8000/docs**

> **Note:** The pre-trained model artifacts (`price_model.pkl`, `tfidf_vectorizer.pkl`, `feature_columns.json`) are already included. The backend loads them automatically on startup.

---

### Step 4 — Serve the Frontend

The frontend is a plain HTML/CSS/JS SPA. You can serve it in two ways:

#### Option A — Serve via FastAPI (recommended, zero config)

The backend auto-mounts the `frontend/` directory. Just open:
```
http://127.0.0.1:8000/ui
```

#### Option B — Serve via the standalone Python server

```bash
python serve_frontend.py
```
Then open: **http://localhost:3000**

#### Option C — Node.js Express server

```bash
npm install
npm start
```
Then open: **http://localhost:3000**

---

## 🧠 How the AI Model Works

### The Core Problem

Channapatna toys span wildly different price ranges (₹50 → ₹5,000+). A naive regression model fails due to scale disparity and small dataset size (~180 records).

### Solution: Price-to-MRP Ratio Regression

Instead of predicting absolute price, the model predicts:

```
Ratio = Price / MRP  (bounded between 0.15 and 1.00)
```

Then at inference time:
```
Predicted Price = Ratio × MRP
```

This approach:
- Eliminates scale extremes
- Naturally handles artisan vs. marketplace pricing
- Works with small datasets (180 records total)

### Feature Engineering Pipeline

| Feature Group | Description |
|---|---|
| **Dimensions** | L × W × H parsed from strings; volume, density computed |
| **Text (TF-IDF)** | Top 20 keywords from toy title/description |
| **Material** | One-hot + ordinal encoding of wood species |
| **Category** | Encoded toy type (stacking, rattle, rocking, etc.) |
| **Physical** | Weight, set quantity, age group in months |
| **Derived** | Weight/volume density, surface area, aspect ratios |

**Total engineered features: 100**

### Model Selection

| Model | MAE (₹) | RMSE (₹) | R² | MAPE |
|---|---|---|---|---|
| Baseline XGBoost | 444.85 | 680.91 | 0.8467 | 38.0% |
| **Production Random Forest** | **194.43** | **377.92** | **0.9225** | **15.30%** |

**56.3% lower MAE** vs baseline. See [MODEL_DOCUMENTATION.md](MODEL_DOCUMENTATION.md) for full mathematical proofs.

### Artisan Fair Price Calculator

The Fair Price calculator computes a fully transparent cost sheet:

```
Fair Price = (Wood Material Cost + Labour Cost + Tool & Overhead Cost) × (1 + Margin%)
```

| Component | Basis |
|---|---|
| Wood Material | Volume × wood density rate (₹/cm³) |
| Labour | Crafting hours × Karnataka living wage (₹140/hr default) |
| Tool & Overhead | 15% of (material + labour) |
| Artisan Margin | Configurable 5–60% profit margin |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API health & version info |
| `GET` | `/health` | Model load status |
| `GET` | `/api/features` | Supported categories, materials, rates |
| `GET` | `/api/metrics` | Live model evaluation metrics |
| `GET` | `/api/sample-toys` | 5 curated sample toys for testing |
| `POST` | `/api/predict` | ML marketplace price prediction |
| `POST` | `/api/artisan-fair-price` | Artisan cost breakdown + fair price |
| `POST` | `/api/price-analysis` | Full unified analysis (predict + fair + comparison) |

### Example: Predict Market Price

```bash
curl -X POST http://127.0.0.1:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Channapatna Wooden Stacking Rings",
    "product_type": "stacking toy",
    "material": "hale wood",
    "mrp": 550.0,
    "length_cm": 10.0,
    "width_cm": 10.0,
    "height_cm": 15.0,
    "weight_g": 180.0,
    "set_quantity": 1,
    "age_group_months": 12.0
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predicted_price_inr": 418.50,
    "predicted_ratio": 0.761,
    "price_range_low": 326.00,
    "price_range_high": 511.00,
    "confidence": "high"
  }
}
```

### Example: Calculate Fair Artisan Price

```bash
curl -X POST http://127.0.0.1:8000/api/artisan-fair-price \
  -H "Content-Type: application/json" \
  -d '{
    "length_cm": 10.0,
    "width_cm": 10.0,
    "height_cm": 15.0,
    "weight_g": 180.0,
    "material": "hale wood",
    "set_quantity": 1,
    "crafting_hours": 1.5,
    "hourly_wage": 140.0,
    "artisan_margin_percent": 25.0
  }'
```

---

## 🖥️ Frontend Pages

| Page | Description |
|---|---|
| **Home** | Landing page with two action cards |
| **Market Price** | 3-step wizard to get ML marketplace price estimate |
| **Fair Price** | 2-step form for artisan cost breakdown + fair price |
| **Insights** | Live model accuracy metrics vs baseline |
| **About** | Heritage story of Channapatna craft |

**Tech stack:** Vanilla HTML5 · CSS3 (custom design system, dark greens + terracotta palette) · Vanilla JS (SPA router) · Chart.js (cost breakdown bar charts)

---

## 🔁 Retraining the Model

To retrain the ML model on updated data, run:

```bash
python preprocessing.py
```

This will:
1. Load all dataset files (`X_train.csv`, `y_train.csv`, etc.)
2. Run the feature engineering pipeline
3. Train the Random Forest Ratio model
4. Export `price_model.pkl`, `tfidf_vectorizer.pkl`, `feature_columns.json`, `mlr_metrics.json`

---

## 📦 Dependencies

### Python (`requirements.txt`)

```
fastapi>=0.110.0
uvicorn>=0.28.0
scikit-learn>=1.4.0
pandas>=2.0.0
numpy>=1.26.0
joblib>=1.3.0
openpyxl>=3.1.0
requests>=2.31.0
pydantic>=2.5.0
```

### Node.js (`package.json`)

Used optionally for the Express static server and Etsy marketplace integration routes.

---

## 📄 Key Files

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, all API routes, CORS, static mount |
| `backend/pricing_engine.py` | ML inference, artisan cost calculator, fairness analysis |
| `preprocessing.py` | Full training pipeline (data loading → model export) |
| `frontend/index.html` | SPA HTML with all views |
| `frontend/app.js` | SPA router, form validation, API calls, Chart.js |
| `frontend/frontend.css` | Full design system (tokens, layout, animations) |
| `MODEL_DOCUMENTATION.md` | Mathematical proofs, model architecture deep-dive |

---

## 🌿 About the Craft

> *"Channapatna toys are not just products — they are a living cultural heritage passed down through generations of skilled artisans."*

- **Location:** Channapatna town, Ramanagara district, Karnataka, India
- **GI Tag:** #18 — Protected Geographical Indication
- **Wood:** Hale Mara (*Wrightia tinctoria*) — sustainably harvested ivory wood
- **Colors:** 100% natural vegetable lacquers (turmeric yellow, kumkum red, indigo blue)
- **Technique:** Traditional lathe turning + hand-carved detailing + screw-pine leaf buffing

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🤝 Contributing

This project was built to support artisan communities. If you'd like to contribute additional marketplace data, improve the model, or add new features, feel free to open a PR!