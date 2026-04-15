from dotenv import load_dotenv
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Add backend dir to path so multiagent can find config, dbConn
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
import json
import tempfile
import asyncio
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

# LangGraph multiagent
from multiagent import run_multiagent_flow

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
executor = ThreadPoolExecutor(max_workers=3)

def get_jwt_secret():
    return os.environ.get("JWT_SECRET", "default_dev_secret_change_in_production_64chars")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── Auth Models ──
class AuthRegister(BaseModel):
    email: str
    password: str
    name: str

class AuthLogin(BaseModel):
    email: str
    password: str

# ── Auth Routes ──
@api_router.post("/auth/register")
async def register(body: AuthRegister):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(body.password)
    user_doc = {
        "email": email, "password_hash": hashed, "name": body.name,
        "role": "user", "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    resp = JSONResponse(content={"id": user_id, "email": email, "name": body.name, "role": "user"})
    resp.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    resp.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return resp

@api_router.post("/auth/login")
async def login(body: AuthLogin):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    resp = JSONResponse(content={"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")})
    resp.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    resp.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return resp

@api_router.post("/auth/logout")
async def logout():
    resp = JSONResponse(content={"message": "Logged out"})
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    return resp

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

# ── LangGraph Integration ──

def _run_langgraph_sync(params: dict) -> dict:
    """Run the LangGraph flow synchronously (called in thread executor)."""
    return run_multiagent_flow(params=params)

@api_router.post("/search")
async def search_offers(
    profileText: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    topN: Optional[int] = Form(10)
):
    """
    Search for job offers matching a user profile.
    Accepts profileText (prompt) and/or cv (PDF file).
    Calls the LangGraph multiagent flow.
    """
    profile_text = (profileText or "").strip()
    cv_path = ""

    if cv and cv.filename:
        # Save uploaded CV to temp file
        suffix = Path(cv.filename).suffix or ".pdf"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir="/tmp")
        content = await cv.read()
        tmp.write(content)
        tmp.close()
        cv_path = tmp.name

    if not profile_text and not cv_path:
        raise HTTPException(
            status_code=400,
            detail="Debes enviar al menos un prompt de perfil o un archivo CV."
        )

    try:
        params = {
            "use_case": "search",
            "profile_text": profile_text,
            "cv_file": cv_path,
            "top_n": max(1, min(int(topN or 10), 50))
        }
        loop = asyncio.get_event_loop()
        payload = await loop.run_in_executor(executor, _run_langgraph_sync, params)

        if payload.get("error"):
            raise HTTPException(status_code=500, detail=payload["error"])

        return payload
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error en /search: {exc}")
        raise HTTPException(status_code=500, detail=f"Error en el flujo multiagente: {str(exc)}")
    finally:
        if cv_path:
            try:
                os.unlink(cv_path)
            except Exception:
                pass

@api_router.get("/insights")
async def get_market_insights(topN: int = 10):
    """
    Get market insights: top jobs and skills by demand.
    Calls the LangGraph multiagent flow with use_case='market_insights'.
    """
    safe_top_n = max(1, min(int(topN), 50))
    try:
        params = {
            "use_case": "market_insights",
            "top_n": safe_top_n
        }
        loop = asyncio.get_event_loop()
        payload = await loop.run_in_executor(executor, _run_langgraph_sync, params)

        if payload.get("error"):
            raise HTTPException(status_code=500, detail=payload["error"])

        return payload
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error en /insights: {exc}")
        raise HTTPException(status_code=500, detail=f"Error generando insights: {str(exc)}")

# ── MOCK ENDPOINTS (for pages not yet connected to LangGraph) ──

MOCK_ROLE_TRENDS = {
    "roles": [
        {
            "name": "Frontend Developer", "avg_salary": 48000,
            "demand_trend": [65, 68, 72, 75, 78, 82, 85, 87, 90, 92, 94, 95],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["React", "TypeScript", "CSS", "Next.js", "Vue.js"],
            "remote_percentage": 78, "growth_rate": 15
        },
        {
            "name": "Backend Developer", "avg_salary": 52000,
            "demand_trend": [70, 72, 71, 74, 76, 78, 80, 82, 83, 85, 86, 88],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Python", "Java", "Node.js", "Go", "SQL"],
            "remote_percentage": 72, "growth_rate": 12
        },
        {
            "name": "Data Scientist", "avg_salary": 58000,
            "demand_trend": [50, 55, 58, 62, 65, 70, 73, 78, 82, 85, 88, 92],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Python", "ML", "SQL", "TensorFlow", "Statistics"],
            "remote_percentage": 85, "growth_rate": 28
        },
        {
            "name": "DevOps Engineer", "avg_salary": 55000,
            "demand_trend": [45, 48, 52, 55, 60, 63, 68, 72, 75, 78, 82, 85],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
            "remote_percentage": 82, "growth_rate": 25
        },
        {
            "name": "Product Manager", "avg_salary": 60000,
            "demand_trend": [60, 62, 63, 65, 67, 68, 70, 71, 73, 74, 76, 78],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Agile", "Data Analysis", "UX", "SQL", "Strategy"],
            "remote_percentage": 70, "growth_rate": 10
        }
    ]
}

MOCK_COMPANIES = [
    {"name": "TechFlow", "sector": "SaaS / B2B", "employees": "200-500", "avg_salary": 58000, "open_positions": 12, "remote_percentage": 85, "rating": 4.5, "top_skills": ["React", "TypeScript", "Python", "AWS"], "benefits": ["Stock options", "Seguro medico premium", "Trabajo remoto", "Formacion continua"], "salary_distribution": [35000, 45000, 55000, 65000, 75000, 85000]},
    {"name": "DataVerse", "sector": "Big Data / Analytics", "employees": "100-200", "avg_salary": 52000, "open_positions": 8, "remote_percentage": 75, "rating": 4.2, "top_skills": ["Python", "Spark", "SQL", "Docker"], "benefits": ["Horario flexible", "Seguro medico", "Bonus anual", "Teletrabajo parcial"], "salary_distribution": [30000, 40000, 50000, 55000, 65000, 70000]},
    {"name": "AI Solutions", "sector": "Inteligencia Artificial", "employees": "50-100", "avg_salary": 62000, "open_positions": 6, "remote_percentage": 95, "rating": 4.7, "top_skills": ["Python", "TensorFlow", "PyTorch", "MLOps"], "benefits": ["100% remoto", "Presupuesto formacion", "Equipamiento premium", "Sabbatical"], "salary_distribution": [40000, 50000, 60000, 70000, 80000, 90000]},
    {"name": "CloudBase", "sector": "Cloud Infrastructure", "employees": "500-1000", "avg_salary": 50000, "open_positions": 15, "remote_percentage": 40, "rating": 3.9, "top_skills": ["Java", "Kubernetes", "MongoDB", "Microservices"], "benefits": ["Comedor empresa", "Gimnasio", "Seguro medico", "Plan pensiones"], "salary_distribution": [28000, 38000, 48000, 55000, 62000, 72000]},
    {"name": "InfraScale", "sector": "DevOps / Cloud", "employees": "100-200", "avg_salary": 56000, "open_positions": 5, "remote_percentage": 90, "rating": 4.4, "top_skills": ["AWS", "Terraform", "Docker", "CI/CD"], "benefits": ["Stock options", "Trabajo remoto", "Certificaciones pagadas"], "salary_distribution": [35000, 45000, 55000, 60000, 70000, 78000]},
]

@api_router.get("/trends/roles")
async def get_role_trends():
    return MOCK_ROLE_TRENDS

@api_router.get("/companies/compare")
async def get_companies():
    return {"companies": MOCK_COMPANIES}

@api_router.post("/skills/gap")
async def analyze_skills_gap(body: dict):
    user_skills = body.get("user_skills", [])
    target_role = body.get("target_role", "Full Stack Developer")
    role_skills_map = {
        "Frontend Developer": {"required": ["React", "TypeScript", "CSS", "HTML", "JavaScript", "Next.js", "Testing", "Git", "Responsive Design", "Performance"], "weights": [95, 88, 85, 90, 92, 70, 75, 80, 82, 72]},
        "Backend Developer": {"required": ["Python", "Java", "SQL", "REST API", "Docker", "Git", "Testing", "Microservices", "Security", "Linux"], "weights": [90, 80, 88, 92, 78, 82, 75, 70, 72, 68]},
        "Data Scientist": {"required": ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow", "Data Viz", "Pandas", "Deep Learning", "NLP", "Big Data"], "weights": [95, 92, 85, 88, 78, 80, 82, 75, 70, 68]},
        "DevOps Engineer": {"required": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Python", "Monitoring", "Security", "Networking"], "weights": [92, 90, 85, 82, 88, 80, 72, 75, 78, 68]},
        "Full Stack Developer": {"required": ["React", "Node.js", "Python", "SQL", "Docker", "TypeScript", "Git", "REST API", "CSS", "Testing"], "weights": [90, 88, 85, 82, 75, 80, 78, 85, 72, 70]},
    }
    user_skills_lower = [s.lower() for s in user_skills]
    role_data = role_skills_map.get(target_role, role_skills_map["Full Stack Developer"])
    gap_analysis = []
    for skill, weight in zip(role_data["required"], role_data["weights"]):
        has_skill = skill.lower() in user_skills_lower
        gap_analysis.append({"skill": skill, "importance": weight, "has_skill": has_skill, "gap_level": 0 if has_skill else weight})
    matched = sum(1 for g in gap_analysis if g["has_skill"])
    total = len(gap_analysis)
    coverage = round((matched / total) * 100) if total > 0 else 0
    missing = sorted([g for g in gap_analysis if not g["has_skill"]], key=lambda x: x["importance"], reverse=True)
    recommendations = [{"skill": m["skill"], "priority": "Alta" if m["importance"] >= 85 else "Media" if m["importance"] >= 70 else "Baja", "reason": f"{m['skill']} es clave para {target_role} ({m['importance']}%)"} for m in missing[:5]]
    return {"target_role": target_role, "coverage_percentage": coverage, "matched_skills": matched, "total_required": total, "gap_analysis": gap_analysis, "recommendations": recommendations, "available_roles": list(role_skills_map.keys())}

@api_router.get("/skills/gap/roles")
async def get_available_roles():
    return {"roles": ["Frontend Developer", "Backend Developer", "Data Scientist", "DevOps Engineer", "Full Stack Developer"]}

@api_router.get("/")
async def root():
    return {"message": "nexTalent API running"}

# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
