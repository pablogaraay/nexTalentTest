from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import uuid
import bcrypt
import jwt
import secrets
import random
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ.get("JWT_SECRET", "default_dev_secret_change_in_production_64chars")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
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

class JobSearchRequest(BaseModel):
    prompt: Optional[str] = None

class OfferCompareRequest(BaseModel):
    offer_ids: List[str]

class SkillsGapRequest(BaseModel):
    user_skills: List[str]
    target_role: str

# ── Auth Routes ──
@api_router.post("/auth/register")
async def register(body: AuthRegister):
    from starlette.responses import JSONResponse
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(body.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": body.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
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
    from starlette.responses import JSONResponse
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
    from starlette.responses import JSONResponse
    resp = JSONResponse(content={"message": "Logged out"})
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    return resp

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# ── MOCK DATA ──
MOCK_OFFERS = [
    {
        "id": "offer-001",
        "title": "Senior Frontend Developer",
        "company": "TechFlow",
        "location": "Madrid, Spain",
        "salary_range": "55.000 - 70.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 92,
        "skills": ["React", "TypeScript", "Node.js", "GraphQL", "CSS"],
        "description": "Buscamos un desarrollador frontend senior para liderar el desarrollo de nuestra plataforma SaaS. Trabajaras con React, TypeScript y GraphQL.",
        "posted_date": "2026-01-10",
        "experience_years": 5,
        "benefits": ["Seguro medico", "Trabajo remoto", "Formacion continua", "Stock options"]
    },
    {
        "id": "offer-002",
        "title": "Full Stack Engineer",
        "company": "DataVerse",
        "location": "Barcelona, Spain",
        "salary_range": "45.000 - 60.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 87,
        "skills": ["Python", "React", "PostgreSQL", "Docker", "AWS"],
        "description": "Unete a nuestro equipo para construir herramientas de analisis de datos de proxima generacion.",
        "posted_date": "2026-01-08",
        "experience_years": 3,
        "benefits": ["Horario flexible", "Seguro medico", "Bonus anual"]
    },
    {
        "id": "offer-003",
        "title": "Machine Learning Engineer",
        "company": "AI Solutions",
        "location": "Remote",
        "salary_range": "60.000 - 85.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 78,
        "skills": ["Python", "TensorFlow", "PyTorch", "MLOps", "SQL"],
        "description": "Buscamos un ingeniero ML para desarrollar modelos de procesamiento de lenguaje natural.",
        "posted_date": "2026-01-12",
        "experience_years": 4,
        "benefits": ["Seguro medico premium", "Trabajo 100% remoto", "Presupuesto formacion"]
    },
    {
        "id": "offer-004",
        "title": "Backend Developer",
        "company": "CloudBase",
        "location": "Valencia, Spain",
        "salary_range": "40.000 - 55.000 EUR",
        "type": "Full-time",
        "remote": False,
        "match_score": 85,
        "skills": ["Java", "Spring Boot", "Microservices", "Kubernetes", "MongoDB"],
        "description": "Desarrollador backend para arquitectura de microservicios en entorno cloud-native.",
        "posted_date": "2026-01-05",
        "experience_years": 3,
        "benefits": ["Comedor empresa", "Gimnasio", "Seguro medico"]
    },
    {
        "id": "offer-005",
        "title": "DevOps Engineer",
        "company": "InfraScale",
        "location": "Madrid, Spain",
        "salary_range": "50.000 - 70.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 72,
        "skills": ["AWS", "Terraform", "Docker", "Kubernetes", "CI/CD"],
        "description": "Ingeniero DevOps para automatizar y escalar nuestra infraestructura cloud.",
        "posted_date": "2026-01-14",
        "experience_years": 4,
        "benefits": ["Stock options", "Trabajo remoto", "Formacion certificaciones"]
    },
    {
        "id": "offer-006",
        "title": "Data Analyst",
        "company": "MetricsHub",
        "location": "Sevilla, Spain",
        "salary_range": "32.000 - 45.000 EUR",
        "type": "Full-time",
        "remote": False,
        "match_score": 68,
        "skills": ["SQL", "Python", "Tableau", "Excel", "Power BI"],
        "description": "Analista de datos para transformar datos en insights accionables para clientes.",
        "posted_date": "2026-01-11",
        "experience_years": 2,
        "benefits": ["Horario flexible", "Seguro medico"]
    },
    {
        "id": "offer-007",
        "title": "Product Manager - Tech",
        "company": "TechFlow",
        "location": "Madrid, Spain",
        "salary_range": "55.000 - 75.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 65,
        "skills": ["Agile", "Jira", "SQL", "Data Analysis", "UX Research"],
        "description": "Product Manager para liderar la estrategia de producto de nuestra plataforma B2B.",
        "posted_date": "2026-01-09",
        "experience_years": 5,
        "benefits": ["Bonus trimestral", "Seguro medico premium", "Trabajo remoto"]
    },
    {
        "id": "offer-008",
        "title": "UX/UI Designer",
        "company": "DesignLab",
        "location": "Barcelona, Spain",
        "salary_range": "35.000 - 50.000 EUR",
        "type": "Full-time",
        "remote": True,
        "match_score": 60,
        "skills": ["Figma", "Adobe XD", "User Research", "Prototyping", "Design Systems"],
        "description": "Disenador UX/UI para crear experiencias digitales excepcionales.",
        "posted_date": "2026-01-13",
        "experience_years": 3,
        "benefits": ["Material Apple", "Formacion continua", "Horario flexible"]
    }
]

MOCK_SKILLS_DEMAND = {
    "top_skills": [
        {"name": "Python", "demand": 89, "growth": 12, "category": "Programming"},
        {"name": "JavaScript", "demand": 85, "growth": 8, "category": "Programming"},
        {"name": "React", "demand": 82, "growth": 15, "category": "Framework"},
        {"name": "AWS", "demand": 78, "growth": 20, "category": "Cloud"},
        {"name": "SQL", "demand": 76, "growth": 5, "category": "Database"},
        {"name": "Docker", "demand": 74, "growth": 18, "category": "DevOps"},
        {"name": "TypeScript", "demand": 72, "growth": 25, "category": "Programming"},
        {"name": "Kubernetes", "demand": 68, "growth": 22, "category": "DevOps"},
        {"name": "Machine Learning", "demand": 65, "growth": 30, "category": "AI/ML"},
        {"name": "Node.js", "demand": 63, "growth": 10, "category": "Framework"},
        {"name": "Java", "demand": 60, "growth": -3, "category": "Programming"},
        {"name": "GraphQL", "demand": 55, "growth": 28, "category": "API"},
        {"name": "Terraform", "demand": 52, "growth": 35, "category": "DevOps"},
        {"name": "Go", "demand": 48, "growth": 40, "category": "Programming"},
        {"name": "Rust", "demand": 35, "growth": 55, "category": "Programming"}
    ],
    "by_category": [
        {"category": "Programming", "count": 340, "percentage": 35},
        {"category": "Framework", "count": 220, "percentage": 22},
        {"category": "Cloud", "count": 180, "percentage": 18},
        {"category": "DevOps", "count": 150, "percentage": 15},
        {"category": "AI/ML", "count": 100, "percentage": 10}
    ]
}

MOCK_ROLE_TRENDS = {
    "roles": [
        {
            "name": "Frontend Developer",
            "avg_salary": 48000,
            "demand_trend": [65, 68, 72, 75, 78, 82, 85, 87, 90, 92, 94, 95],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["React", "TypeScript", "CSS", "Next.js", "Vue.js"],
            "remote_percentage": 78,
            "growth_rate": 15
        },
        {
            "name": "Backend Developer",
            "avg_salary": 52000,
            "demand_trend": [70, 72, 71, 74, 76, 78, 80, 82, 83, 85, 86, 88],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Python", "Java", "Node.js", "Go", "SQL"],
            "remote_percentage": 72,
            "growth_rate": 12
        },
        {
            "name": "Data Scientist",
            "avg_salary": 58000,
            "demand_trend": [50, 55, 58, 62, 65, 70, 73, 78, 82, 85, 88, 92],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Python", "ML", "SQL", "TensorFlow", "Statistics"],
            "remote_percentage": 85,
            "growth_rate": 28
        },
        {
            "name": "DevOps Engineer",
            "avg_salary": 55000,
            "demand_trend": [45, 48, 52, 55, 60, 63, 68, 72, 75, 78, 82, 85],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
            "remote_percentage": 82,
            "growth_rate": 25
        },
        {
            "name": "Product Manager",
            "avg_salary": 60000,
            "demand_trend": [60, 62, 63, 65, 67, 68, 70, 71, 73, 74, 76, 78],
            "months": ["Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"],
            "top_skills": ["Agile", "Data Analysis", "UX", "SQL", "Strategy"],
            "remote_percentage": 70,
            "growth_rate": 10
        }
    ]
}

MOCK_COMPANIES = [
    {
        "name": "TechFlow",
        "sector": "SaaS / B2B",
        "employees": "200-500",
        "avg_salary": 58000,
        "open_positions": 12,
        "remote_percentage": 85,
        "rating": 4.5,
        "top_skills": ["React", "TypeScript", "Python", "AWS"],
        "benefits": ["Stock options", "Seguro medico premium", "Trabajo remoto", "Formacion continua"],
        "salary_distribution": [35000, 45000, 55000, 65000, 75000, 85000]
    },
    {
        "name": "DataVerse",
        "sector": "Big Data / Analytics",
        "employees": "100-200",
        "avg_salary": 52000,
        "open_positions": 8,
        "remote_percentage": 75,
        "rating": 4.2,
        "top_skills": ["Python", "Spark", "SQL", "Docker"],
        "benefits": ["Horario flexible", "Seguro medico", "Bonus anual", "Teletrabajo parcial"],
        "salary_distribution": [30000, 40000, 50000, 55000, 65000, 70000]
    },
    {
        "name": "AI Solutions",
        "sector": "Inteligencia Artificial",
        "employees": "50-100",
        "avg_salary": 62000,
        "open_positions": 6,
        "remote_percentage": 95,
        "rating": 4.7,
        "top_skills": ["Python", "TensorFlow", "PyTorch", "MLOps"],
        "benefits": ["100% remoto", "Presupuesto formacion", "Equipamiento premium", "Sabbatical"],
        "salary_distribution": [40000, 50000, 60000, 70000, 80000, 90000]
    },
    {
        "name": "CloudBase",
        "sector": "Cloud Infrastructure",
        "employees": "500-1000",
        "avg_salary": 50000,
        "open_positions": 15,
        "remote_percentage": 40,
        "rating": 3.9,
        "top_skills": ["Java", "Kubernetes", "MongoDB", "Microservices"],
        "benefits": ["Comedor empresa", "Gimnasio", "Seguro medico", "Plan pensiones"],
        "salary_distribution": [28000, 38000, 48000, 55000, 62000, 72000]
    },
    {
        "name": "InfraScale",
        "sector": "DevOps / Cloud",
        "employees": "100-200",
        "avg_salary": 56000,
        "open_positions": 5,
        "remote_percentage": 90,
        "rating": 4.4,
        "top_skills": ["AWS", "Terraform", "Docker", "CI/CD"],
        "benefits": ["Stock options", "Trabajo remoto", "Certificaciones pagadas"],
        "salary_distribution": [35000, 45000, 55000, 60000, 70000, 78000]
    }
]

# ── Job Search ──
@api_router.post("/jobs/search")
async def search_jobs(prompt: Optional[str] = Form(None), cv_file: Optional[UploadFile] = File(None)):
    if cv_file:
        content = await cv_file.read()
        # Mock: simulate parsing CV and matching
    offers = MOCK_OFFERS.copy()
    for offer in offers:
        offer["match_score"] = random.randint(55, 98)
    offers.sort(key=lambda x: x["match_score"], reverse=True)
    return {"offers": offers, "total": len(offers), "query": prompt or "CV uploaded"}

# ── Offer Comparison ──
@api_router.post("/offers/compare")
async def compare_offers(body: OfferCompareRequest):
    selected = [o for o in MOCK_OFFERS if o["id"] in body.offer_ids]
    if len(selected) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 offers to compare")
    return {"offers": selected}

# ── Skills Demand ──
@api_router.get("/skills/demand")
async def get_skills_demand():
    return MOCK_SKILLS_DEMAND

# ── Role Trends ──
@api_router.get("/trends/roles")
async def get_role_trends():
    return MOCK_ROLE_TRENDS

# ── Company Comparison ──
@api_router.get("/companies/compare")
async def get_companies():
    return {"companies": MOCK_COMPANIES}

# ── Skills Gap ──
@api_router.post("/skills/gap")
async def analyze_skills_gap(body: SkillsGapRequest):
    role_skills_map = {
        "Frontend Developer": {"required": ["React", "TypeScript", "CSS", "HTML", "JavaScript", "Next.js", "Testing", "Git", "Responsive Design", "Performance"], "weights": [95, 88, 85, 90, 92, 70, 75, 80, 82, 72]},
        "Backend Developer": {"required": ["Python", "Java", "SQL", "REST API", "Docker", "Git", "Testing", "Microservices", "Security", "Linux"], "weights": [90, 80, 88, 92, 78, 82, 75, 70, 72, 68]},
        "Data Scientist": {"required": ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow", "Data Viz", "Pandas", "Deep Learning", "NLP", "Big Data"], "weights": [95, 92, 85, 88, 78, 80, 82, 75, 70, 68]},
        "DevOps Engineer": {"required": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Python", "Monitoring", "Security", "Networking"], "weights": [92, 90, 85, 82, 88, 80, 72, 75, 78, 68]},
        "Full Stack Developer": {"required": ["React", "Node.js", "Python", "SQL", "Docker", "TypeScript", "Git", "REST API", "CSS", "Testing"], "weights": [90, 88, 85, 82, 75, 80, 78, 85, 72, 70]},
    }

    target = body.target_role
    user_skills_lower = [s.lower() for s in body.user_skills]
    role_data = role_skills_map.get(target, role_skills_map["Full Stack Developer"])

    gap_analysis = []
    for skill, weight in zip(role_data["required"], role_data["weights"]):
        has_skill = skill.lower() in user_skills_lower
        gap_analysis.append({
            "skill": skill,
            "importance": weight,
            "has_skill": has_skill,
            "gap_level": 0 if has_skill else weight
        })

    matched = sum(1 for g in gap_analysis if g["has_skill"])
    total = len(gap_analysis)
    coverage = round((matched / total) * 100) if total > 0 else 0

    missing = [g for g in gap_analysis if not g["has_skill"]]
    missing.sort(key=lambda x: x["importance"], reverse=True)

    recommendations = []
    for m in missing[:5]:
        recommendations.append({
            "skill": m["skill"],
            "priority": "Alta" if m["importance"] >= 85 else "Media" if m["importance"] >= 70 else "Baja",
            "reason": f"{m['skill']} es una competencia clave para {target} con una demanda del {m['importance']}%"
        })

    return {
        "target_role": target,
        "coverage_percentage": coverage,
        "matched_skills": matched,
        "total_required": total,
        "gap_analysis": gap_analysis,
        "recommendations": recommendations,
        "available_roles": list(role_skills_map.keys())
    }

@api_router.get("/skills/gap/roles")
async def get_available_roles():
    return {"roles": ["Frontend Developer", "Backend Developer", "Data Scientist", "DevOps Engineer", "Full Stack Developer"]}

# ── Health ──
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
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
