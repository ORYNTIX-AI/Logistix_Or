from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date
import bcrypt
from jose import JWTError, jwt
from datetime import timedelta
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL connection
database_url = os.environ['DATABASE_URL']
db_pool = None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = "cargo_platform_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Admin credentials (hardcoded for MVP)
ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "admin123"

# Models
class ContainerType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    size: str  # 20ft, 40ft, 40ft HC
    capacity_m3: float
    max_weight_kg: int
    description: str
    price_modifier: float = 1.0

class CargoType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    special_requirements: List[str] = []

class Port(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    country: str
    city: str
    transport_types: List[str] = ["Море", "ЖД", "Авиа"]  # Available transport types

class SearchQuery(BaseModel):
    origin_port: str
    destination_port: str
    departure_date_from: date
    departure_date_to: date
    container_type: str
    is_dangerous_cargo: bool = False  # Changed to boolean checkbox
    containers_count: int = 1
    cargo_weight_kg: Optional[int] = None
    cargo_volume_m3: Optional[int] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WebhookSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_url: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegistration(BaseModel):
    email: str

class ShippingRoute(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    origin_port: str
    destination_port: str
    transport_type: str = "Море"
    carrier: str
    transit_time_days: int
    base_price_usd: float
    available_container_types: List[str]
    frequency: str  # Daily, Weekly, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SearchResult(BaseModel):
    id: str
    origin_port: str
    destination_port: str
    carrier: str
    departure_date_range: str
    delivery_date_range: str
    transit_time_days: int
    container_type: str
    price_from_usd: float
    available_containers: int
    booking_deadline: date

class AdminLogin(BaseModel):
    login: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Auth functions
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_LOGIN:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return username

# Database connection and initialization
async def get_db_pool():
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(database_url, min_size=10, max_size=20)
    return db_pool

async def init_database():
    """Initialize PostgreSQL database with tables and sample data"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Create tables
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS ports (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                code VARCHAR NOT NULL,
                country VARCHAR NOT NULL,
                city VARCHAR NOT NULL,
                transport_types JSONB NOT NULL DEFAULT '["Море", "ЖД", "Авиа"]'
            )
        ''')
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS container_types (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                size VARCHAR NOT NULL,
                capacity_m3 FLOAT NOT NULL,
                max_weight_kg INTEGER NOT NULL,
                description VARCHAR NOT NULL,
                price_modifier FLOAT DEFAULT 1.0
            )
        ''')
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS cargo_types (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                description VARCHAR NOT NULL,
                special_requirements JSONB DEFAULT '[]'
            )
        ''')
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS shipping_routes (
                id VARCHAR PRIMARY KEY,
                origin_port VARCHAR NOT NULL,
                destination_port VARCHAR NOT NULL,
                transport_type VARCHAR DEFAULT 'Море',
                carrier VARCHAR NOT NULL,
                transit_time_days INTEGER NOT NULL,
                base_price_usd FLOAT NOT NULL,
                available_container_types JSONB NOT NULL,
                frequency VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY,
                email VARCHAR UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS webhook_settings (
                id VARCHAR PRIMARY KEY,
                webhook_url VARCHAR NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')

# Initialize default data
@app.on_event("startup")
async def startup_event():
    # Initialize database
    await init_database()
    # Always refresh data for development
    await refresh_sample_data()

async def refresh_sample_data():
    """Clear existing data and populate with sample data"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Clear existing data
        await conn.execute('DELETE FROM ports')
        await conn.execute('DELETE FROM container_types')
        await conn.execute('DELETE FROM cargo_types')
        await conn.execute('DELETE FROM shipping_routes')
        
        # Initialize default container types (only 2 types)
        default_containers = [
            {
                "id": str(uuid.uuid4()),
                "name": "20ft",
                "size": "20ft", 
                "capacity_m3": 33.2,
                "max_weight_kg": 28000,
                "description": "Стандартный контейнер 20 футов",
                "price_modifier": 1.0
            },
            {
                "id": str(uuid.uuid4()),
                "name": "40ft",
                "size": "40ft",
                "capacity_m3": 67.7,
                "max_weight_kg": 28000,
                "description": "Стандартный контейнер 40 футов",
                "price_modifier": 1.0
            }
        ]
        
        for container in default_containers:
            await conn.execute('''
                INSERT INTO container_types (id, name, size, capacity_m3, max_weight_kg, description, price_modifier)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            ''', container["id"], container["name"], container["size"], container["capacity_m3"], 
            container["max_weight_kg"], container["description"], container["price_modifier"])
        
        # Initialize cargo types (simplified to dangerous/safe)
        default_cargo_types = [
            {
                "id": str(uuid.uuid4()),
                "name": "Неопасный груз",
                "description": "Стандартный груз без опасных свойств",
                "special_requirements": []
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Опасный груз",
                "description": "Груз, требующий специальных разрешений",
                "special_requirements": ["Опасный груз", "Специальные разрешения", "Сертификаты"]
            }
        ]
        
        for cargo_type in default_cargo_types:
            await conn.execute('''
                INSERT INTO cargo_types (id, name, description, special_requirements)
                VALUES ($1, $2, $3, $4)
            ''', cargo_type["id"], cargo_type["name"], cargo_type["description"], 
            json.dumps(cargo_type["special_requirements"]))
        
        # Initialize ports and railway stations (160+ stations)
        default_ports = [
            # Российские порты и ж/д станции
            {"name": "Санкт-Петербург", "code": "LED", "country": "Россия", "city": "Санкт-Петербург", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Новороссийск", "code": "NVS", "country": "Россия", "city": "Новороссийск", "transport_types": ["Море", "ЖД"]},
            {"name": "Калининград", "code": "KGD", "country": "Россия", "city": "Калининград", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Владивосток", "code": "VVO", "country": "Россия", "city": "Владивосток", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Мурманск", "code": "MMK", "country": "Россия", "city": "Мурманск", "transport_types": ["Море"]},
            {"name": "Архангельск", "code": "ARH", "country": "Россия", "city": "Архангельск", "transport_types": ["Море"]},
            {"name": "Москва", "code": "SVO", "country": "Россия", "city": "Москва", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Екатеринбург", "code": "SVX", "country": "Россия", "city": "Екатеринбург", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Новосибирск", "code": "OVB", "country": "Россия", "city": "Новосибирск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Красноярск", "code": "KJA", "country": "Россия", "city": "Красноярск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Иркутск", "code": "IKT", "country": "Россия", "city": "Иркутск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Хабаровск", "code": "KHV", "country": "Россия", "city": "Хабаровск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Челябинск", "code": "CEK", "country": "Россия", "city": "Челябинск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Омск", "code": "OMS", "country": "Россия", "city": "Омск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Селятино", "code": "SEL", "country": "Россия", "city": "Селятино", "transport_types": ["ЖД"]},
            {"name": "Кунцево-2", "code": "KUN", "country": "Россия", "city": "Кунцево", "transport_types": ["ЖД"]},
            {"name": "Белый Раст", "code": "BRZ", "country": "Россия", "city": "Белый Раст", "transport_types": ["ЖД"]},
            {"name": "Восточный", "code": "VST", "country": "Россия", "city": "Восточный", "transport_types": ["Море", "ЖД"]},
            
            # Страны СНГ
            {"name": "Одесса", "code": "ODS", "country": "Украина", "city": "Одесса", "transport_types": ["Море", "ЖД"]},
            {"name": "Киев", "code": "KBP", "country": "Украина", "city": "Киев", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Харьков", "code": "HRK", "country": "Украина", "city": "Харьков", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Днепр", "code": "DNK", "country": "Украина", "city": "Днепр", "transport_types": ["ЖД", "Авиа"]},
            
            {"name": "Актау", "code": "SCO", "country": "Казахстан", "city": "Актау", "transport_types": ["Море", "ЖД"]},
            {"name": "Алматы", "code": "ALA", "country": "Казахстан", "city": "Алматы", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Нур-Султан", "code": "NQZ", "country": "Казахстан", "city": "Нур-Султан", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Хоргос", "code": "KHG", "country": "Казахстан", "city": "Хоргос", "transport_types": ["ЖД"]},
            {"name": "Достык", "code": "DOS", "country": "Казахстан", "city": "Достык", "transport_types": ["ЖД"]},
            {"name": "Алтынколь", "code": "ALT", "country": "Казахстан", "city": "Алтынколь", "transport_types": ["ЖД"]},
            {"name": "Шымкент", "code": "CIT", "country": "Казахстан", "city": "Шымкент", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Караганда", "code": "KGF", "country": "Казахстан", "city": "Караганда", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Атырау", "code": "GUW", "country": "Казахстан", "city": "Атырау", "transport_types": ["ЖД", "Авиа"]},
            
            {"name": "Минск", "code": "MSQ", "country": "Беларусь", "city": "Минск", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Брест", "code": "BQT", "country": "Беларусь", "city": "Брест", "transport_types": ["ЖД"]},
            {"name": "Гомель", "code": "GME", "country": "Беларусь", "city": "Гомель", "transport_types": ["ЖД"]},
            {"name": "Витебск", "code": "VTB", "country": "Беларусь", "city": "Витебск", "transport_types": ["ЖД"]},
            {"name": "Гродно", "code": "GNA", "country": "Беларусь", "city": "Гродно", "transport_types": ["ЖД"]},
            {"name": "Могилев", "code": "MVQ", "country": "Беларусь", "city": "Могилев", "transport_types": ["ЖД"]},
            
            {"name": "Батуми", "code": "BUS", "country": "Грузия", "city": "Батуми", "transport_types": ["Море", "ЖД"]},
            {"name": "Поти", "code": "POT", "country": "Грузия", "city": "Поти", "transport_types": ["Море"]},
            {"name": "Тбилиси", "code": "TBS", "country": "Грузия", "city": "Тбилиси", "transport_types": ["ЖД", "Авиа"]},
            
            {"name": "Баку", "code": "BAK", "country": "Азербайджан", "city": "Баку", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Сумгаит", "code": "SMG", "country": "Азербайджан", "city": "Сумгаит", "transport_types": ["ЖД"]},
            
            {"name": "Ташкент", "code": "TAS", "country": "Узбекистан", "city": "Ташкент", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Самарканд", "code": "SKD", "country": "Узбекистан", "city": "Самарканд", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Андижан", "code": "AZN", "country": "Узбекистан", "city": "Андижан", "transport_types": ["ЖД"]},
            {"name": "Фергана", "code": "FEG", "country": "Узбекистан", "city": "Фергана", "transport_types": ["ЖД"]},
            {"name": "Бухара", "code": "BHK", "country": "Узбекистан", "city": "Бухара", "transport_types": ["ЖД"]},
            {"name": "Хива", "code": "UGC", "country": "Узбекистан", "city": "Хива", "transport_types": ["ЖД"]},
            
            {"name": "Кишинев", "code": "KIV", "country": "Молдова", "city": "Кишинев", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Унгены", "code": "UNG", "country": "Молдова", "city": "Унгены", "transport_types": ["ЖД"]},
            
            {"name": "Бишкек", "code": "FRU", "country": "Кыргызстан", "city": "Бишкек", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Ош", "code": "OSS", "country": "Кыргызстан", "city": "Ош", "transport_types": ["ЖД", "Авиа"]},
            
            {"name": "Душанбе", "code": "DYU", "country": "Таджикистан", "city": "Душанбе", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Худжанд", "code": "LBD", "country": "Таджикистан", "city": "Худжанд", "transport_types": ["ЖД"]},
            
            {"name": "Ашхабад", "code": "ASB", "country": "Туркменистан", "city": "Ашхабад", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Туркменабад", "code": "CRZ", "country": "Туркменистан", "city": "Туркменабад", "transport_types": ["ЖД"]},
            {"name": "Туркменбаши", "code": "KRW", "country": "Туркменистан", "city": "Туркменбаши", "transport_types": ["Море", "ЖД"]},
            
            {"name": "Ереван", "code": "EVN", "country": "Армения", "city": "Ереван", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Гюмри", "code": "LWN", "country": "Армения", "city": "Гюмри", "transport_types": ["ЖД"]},
            
            # Китайские железнодорожные станции и терминалы
            {"name": "Шанхай", "code": "SHA", "country": "Китай", "city": "Шанхай", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Чэнду", "code": "CTU", "country": "Китай", "city": "Чэнду", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Шэньчжэнь", "code": "SZX", "country": "Китай", "city": "Шэньчжэнь", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Гуанчжоу", "code": "CAN", "country": "Китай", "city": "Гуанчжоу", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Тяньцзинь", "code": "TSN", "country": "Китай", "city": "Тяньцзинь", "transport_types": ["Море", "ЖД"]},
            {"name": "Далянь", "code": "DLC", "country": "Китай", "city": "Далянь", "transport_types": ["Море", "ЖД"]},
            {"name": "Циндао", "code": "TAO", "country": "Китай", "city": "Циндао", "transport_types": ["Море"]},
            {"name": "Нинбо", "code": "NGB", "country": "Китай", "city": "Нинбо", "transport_types": ["Море"]},
            {"name": "Сямынь", "code": "XMN", "country": "Китай", "city": "Сямынь", "transport_types": ["Море", "Авиа"]},
            {"name": "Урумчи", "code": "URC", "country": "Китай", "city": "Урумчи", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Пекин", "code": "PEK", "country": "Китай", "city": "Пекин", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Иу", "code": "YIW", "country": "Китай", "city": "Иу", "transport_types": ["ЖД"]},
            {"name": "Сиань", "code": "SIA", "country": "Китай", "city": "Сиань", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Ухань", "code": "WUH", "country": "Китай", "city": "Ухань", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Чунцин", "code": "CKG", "country": "Китай", "city": "Чунцин", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Алашанькоу", "code": "ALA", "country": "Китай", "city": "Алашанькоу", "transport_types": ["ЖД"]},
            {"name": "Эренхот", "code": "ERE", "country": "Китай", "city": "Эренхот", "transport_types": ["ЖД"]},
            {"name": "Маньчжоули", "code": "NZH", "country": "Китай", "city": "Маньчжоули", "transport_types": ["ЖД"]},
            {"name": "Суйфэньхэ", "code": "SUI", "country": "Китай", "city": "Суйфэньхэ", "transport_types": ["ЖД"]},
            {"name": "Харбин", "code": "HRB", "country": "Китай", "city": "Харбин", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Чанчунь", "code": "CGQ", "country": "Китай", "city": "Чанчунь", "transport_types": ["ЖД", "Авиа"]},
            {"name": "Шэньян", "code": "SHE", "country": "Китай", "city": "Шэньян", "transport_types": ["ЖД", "Авиа"]},
            
            # Европейские порты
            {"name": "Гамбург", "code": "HAM", "country": "Германия", "city": "Гамбург", "transport_types": ["Море", "ЖД"]},
            {"name": "Роттердам", "code": "RTM", "country": "Нидерланды", "city": "Роттердам", "transport_types": ["Море"]},
            {"name": "Антверпен", "code": "ANR", "country": "Бельгия", "city": "Антверпен", "transport_types": ["Море"]},
            {"name": "Феликстоу", "code": "FXT", "country": "Великобритания", "city": "Феликстоу", "transport_types": ["Море"]},
            {"name": "Стамбул", "code": "IST", "country": "Турция", "city": "Стамбул", "transport_types": ["Море", "ЖД", "Авиа"]},
            {"name": "Дуйсбург", "code": "DUI", "country": "Германия", "city": "Дуйсбург", "transport_types": ["ЖД"]},
            {"name": "Мальашевиче", "code": "MAL", "country": "Польша", "city": "Мальашевиче", "transport_types": ["ЖД"]},
            {"name": "Варшава", "code": "WAW", "country": "Польша", "city": "Варшава", "transport_types": ["ЖД", "Авиа"]},
        ]
        
        for port in default_ports:
            port_id = str(uuid.uuid4())
            await conn.execute('''
                INSERT INTO ports (id, name, code, country, city, transport_types)
                VALUES ($1, $2, $3, $4, $5, $6)
            ''', port_id, port["name"], port["code"], port["country"], port["city"], 
            json.dumps(port["transport_types"]))

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@api_router.get("/")
async def health_check():
    return {"message": "CargoSearch API - Платформа поиска контейнерных перевозок"}

# Container types endpoint
@api_router.get("/container-types")
async def get_container_types():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM container_types')
        return [dict(row) for row in rows]

# Cargo types endpoint  
@api_router.get("/cargo-types")
async def get_cargo_types():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM cargo_types')
        results = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON special_requirements
            if row_dict['special_requirements']:
                row_dict['special_requirements'] = json.loads(row_dict['special_requirements'])
            results.append(row_dict)
        return results

# Ports endpoint
@api_router.get("/ports")
async def get_ports():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM ports ORDER BY name')
        results = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON transport_types
            if row_dict['transport_types']:
                row_dict['transport_types'] = json.loads(row_dict['transport_types'])
            results.append(row_dict)
        return results

# Search endpoint
@api_router.post("/search")
async def search_shipments(query: SearchQuery):
    print(f"🔍 DEBUG: Received search query: {query}")
    
    # Get webhook settings
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        webhook_row = await conn.fetchrow('SELECT webhook_url FROM webhook_settings LIMIT 1')
        webhook_url = webhook_row['webhook_url'] if webhook_row else "https://beautechflow.store/webhook/search"
    
    # Convert our data format to webhook API format
    # Map container type to size number
    container_size_map = {
        "20ft": "20",
        "40ft": "40"
    }
    
    # Convert port codes to city names for webhook API
    # Find port info by code to get city name
    async with pool.acquire() as conn:
        origin_port_row = await conn.fetchrow('SELECT city FROM ports WHERE code = $1', query.origin_port)
        dest_port_row = await conn.fetchrow('SELECT city FROM ports WHERE code = $1', query.destination_port)
    
    origin_city = origin_port_row['city'] if origin_port_row else query.origin_port
    dest_city = dest_port_row['city'] if dest_port_row else query.destination_port
    
    # Map city names to webhook expected format
    city_mapping = {
        "Чэнду": "Chengdu",
        "Гуанчжоу": "Guangzhou", 
        "Шанхай": "Shanghai",
        "Шэньчжэнь": "Shenzhen",
        "Пекин": "Beijing",
        "Минск": "Minsk",
        "Москва": "Moscow",
        "Санкт-Петербург": "Saint Petersburg",
        "Алматы": "Almaty",
        "Ташкент": "Tashkent"
    }
    
    webhook_from = city_mapping.get(origin_city, origin_city)
    webhook_to = city_mapping.get(dest_city, dest_city)
    
    webhook_params = {
        "from": webhook_from,  # Send mapped city name for webhook
        "to": webhook_to,  # Send mapped city name for webhook  
        "container_size": container_size_map.get(query.container_type, "20"),
        "price": "5100",  # Base price for filtering
        "ETD": query.departure_date_from.isoformat(),
        "TT": "35"  # Default transit time
    }
    
    print(f"🌐 DEBUG: Sending to webhook: {webhook_url} with params: {webhook_params}")
    
    try:
        # Send GET request to webhook with query parameters
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(webhook_url, params=webhook_params, timeout=30)
            print(f"📡 DEBUG: Webhook response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    webhook_data = response.json()
                    print(f"📊 DEBUG: Webhook returned: {webhook_data}")
                    
                    # Convert webhook format to our format
                    results = []
                    if "result" in webhook_data and isinstance(webhook_data["result"], list):
                        for item in webhook_data["result"]:
                            # Convert webhook result to our SearchResult format
                            result = {
                                "id": item.get("id", str(uuid.uuid4())),
                                "origin_port": item.get("from", query.origin_port),
                                "destination_port": item.get("to", query.destination_port),
                                "carrier": "Railway Express",  # Default carrier
                                "departure_date_range": f"{query.departure_date_from.strftime('%d.%m')} - {query.departure_date_to.strftime('%d.%m.%Y')}",
                                "transit_time_days": item.get("TT") or 15,
                                "container_type": query.container_type,
                                "price_from_usd": float(item.get("price", 0)),
                                "is_dangerous_cargo": query.is_dangerous_cargo,
                                "available_containers": 5,
                                "booking_deadline": query.departure_date_from.isoformat(),
                                "webhook_success": True
                            }
                            results.append(result)
                    
                    if results:
                        return results
                    else:
                        # If no results from webhook, raise exception to trigger fallback
                        raise Exception("No results from webhook")
                        
                except Exception as e:
                    print(f"❌ DEBUG: Error processing webhook response: {e}")
                    # Fall through to fallback
                    raise Exception(f"Webhook response processing error: {e}")
            else:
                # If webhook is not available, trigger fallback
                raise Exception(f"Webhook returned status {response.status_code}")
                
    except Exception as e:
        print(f"⚠️ DEBUG: Webhook failed, using fallback data: {e}")
        # Fallback to mock data if webhook fails
        fallback_results = []
        
        # Generate different routes based on popular railway directions
        routes_data = [
            {"carrier": "China Railways Express", "base_price": 4750, "transit_days": 15, "route_desc": "Популярный маршрут"},
            {"carrier": "New Silk Road Express", "base_price": 4700, "transit_days": 18, "route_desc": "Прямое сообщение"},
            {"carrier": "RZD Logistics", "base_price": 5200, "transit_days": 12, "route_desc": "Быстрая доставка"}
        ]
        
        for i, route in enumerate(routes_data):
            # Add price variation for dangerous cargo
            price = route["base_price"]
            if query.is_dangerous_cargo:
                price = int(price * 1.3)  # 30% markup for dangerous cargo
                
            # Add volume discount for multiple containers
            if query.containers_count > 1:
                price = int(price * 0.95 * query.containers_count)  # 5% discount per container
            
            fallback_results.append({
                "id": str(uuid.uuid4()),
                "origin_port": query.origin_port,
                "destination_port": query.destination_port,
                "carrier": route["carrier"],
                "departure_date_range": f"{query.departure_date_from.strftime('%d.%m')} - {query.departure_date_to.strftime('%d.%m.%Y')}",
                "transit_time_days": route["transit_days"],
                "container_type": query.container_type,
                "price_from_usd": float(price),
                "is_dangerous_cargo": query.is_dangerous_cargo,
                "available_containers": 5 + i,
                "booking_deadline": query.departure_date_from.isoformat(),
                "webhook_error": "Тестовые данные (webhook недоступен)"
            })
            
        return fallback_results

# User registration
@api_router.post("/register")
async def register_user(user_data: UserRegistration):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if user already exists
        existing_user = await conn.fetchrow('SELECT id FROM users WHERE email = $1', user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        user_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO users (id, email, created_at)
            VALUES ($1, $2, NOW())
        ''', user_id, user_data.email)
        
        return {"message": "User registered successfully", "user_id": user_id}

# Admin login
@api_router.post("/admin/login", response_model=Token)
async def admin_login(form_data: AdminLogin):
    if form_data.login != ADMIN_LOGIN or form_data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect login or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": ADMIN_LOGIN}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Admin webhook settings
@api_router.get("/admin/webhook", response_model=dict)
async def get_webhook_settings(current_admin: str = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        settings = await conn.fetchrow('SELECT webhook_url FROM webhook_settings LIMIT 1')
        if not settings:
            return {"webhook_url": "https://beautechflow.store/webhook/search"}
        return {"webhook_url": settings['webhook_url']}

@api_router.post("/admin/webhook")
async def update_webhook_settings(webhook_url: dict, current_admin: str = Depends(get_current_admin)):
    url = webhook_url.get("webhook_url", "")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL is required")
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Delete old settings and insert new
        await conn.execute('DELETE FROM webhook_settings')
        webhook_id = str(uuid.uuid4())
        await conn.execute('''
            INSERT INTO webhook_settings (id, webhook_url, updated_at)
            VALUES ($1, $2, NOW())
        ''', webhook_id, url)
    
    return {"message": "Webhook URL updated successfully"}

# Admin container types
@api_router.get("/admin/container-types")
async def get_admin_container_types(current_admin: str = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM container_types ORDER BY name')
        return [dict(row) for row in rows]

@api_router.delete("/admin/container-types/{container_id}")
async def delete_container_type(container_id: str, current_admin: str = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM container_types WHERE id = $1', container_id)
        if result == 'DELETE 0':
            raise HTTPException(status_code=404, detail="Container type not found")
    return {"message": "Container type deleted"}

# Admin routes
@api_router.get("/admin/routes")
async def get_admin_routes(current_admin: str = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM shipping_routes ORDER BY origin_port, destination_port')
        results = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON available_container_types
            if row_dict['available_container_types']:
                row_dict['available_container_types'] = json.loads(row_dict['available_container_types'])
            results.append(row_dict)
        return results

@api_router.delete("/admin/routes/{route_id}")
async def delete_route(route_id: str, current_admin: str = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM shipping_routes WHERE id = $1', route_id)
        if result == 'DELETE 0':
            raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}

# Add the API router to the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)