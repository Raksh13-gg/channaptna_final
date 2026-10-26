"""
FastAPI Backend for AI-Based Fair Pricing & Market Intelligence Platform
for Channapatna Toys.

Integrates:
- Production Random Forest Ratio Model & TF-IDF Vectorizer
- Domain-accurate Artisan Fair-Price Calculator & Cost Breakdown
- Comparative Fair Pricing Intelligence Engine
- Real Evaluation Metrics & Dataset Benchmarks
"""

import os
import json
import warnings
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse

# Suppress sklearn unpickle version warnings for clean logs
warnings.filterwarnings("ignore", category=UserWarning)

from backend.pricing_engine import pricing_engine, DEFAULT_FAIR_HOURLY_WAGE

app = FastAPI(
    title="Channapatna Toys - Fair Pricing & Market Intelligence API",
    description="Machine Learning Pricing Recommendation Engine & Artisan Fair-Price Calculator for GI-tagged Channapatna Wooden Toys",
    version="2.0.0"
)

# Enable CORS for Streamlit or web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve HTML Frontend as static files ──────────────────────────────────────
_FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(_FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=_FRONTEND_DIR), name="frontend-static")

    @app.get("/ui", include_in_schema=False)
    @app.get("/ui/", include_in_schema=False)
    def serve_frontend():
        """Redirect to the HTML frontend served from /frontend/index.html"""
        index_path = os.path.join(_FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        return RedirectResponse(url="/docs")



# -------------------------------------------------------------
# Pydantic Request / Response Schemas
# -------------------------------------------------------------
class ToyFeatureInput(BaseModel):
    product_name: str = Field(..., example="Handcrafted Channapatna Wooden Stacking Rings")
    product_type: str = Field("stacking toy", example="stacking toy")
    material: str = Field("hale wood", example="hale wood")
    mrp: float = Field(..., gt=0, example=599.0, description="Reference Retail MRP in INR")
    length_cm: Optional[float] = Field(None, ge=0, example=10.0)
    width_cm: Optional[float] = Field(None, ge=0, example=10.0)
    height_cm: Optional[float] = Field(None, ge=0, example=15.0)
    weight_g: Optional[float] = Field(None, ge=0, example=180.0)
    set_quantity: Optional[int] = Field(1, ge=1, example=1)
    age_group_months: Optional[float] = Field(12.0, ge=0, example=12.0)

    @field_validator("mrp")
    @classmethod
    def validate_mrp(cls, v):
        if v <= 0:
            raise ValueError("MRP must be greater than zero.")
        return v


class ArtisanCostInput(BaseModel):
    length_cm: Optional[float] = Field(None, ge=0, example=10.0)
    width_cm: Optional[float] = Field(None, ge=0, example=10.0)
    height_cm: Optional[float] = Field(None, ge=0, example=15.0)
    weight_g: Optional[float] = Field(None, ge=0, example=180.0)
    material: str = Field("hale wood", example="hale wood")
    set_quantity: int = Field(1, ge=1, example=1)
    crafting_hours: Optional[float] = Field(None, ge=0.1, example=1.5)
    hourly_wage: float = Field(DEFAULT_FAIR_HOURLY_WAGE, ge=50, example=140.0)
    artisan_margin_percent: float = Field(25.0, ge=5.0, le=60.0, example=25.0)


class FullAnalysisInput(BaseModel):
    product_name: str = Field(..., example="Handcrafted Channapatna Wooden Stacking Rings")
    product_type: str = Field("stacking toy", example="stacking toy")
    material: str = Field("hale wood", example="hale wood")
    mrp: float = Field(..., gt=0, example=599.0)
    length_cm: Optional[float] = Field(None, ge=0, example=10.0)
    width_cm: Optional[float] = Field(None, ge=0, example=10.0)
    height_cm: Optional[float] = Field(None, ge=0, example=15.0)
    weight_g: Optional[float] = Field(None, ge=0, example=180.0)
    set_quantity: Optional[int] = Field(1, ge=1, example=1)
    age_group_months: Optional[float] = Field(12.0, ge=0, example=12.0)
    crafting_hours: Optional[float] = Field(None, ge=0.1, example=1.5)
    hourly_wage: float = Field(DEFAULT_FAIR_HOURLY_WAGE, ge=50, example=140.0)
    artisan_margin_percent: float = Field(25.0, ge=5.0, le=60.0, example=25.0)


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Channapatna Toys Fair Pricing & Market Intelligence API",
        "version": "2.0.0",
        "model_loaded": pricing_engine.is_loaded,
        "docs_url": "/docs"
    }


@app.get("/api")
def read_api_info():
    return {
        "status": "online",
        "service": "Channapatna Toys Fair Pricing & Market Intelligence API",
        "version": "2.0.0",
        "model_loaded": pricing_engine.is_loaded,
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy" if pricing_engine.is_loaded else "degraded",
        "model_loaded": pricing_engine.is_loaded,
        "features_count": len(pricing_engine.feature_columns),
        "error": pricing_engine.load_error
    }


@app.get("/api/features")
def get_features():
    """Returns available categories, materials, and default feature medians."""
    return {
        "product_types": pricing_engine.get_supported_categories(),
        "materials": pricing_engine.get_supported_materials(),
        "total_engineered_features": len(pricing_engine.feature_columns),
        "wood_rates": {
            "hale wood": "₹0.045 / cm³ (Authentic GI Ivory Wood)",
            "sustainably sourced hale wood": "₹0.050 / cm³",
            "solid wood": "₹0.040 / cm³",
            "pine": "₹0.035 / cm³",
            "mango wood": "₹0.038 / cm³"
        },
        "default_hourly_wage": DEFAULT_FAIR_HOURLY_WAGE
    }


@app.get("/api/metrics")
def get_model_metrics():
    """Returns official model evaluation metrics and comparison benchmarks."""
    metrics = pricing_engine.metrics
    return {
        "production_model": {
            "name": metrics.get("model", "RandomForestRegressor_RatioModel"),
            "mae_inr": metrics.get("mae", 194.43),
            "rmse_inr": metrics.get("rmse", 377.92),
            "r2_score": metrics.get("r2_score", 0.9225),
            "mape_percent": metrics.get("mape_percent", 15.30),
            "total_records": metrics.get("total_samples", 180),
            "training_samples": metrics.get("training_samples", 144),
            "testing_samples": metrics.get("testing_samples", 36),
            "features_count": metrics.get("features_count", 100)
        },
        "baseline_comparison": {
            "baseline_model": "Baseline XGBoost",
            "baseline_mae_inr": 444.85,
            "baseline_rmse_inr": 680.91,
            "baseline_r2": 0.8467,
            "baseline_mape_percent": 38.0,
            "mae_reduction_percent": 56.3,
            "rmse_reduction_percent": 44.5
        },
        "source": "mlr_metrics.json & MODEL_DOCUMENTATION.md"
    }


@app.post("/api/predict")
def predict_price(payload: ToyFeatureInput):
    """Predicts marketplace selling price in INR using the production ML ratio model."""
    if not pricing_engine.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Machine learning model is not available: {pricing_engine.load_error}"
        )

    try:
        prediction = pricing_engine.predict_marketplace_price(
            product_name=payload.product_name,
            length_cm=payload.length_cm,
            width_cm=payload.width_cm,
            height_cm=payload.height_cm,
            weight_g=payload.weight_g,
            set_quantity=payload.set_quantity,
            age_group=payload.age_group_months,
            mrp=payload.mrp,
            product_type=payload.product_type,
            material=payload.material
        )
        return {"success": True, "data": prediction}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post("/api/artisan-fair-price")
def calculate_artisan_price(payload: ArtisanCostInput):
    """Calculates fair artisan price and itemized production cost breakdown."""
    try:
        result = pricing_engine.calculate_artisan_fair_price(
            length_cm=payload.length_cm,
            width_cm=payload.width_cm,
            height_cm=payload.height_cm,
            weight_g=payload.weight_g,
            material=payload.material,
            set_quantity=payload.set_quantity,
            crafting_hours=payload.crafting_hours,
            hourly_wage=payload.hourly_wage,
            artisan_margin_percent=payload.artisan_margin_percent
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post("/api/price-analysis")
def full_price_analysis(payload: FullAnalysisInput):
    """
    Unified endpoint that predicts marketplace price, computes artisan fair price,
    and returns rich comparative market intelligence and fairness analysis.
    """
    if not pricing_engine.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Machine learning model is not available: {pricing_engine.load_error}"
        )

    try:
        # 1. Marketplace Prediction
        marketplace_pred = pricing_engine.predict_marketplace_price(
            product_name=payload.product_name,
            length_cm=payload.length_cm,
            width_cm=payload.width_cm,
            height_cm=payload.height_cm,
            weight_g=payload.weight_g,
            set_quantity=payload.set_quantity,
            age_group=payload.age_group_months,
            mrp=payload.mrp,
            product_type=payload.product_type,
            material=payload.material
        )

        # 2. Artisan Fair Price & Cost Breakdown
        artisan_calc = pricing_engine.calculate_artisan_fair_price(
            length_cm=payload.length_cm,
            width_cm=payload.width_cm,
            height_cm=payload.height_cm,
            weight_g=payload.weight_g,
            material=payload.material,
            set_quantity=payload.set_quantity or 1,
            crafting_hours=payload.crafting_hours,
            hourly_wage=payload.hourly_wage,
            artisan_margin_percent=payload.artisan_margin_percent
        )

        # 3. Comparative Intelligence
        fairness_eval = pricing_engine.analyze_fairness_and_market(
            predicted_marketplace_price=marketplace_pred["predicted_price_inr"],
            fair_artisan_price=artisan_calc["fair_artisan_price_inr"],
            reference_mrp=payload.mrp
        )

        return {
            "success": True,
            "marketplace_prediction": marketplace_pred,
            "artisan_fair_price": artisan_calc,
            "fairness_analysis": fairness_eval
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.get("/api/sample-toys")
def get_sample_toys():
    """Curated real samples from the Channapatna dataset for easy frontend testing."""
    samples = [
        {
            "product_name": "Channapatna Wooden Stacking Toy Rings",
            "product_type": "stacking toy",
            "material": "hale wood",
            "mrp": 550.0,
            "length_cm": 10.0,
            "width_cm": 10.0,
            "height_cm": 15.0,
            "weight_g": 180.0,
            "set_quantity": 1,
            "age_group_months": 12.0,
            "crafting_hours": 1.5,
            "description": "Classic 5-ring colored lathe-turned stacking toy with natural vegetable dyes"
        },
        {
            "product_name": "Traditional Wooden Rolling Push Rattle",
            "product_type": "baby rattle",
            "material": "hale wood",
            "mrp": 249.0,
            "length_cm": 8.0,
            "width_cm": 8.0,
            "height_cm": 12.0,
            "weight_g": 90.0,
            "set_quantity": 1,
            "age_group_months": 6.0,
            "crafting_hours": 0.8,
            "description": "Infant acoustic grasping rattle with smooth edges and non-toxic finish"
        },
        {
            "product_name": "Handcrafted Wooden Rocking Horse Toy",
            "product_type": "rocking toy",
            "material": "solid wood",
            "mrp": 2850.0,
            "length_cm": 45.0,
            "width_cm": 20.0,
            "height_cm": 40.0,
            "weight_g": 1200.0,
            "set_quantity": 1,
            "age_group_months": 36.0,
            "crafting_hours": 6.0,
            "description": "Large artisan heirloom rocking horse carved and polished on lathe"
        },
        {
            "product_name": "Channapatna Roly Poly Doll Toy",
            "product_type": "roly-poly toy",
            "material": "sustainably sourced hale wood",
            "mrp": 499.0,
            "length_cm": 7.0,
            "width_cm": 7.0,
            "height_cm": 14.0,
            "weight_g": 140.0,
            "set_quantity": 1,
            "age_group_months": 12.0,
            "crafting_hours": 1.25,
            "description": "Wobbly self-righting traditional Channapatna figurine doll"
        },
        {
            "product_name": "Indian Wooden Miniature Kitchen Cooking Set",
            "product_type": "pretend play",
            "material": "hale wood",
            "mrp": 999.0,
            "length_cm": 25.0,
            "width_cm": 18.0,
            "height_cm": 6.0,
            "weight_g": 350.0,
            "set_quantity": 12,
            "age_group_months": 36.0,
            "crafting_hours": 3.5,
            "description": "12-piece mini traditional Bhatukali cookware handcrafted set"
        }
    ]
    return {"samples": samples}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
