from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# Initialize default data
@app.on_event("startup")
async def startup_event():
    # Always refresh data for development
    await refresh_sample_data()

async def refresh_sample_data():
    # Clear existing data
    await db.ports.delete_many({})
    await db.container_types.delete_many({})
    await db.cargo_types.delete_many({})
    await db.shipping_routes.delete_many({})
    
    # Initialize default container types (only 2 types)
    default_containers = [
        ContainerType(name="20ft", size="20ft", capacity_m3=33.2, max_weight_kg=28000, 
                     description="Стандартный контейнер 20 футов"),
        ContainerType(name="40ft", size="40ft", capacity_m3=67.7, max_weight_kg=28000,
                     description="Стандартный контейнер 40 футов")
    ]
    
    for container in default_containers:
        await db.container_types.insert_one(container.dict())
    
    # Initialize cargo types (simplified to dangerous/safe)
    default_cargo_types = [
        CargoType(name="Неопасный груз", description="Стандартный груз без опасных свойств"),
        CargoType(name="Опасный груз", description="Груз, требующий специальных разрешений",
                 special_requirements=["Опасный груз", "Специальные разрешения", "Сертификаты"])
    ]
    
    for cargo_type in default_cargo_types:
        await db.cargo_types.insert_one(cargo_type.dict())
    
    # Initialize ports and railway stations
    default_ports = [
        # Российские порты и ж/д станции
        Port(name="Санкт-Петербург", code="LED", country="Россия", city="Санкт-Петербург", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Новороссийск", code="NVS", country="Россия", city="Новороссийск", transport_types=["Море", "ЖД"]),
        Port(name="Калининград", code="KGD", country="Россия", city="Калининград", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Владивосток", code="VVO", country="Россия", city="Владивосток", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Мурманск", code="MMK", country="Россия", city="Мурманск", transport_types=["Море"]),
        Port(name="Архангельск", code="ARH", country="Россия", city="Архангельск", transport_types=["Море"]),
        Port(name="Москва", code="SVO", country="Россия", city="Москва", transport_types=["ЖД", "Авиа"]),
        Port(name="Екатеринбург", code="SVX", country="Россия", city="Екатеринбург", transport_types=["ЖД", "Авиа"]),
        Port(name="Новосибирск", code="OVB", country="Россия", city="Новосибирск", transport_types=["ЖД", "Авиа"]),
        Port(name="Красноярск", code="KJA", country="Россия", city="Красноярск", transport_types=["ЖД", "Авиа"]),
        Port(name="Иркутск", code="IKT", country="Россия", city="Иркутск", transport_types=["ЖД", "Авиа"]),
        Port(name="Хабаровск", code="KHV", country="Россия", city="Хабаровск", transport_types=["ЖД", "Авиа"]),
        Port(name="Челябинск", code="CEK", country="Россия", city="Челябинск", transport_types=["ЖД", "Авиа"]),
        Port(name="Омск", code="OMS", country="Россия", city="Омск", transport_types=["ЖД", "Авиа"]),
        Port(name="Селятино", code="SEL", country="Россия", city="Селятино", transport_types=["ЖД"]),
        Port(name="Кунцево-2", code="KUN", country="Россия", city="Кунцево", transport_types=["ЖД"]),
        Port(name="Белый Раст", code="BRZ", country="Россия", city="Белый Раст", transport_types=["ЖД"]),
        Port(name="Восточный", code="VST", country="Россия", city="Восточный", transport_types=["Море", "ЖД"]),
        
        # Страны СНГ
        Port(name="Одесса", code="ODS", country="Украина", city="Одесса", transport_types=["Море", "ЖД"]),
        Port(name="Киев", code="KBP", country="Украина", city="Киев", transport_types=["ЖД", "Авиа"]),
        Port(name="Харьков", code="HRK", country="Украина", city="Харьков", transport_types=["ЖД", "Авиа"]),
        Port(name="Днепр", code="DNK", country="Украина", city="Днепр", transport_types=["ЖД", "Авиа"]),
        
        Port(name="Актау", code="SCO", country="Казахстан", city="Актау", transport_types=["Море", "ЖД"]),
        Port(name="Алматы", code="ALA", country="Казахстан", city="Алматы", transport_types=["ЖД", "Авиа"]),
        Port(name="Нур-Султан", code="NQZ", country="Казахстан", city="Нур-Султан", transport_types=["ЖД", "Авиа"]),
        Port(name="Хоргос", code="KHG", country="Казахстан", city="Хоргос", transport_types=["ЖД"]),
        Port(name="Достык", code="DOS", country="Казахстан", city="Достык", transport_types=["ЖД"]),
        Port(name="Алтынколь", code="ALT", country="Казахстан", city="Алтынколь", transport_types=["ЖД"]),
        Port(name="Шымкент", code="CIT", country="Казахстан", city="Шымкент", transport_types=["ЖД", "Авиа"]),
        Port(name="Караганда", code="KGF", country="Казахстан", city="Караганда", transport_types=["ЖД", "Авиа"]),
        Port(name="Атырау", code="GUW", country="Казахстан", city="Атырау", transport_types=["ЖД", "Авиа"]),
        
        Port(name="Минск", code="MSQ", country="Беларусь", city="Минск", transport_types=["ЖД", "Авиа"]),
        Port(name="Брест", code="BQT", country="Беларусь", city="Брест", transport_types=["ЖД"]),
        Port(name="Гомель", code="GME", country="Беларусь", city="Гомель", transport_types=["ЖД"]),
        Port(name="Витебск", code="VTB", country="Беларусь", city="Витебск", transport_types=["ЖД"]),
        Port(name="Гродно", code="GNA", country="Беларусь", city="Гродно", transport_types=["ЖД"]),
        Port(name="Могилев", code="MVQ", country="Беларусь", city="Могилев", transport_types=["ЖД"]),
        
        Port(name="Батуми", code="BUS", country="Грузия", city="Батуми", transport_types=["Море", "ЖД"]),
        Port(name="Поти", code="POT", country="Грузия", city="Поти", transport_types=["Море"]),
        Port(name="Тбилиси", code="TBS", country="Грузия", city="Тбилиси", transport_types=["ЖД", "Авиа"]),
        
        Port(name="Баку", code="BAK", country="Азербайджан", city="Баку", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Сумгаит", code="SMG", country="Азербайджан", city="Сумгаит", transport_types=["ЖД"]),
        
        Port(name="Ташкент", code="TAS", country="Узбекистан", city="Ташкент", transport_types=["ЖД", "Авиа"]),
        Port(name="Самарканд", code="SKD", country="Узбекистан", city="Самарканд", transport_types=["ЖД", "Авиа"]),
        Port(name="Андижан", code="AZN", country="Узбекистан", city="Андижан", transport_types=["ЖД"]),
        Port(name="Фергана", code="FEG", country="Узбекистан", city="Фергана", transport_types=["ЖД"]),
        Port(name="Бухара", code="BHK", country="Узбекистан", city="Бухара", transport_types=["ЖД"]),
        Port(name="Хива", code="UGC", country="Узбекистан", city="Хива", transport_types=["ЖД"]),
        
        Port(name="Кишинев", code="KIV", country="Молдова", city="Кишинев", transport_types=["ЖД", "Авиа"]),
        Port(name="Унгены", code="UNG", country="Молдова", city="Унгены", transport_types=["ЖД"]),
        
        Port(name="Бишкек", code="FRU", country="Кыргызстан", city="Бишкек", transport_types=["ЖД", "Авиа"]),
        Port(name="Ош", code="OSS", country="Кыргызстан", city="Ош", transport_types=["ЖД", "Авиа"]),
        
        Port(name="Душанбе", code="DYU", country="Таджикистан", city="Душанбе", transport_types=["ЖД", "Авиа"]),
        Port(name="Худжанд", code="LBD", country="Таджикистан", city="Худжанд", transport_types=["ЖД"]),
        
        Port(name="Ашхабад", code="ASB", country="Туркменистан", city="Ашхабад", transport_types=["ЖД", "Авиа"]),
        Port(name="Туркменабад", code="CRZ", country="Туркменистан", city="Туркменабад", transport_types=["ЖД"]),
        Port(name="Туркменбаши", code="KRW", country="Туркменистан", city="Туркменбаши", transport_types=["Море", "ЖД"]),
        
        Port(name="Ереван", code="EVN", country="Армения", city="Ереван", transport_types=["ЖД", "Авиа"]),
        Port(name="Гюмри", code="LWN", country="Армения", city="Гюмри", transport_types=["ЖД"]),
        
        # Китайские железнодорожные станции и терминалы
        Port(name="Шанхай", code="SHA", country="Китай", city="Шанхай", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Чэнду", code="CTU", country="Китай", city="Чэнду", transport_types=["ЖД", "Авиа"]),
        Port(name="Шэньчжэнь", code="SZX", country="Китай", city="Шэньчжэнь", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Гуанчжоу", code="CAN", country="Китай", city="Гуанчжоу", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Тяньцзинь", code="TSN", country="Китай", city="Тяньцзинь", transport_types=["Море", "ЖД"]),
        Port(name="Далянь", code="DLC", country="Китай", city="Далянь", transport_types=["Море", "ЖД"]),
        Port(name="Циндао", code="TAO", country="Китай", city="Циндао", transport_types=["Море"]),
        Port(name="Нинбо", code="NGB", country="Китай", city="Нинбо", transport_types=["Море"]),
        Port(name="Сямынь", code="XMN", country="Китай", city="Сямынь", transport_types=["Море", "Авиа"]),
        Port(name="Урумчи", code="URC", country="Китай", city="Урумчи", transport_types=["ЖД", "Авиа"]),
        Port(name="Пекин", code="PEK", country="Китай", city="Пекин", transport_types=["ЖД", "Авиа"]),
        Port(name="Хуньчунь", code="HUN", country="Китай", city="Хуньчунь", transport_types=["ЖД"]),
        Port(name="Иу", code="YIW", country="Китай", city="Иу", transport_types=["ЖД"]),
        Port(name="Сиань", code="SIA", country="Китай", city="Сиань", transport_types=["ЖД", "Авиа"]),
        Port(name="Ухань", code="WUH", country="Китай", city="Ухань", transport_types=["ЖД", "Авиа"]),
        Port(name="Чунцин", code="CKG", country="Китай", city="Чунцин", transport_types=["ЖД", "Авиа"]),
        Port(name="Нанкин", code="NKG", country="Китай", city="Нанкин", transport_types=["ЖД", "Авиа"]),
        Port(name="Ханчжоу", code="HGH", country="Китай", city="Ханчжоу", transport_types=["ЖД", "Авиа"]),
        Port(name="Циньчжоу", code="QIN", country="Китай", city="Циньчжоу", transport_types=["Море", "ЖД"]),
        Port(name="Шилун", code="SIL", country="Китай", city="Шилун", transport_types=["ЖД"]),
        Port(name="Алашанькоу", code="ALA", country="Китай", city="Алашанькоу", transport_types=["ЖД"]),
        Port(name="Эренхот", code="ERE", country="Китай", city="Эренхот", transport_types=["ЖД"]),
        Port(name="Маньчжоули", code="NZH", country="Китай", city="Маньчжоули", transport_types=["ЖД"]),
        Port(name="Суйфэньхэ", code="SUI", country="Китай", city="Суйфэньхэ", transport_types=["ЖД"]),
        Port(name="Дунин", code="DON", country="Китай", city="Дунин", transport_types=["ЖД"]),
        Port(name="Цзинань", code="TNA", country="Китай", city="Цзинань", transport_types=["ЖД", "Авиа"]),
        Port(name="Тайюань", code="TYN", country="Китай", city="Тайюань", transport_types=["ЖД", "Авиа"]),
        Port(name="Шицзячжуан", code="SJW", country="Китай", city="Шицзячжуан", transport_types=["ЖД", "Авиа"]),
        Port(name="Лань чжоу", code="LHW", country="Китай", city="Ланьчжоу", transport_types=["ЖД", "Авиа"]),
        Port(name="Гуйян", code="KWE", country="Китай", city="Гуйян", transport_types=["ЖД", "Авиа"]),
        Port(name="Куньмин", code="KMG", country="Китай", city="Куньмин", transport_types=["ЖД", "Авиа"]),
        Port(name="Нанчан", code="KHN", country="Китай", city="Нанчан", transport_types=["ЖД", "Авиа"]),
        Port(name="Хэфэй", code="HFE", country="Китай", city="Хэфэй", transport_types=["ЖД", "Авиа"]),
        Port(name="Фучжоу", code="FOC", country="Китай", city="Фучжоу", transport_types=["ЖД", "Авиа"]),
        Port(name="Наньнин", code="NNG", country="Китай", city="Наньнин", transport_types=["ЖД", "Авиа"]),
        Port(name="Хайкоу", code="HAK", country="Китай", city="Хайкоу", transport_types=["Авиа"]),
        Port(name="Синин", code="XNN", country="Китай", city="Синин", transport_types=["ЖД", "Авиа"]),
        Port(name="Иньчуань", code="INC", country="Китай", city="Иньчуань", transport_types=["ЖД", "Авиа"]),
        Port(name="Хух-Хото", code="HET", country="Китай", city="Хух-Хото", transport_types=["ЖД", "Авиа"]),
        Port(name="Харбин", code="HRB", country="Китай", city="Харбин", transport_types=["ЖД", "Авиа"]),
        Port(name="Чанчунь", code="CGQ", country="Китай", city="Чанчунь", transport_types=["ЖД", "Авиа"]),
        Port(name="Шэньян", code="SHE", country="Китай", city="Шэньян", transport_types=["ЖД", "Авиа"]),
        Port(name="Далянь-Порт", code="DLP", country="Китай", city="Далянь", transport_types=["ЖД"]),
        Port(name="Цзилинь", code="JIL", country="Китай", city="Цзилинь", transport_types=["ЖД"]),
        Port(name="Хэнъян", code="HNY", country="Китай", city="Хэнъян", transport_types=["ЖД"]),
        Port(name="Чанша", code="CSX", country="Китай", city="Чанша", transport_types=["ЖД", "Авиа"]),
        Port(name="Фошань", code="FOS", country="Китай", city="Фошань", transport_types=["ЖД"]),
        Port(name="Дунгуань", code="DGU", country="Китай", city="Дунгуань", transport_types=["ЖД"]),
        Port(name="Чжухай", code="ZUH", country="Китай", city="Чжухай", transport_types=["ЖД", "Авиа"]),
        Port(name="Шаньтоу", code="SWA", country="Китай", city="Шаньтоу", transport_types=["ЖД", "Авиа"]),
        Port(name="Цзянмэнь", code="JMN", country="Китай", city="Цзянмэнь", transport_types=["ЖД"]),
        Port(name="Чжаньцзян", code="ZHA", country="Китай", city="Чжаньцзян", transport_types=["Море", "ЖД"]),
        Port(name="Хуэйчжоу", code="HUI", country="Китай", city="Хуэйчжоу", transport_types=["ЖД"]),
        
        # Европейские порты
        Port(name="Гамбург", code="HAM", country="Германия", city="Гамбург", transport_types=["Море", "ЖД"]),
        Port(name="Роттердам", code="RTM", country="Нидерланды", city="Роттердам", transport_types=["Море"]),
        Port(name="Антверпен", code="ANR", country="Бельгия", city="Антверпен", transport_types=["Море"]),
        Port(name="Феликстоу", code="FXT", country="Великобритания", city="Феликстоу", transport_types=["Море"]),
        Port(name="Стамбул", code="IST", country="Турция", city="Стамбул", transport_types=["Море", "ЖД", "Авиа"]),
        Port(name="Констанца", code="CND", country="Румыния", city="Констанца", transport_types=["Море"]),
        Port(name="Пирей", code="ATH", country="Греция", city="Пирей", transport_types=["Море"]),
        Port(name="Варна", code="VAR", country="Болгария", city="Варна", transport_types=["Море"]),
        Port(name="Дуйсбург", code="DUI", country="Германия", city="Дуйсбург", transport_types=["ЖД"]),
        Port(name="Мальашевиче", code="MAL", country="Польша", city="Мальашевиче", transport_types=["ЖД"]),
        Port(name="Варшава", code="WAW", country="Польша", city="Варшава", transport_types=["ЖД", "Авиа"]),
        Port(name="Прага", code="PRG", country="Чехия", city="Прага", transport_types=["ЖД", "Авиа"]),
        Port(name="Будапешт", code="BUD", country="Венгрия", city="Будапешт", transport_types=["ЖД", "Авиа"]),
        Port(name="Бухарест", code="OTP", country="Румыния", city="Бухарест", transport_types=["ЖД", "Авиа"]),
        Port(name="София", code="SOF", country="Болгария", city="София", transport_types=["ЖД", "Авиа"]),
        Port(name="Белград", code="BEG", country="Сербия", city="Белград", transport_types=["ЖД", "Авиа"]),
        Port(name="Загреб", code="ZAG", country="Хорватия", city="Загреб", transport_types=["ЖД", "Авиа"]),
        Port(name="Любляна", code="LJU", country="Словения", city="Любляна", transport_types=["ЖД", "Авиа"]),
        Port(name="Братислава", code="BTS", country="Словакия", city="Братислава", transport_types=["ЖД", "Авиа"]),
        Port(name="Вена", code="VIE", country="Австрия", city="Вена", transport_types=["ЖД", "Авиа"]),
        Port(name="Мюнхен", code="MUC", country="Германия", city="Мюнхен", transport_types=["ЖД", "Авиа"]),
        Port(name="Берлин", code="BER", country="Германия", city="Берлин", transport_types=["ЖД", "Авиа"]),
        Port(name="Франкфурт", code="FRA", country="Германия", city="Франкфурт", transport_types=["ЖД", "Авиа"]),
        Port(name="Амстердам", code="AMS", country="Нидерланды", city="Амстердам", transport_types=["ЖД", "Авиа"]),
        Port(name="Париж", code="CDG", country="Франция", city="Париж", transport_types=["ЖД", "Авиа"]),
        Port(name="Лион", code="LYS", country="Франция", city="Лион", transport_types=["ЖД", "Авиа"]),
        Port(name="Милан", code="MXP", country="Италия", city="Милан", transport_types=["ЖД", "Авиа"]),
        Port(name="Рим", code="ROM", country="Италия", city="Рим", transport_types=["ЖД", "Авиа"]),
        Port(name="Мадрид", code="MAD", country="Испания", city="Мадрид", transport_types=["ЖД", "Авиа"]),
        Port(name="Барселона", code="BCN", country="Испания", city="Барселона", transport_types=["ЖД", "Авиа"]),
        Port(name="Лондон", code="LHR", country="Великобритания", city="Лондон", transport_types=["ЖД", "Авиа"]),
        Port(name="Манчестер", code="MAN", country="Великобритания", city="Манчестер", transport_types=["ЖД", "Авиа"]),
        
        # Азиатские порты
        Port(name="Дубай", code="DXB", country="ОАЭ", city="Дубай", transport_types=["Море", "Авиа"]),
        Port(name="Пусан", code="PUS", country="Южная Корея", city="Пусан", transport_types=["Море"]),
        Port(name="Сеул", code="ICN", country="Южная Корея", city="Сеул", transport_types=["Авиа"]),
        Port(name="Сингапур", code="SIN", country="Сингапур", city="Сингапур", transport_types=["Море", "Авиа"]),
        Port(name="Бомбей", code="BOM", country="Индия", city="Мумбаи", transport_types=["Море", "Авиа"]),
        Port(name="Дели", code="DEL", country="Индия", city="Дели", transport_types=["ЖД", "Авиа"]),
        Port(name="Коломбо", code="CMB", country="Шри-Ланка", city="Коломбо", transport_types=["Море"]),
        Port(name="Токио", code="NRT", country="Япония", city="Токио", transport_types=["Авиа"]),
        Port(name="Иокогама", code="YOK", country="Япония", city="Иокогама", transport_types=["Море"]),
        Port(name="Бангкок", code="BKK", country="Таиланд", city="Бангкок", transport_types=["Авиа"]),
        Port(name="Хошимин", code="SGN", country="Вьетнам", city="Хошимин", transport_types=["Море", "Авиа"]),
        Port(name="Ханой", code="HAN", country="Вьетнам", city="Ханой", transport_types=["ЖД", "Авиа"]),
        Port(name="Джакарта", code="CGK", country="Индонезия", city="Джакарта", transport_types=["Море", "Авиа"]),
        Port(name="Манила", code="MNL", country="Филиппины", city="Манила", transport_types=["Море", "Авиа"]),
        Port(name="Куала-Лумпур", code="KUL", country="Малайзия", city="Куала-Лумпур", transport_types=["Авиа"]),
        Port(name="Порт-Кланг", code="PKL", country="Малайзия", city="Порт-Кланг", transport_types=["Море"])
        
    ]
    
    for port in default_ports:
        await db.ports.insert_one(port.dict())
    
    # Initialize sample routes
    sample_routes = [
        # Морские маршруты
        ShippingRoute(origin_port="SHA", destination_port="LED", transport_type="Море", carrier="COSCO", 
                 transit_time_days=35, base_price_usd=1200, 
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="HAM", destination_port="NVS", transport_type="Море", carrier="Maersk", 
                 transit_time_days=12, base_price_usd=800,
                 available_container_types=["20ft", "40ft", "20ft Reefer"],
                 frequency="Daily"),
        ShippingRoute(origin_port="SZX", destination_port="VVO", transport_type="Море", carrier="Evergreen", 
                 transit_time_days=18, base_price_usd=850,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        
        # Железнодорожные маршруты - Китай в СНГ
        ShippingRoute(origin_port="CTU", destination_port="LED", transport_type="ЖД", carrier="China Railways Express", 
                 transit_time_days=15, base_price_usd=950,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="YIW", destination_port="MSQ", transport_type="ЖД", carrier="New Silk Road Express", 
                 transit_time_days=18, base_price_usd=780,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="URC", destination_port="SVO", transport_type="ЖД", carrier="TransSiberian Express", 
                 transit_time_days=12, base_price_usd=680,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="PEK", destination_port="SVX", transport_type="ЖД", carrier="Eurasia Express", 
                 transit_time_days=10, base_price_usd=750,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="SIA", destination_port="DUI", transport_type="ЖД", carrier="Chang'an Express", 
                 transit_time_days=16, base_price_usd=850,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="WUH", destination_port="HAM", transport_type="ЖД", carrier="Wuhan-Europe Express", 
                 transit_time_days=18, base_price_usd=920,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="CKG", destination_port="NQZ", transport_type="ЖД", carrier="Chongqing-Kazakhstan Express", 
                 transit_time_days=8, base_price_usd=580,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="HGH", destination_port="MAL", transport_type="ЖД", carrier="Hangzhou-Europe Express", 
                 transit_time_days=20, base_price_usd=980,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="NKG", destination_port="MSQ", transport_type="ЖД", carrier="Nanjing-Belarus Express", 
                 transit_time_days=17, base_price_usd=880,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="CSX", destination_port="TAS", transport_type="ЖД", carrier="Changsha-Central Asia Express", 
                 transit_time_days=14, base_price_usd=720,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="TNA", destination_port="KHG", transport_type="ЖД", carrier="Jinan-Khorgos Express", 
                 transit_time_days=6, base_price_usd=450,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="LHW", destination_port="ALA", transport_type="ЖД", carrier="Lanzhou-Almaty Express", 
                 transit_time_days=4, base_price_usd=380,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="KWE", destination_port="FRU", transport_type="ЖД", carrier="Guiyang-Bishkek Express", 
                 transit_time_days=12, base_price_usd=650,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="KMG", destination_port="HAN", transport_type="ЖД", carrier="Kunming-Hanoi Express", 
                 transit_time_days=2, base_price_usd=250,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        
        # Железнодорожные маршруты - внутри СНГ
        ShippingRoute(origin_port="MSQ", destination_port="LED", transport_type="ЖД", carrier="Belarus Railways", 
                 transit_time_days=1, base_price_usd=180,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="ALA", destination_port="SVO", transport_type="ЖД", carrier="Kazakhstan Temir Zholy", 
                 transit_time_days=4, base_price_usd=420,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="TAS", destination_port="ALA", transport_type="ЖД", carrier="O'zbekiston Temir Yo'llari", 
                 transit_time_days=2, base_price_usd=280,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="BAK", destination_port="TBS", transport_type="ЖД", carrier="Azerbaijan Railways", 
                 transit_time_days=1, base_price_usd=150,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="KHG", destination_port="ALA", transport_type="ЖД", carrier="Silk Road Logistics", 
                 transit_time_days=1, base_price_usd=120,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="DOS", destination_port="NQZ", transport_type="ЖД", carrier="KTZ Express", 
                 transit_time_days=2, base_price_usd=200,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="BQT", destination_port="MAL", transport_type="ЖД", carrier="Belarus-Poland Express", 
                 transit_time_days=1, base_price_usd=100,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="EVN", destination_port="BAK", transport_type="ЖД", carrier="South Caucasus Railway", 
                 transit_time_days=1, base_price_usd=160,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        
        # Железнодорожные маршруты - СНГ в Европу
        ShippingRoute(origin_port="LED", destination_port="HAM", transport_type="ЖД", carrier="RZD Logistics", 
                 transit_time_days=7, base_price_usd=620,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="SVO", destination_port="BER", transport_type="ЖД", carrier="Russian Railways", 
                 transit_time_days=5, base_price_usd=480,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="MSQ", destination_port="VIE", transport_type="ЖД", carrier="Belarus-Austria Express", 
                 transit_time_days=3, base_price_usd=360,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="KBP", destination_port="PRG", transport_type="ЖД", carrier="Ukraine Railways", 
                 transit_time_days=2, base_price_usd=280,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        
        # Авиа маршруты
        ShippingRoute(origin_port="PEK", destination_port="SVO", transport_type="Авиа", carrier="Air China Cargo", 
                 transit_time_days=1, base_price_usd=450,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="CTU", destination_port="LED", transport_type="Авиа", carrier="Sichuan Airlines Cargo", 
                 transit_time_days=1, base_price_usd=380,
                 available_container_types=["20ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="CAN", destination_port="BAK", transport_type="Авиа", carrier="China Southern Cargo", 
                 transit_time_days=1, base_price_usd=520,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="SHA", destination_port="FRA", transport_type="Авиа", carrier="Lufthansa Cargo", 
                 transit_time_days=1, base_price_usd=680,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="URC", destination_port="ALA", transport_type="Авиа", carrier="Kazakhstan Air", 
                 transit_time_days=1, base_price_usd=220,
                 available_container_types=["20ft"],
                 frequency="Daily"),
        
        # Комбинированные и обратные маршруты
        ShippingRoute(origin_port="LED", destination_port="CTU", transport_type="ЖД", carrier="RZD-China Express", 
                 transit_time_days=16, base_price_usd=900,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="NVS", destination_port="SHA", transport_type="Море", carrier="COSCO", 
                 transit_time_days=38, base_price_usd=1250,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="VVO", destination_port="CAN", transport_type="Море", carrier="MSC", 
                 transit_time_days=12, base_price_usd=680,
                 available_container_types=["20ft", "40ft"],
                 frequency="Daily"),
        ShippingRoute(origin_port="ALA", destination_port="YIW", transport_type="ЖД", carrier="Central Asia Express", 
                 transit_time_days=5, base_price_usd=480,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="DUI", destination_port="WUH", transport_type="ЖД", carrier="Germany-China Express", 
                 transit_time_days=19, base_price_usd=960,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly"),
        ShippingRoute(origin_port="MAL", destination_port="CKG", transport_type="ЖД", carrier="Poland-China Express", 
                 transit_time_days=14, base_price_usd=820,
                 available_container_types=["20ft", "40ft"],
                 frequency="Weekly")
        
    ]
    
    for route in sample_routes:
        await db.shipping_routes.insert_one(route.dict())

# Public API endpoints
@api_router.get("/")
async def root():
    return {"message": "CargoSearch API - Платформа поиска контейнерных перевозок"}

@api_router.get("/container-types", response_model=List[ContainerType])
async def get_container_types():
    containers = await db.container_types.find().to_list(100)
    return [ContainerType(**container) for container in containers]

@api_router.get("/cargo-types", response_model=List[CargoType])
async def get_cargo_types():
    cargo_types = await db.cargo_types.find().to_list(100)
    return [CargoType(**cargo_type) for cargo_type in cargo_types]

@api_router.get("/ports", response_model=List[Port])
async def get_ports():
    ports = await db.ports.find().to_list(200)
    return [Port(**port) for port in ports]

@api_router.post("/search")
async def search_shipments(query: SearchQuery):
    print(f"🔍 DEBUG: Received search query: {query}")
    
    # Get webhook settings
    webhook_settings = await db.webhook_settings.find_one()
    if not webhook_settings:
        webhook_url = "https://beautechflow.store/webhook/search"  # New default webhook
    else:
        webhook_url = webhook_settings["webhook_url"]
    
    # Convert our data format to webhook API format
    # Map container type to size number
    container_size_map = {
        "20ft": "20",
        "40ft": "40"
    }
    
    webhook_params = {
        "from": query.origin_port,  # Send port code as from
        "to": query.destination_port,  # Send port code as to
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
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(email=user_data.email)
    await db.users.insert_one(user.dict())
    return {"message": "User registered successfully", "user_id": user.id}

# Admin webhook settings
@api_router.get("/admin/webhook", response_model=dict)
async def get_webhook_settings(current_admin: str = Depends(get_current_admin)):
    settings = await db.webhook_settings.find_one()
    if not settings:
        return {"webhook_url": "https://beautechflow.store/webhook/search"}
    return {"webhook_url": settings["webhook_url"]}

@api_router.post("/admin/webhook")
async def update_webhook_settings(webhook_url: dict, current_admin: str = Depends(get_current_admin)):
    url = webhook_url.get("webhook_url", "")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL is required")
    
    # Update or create webhook settings
    await db.webhook_settings.delete_many({})  # Remove old settings
    webhook_settings = WebhookSettings(webhook_url=url)
    await db.webhook_settings.insert_one(webhook_settings.dict())
    return {"message": "Webhook URL updated successfully"}

# Admin authentication
@api_router.post("/admin/login", response_model=Token)
async def admin_login(login_data: AdminLogin):
    if login_data.login != ADMIN_LOGIN or login_data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect login or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_data.login}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Admin endpoints
@api_router.get("/admin/container-types", response_model=List[ContainerType])
async def admin_get_container_types(current_admin: str = Depends(get_current_admin)):
    containers = await db.container_types.find().to_list(100)
    return [ContainerType(**container) for container in containers]

@api_router.post("/admin/container-types", response_model=ContainerType)
async def admin_create_container_type(container: ContainerType, current_admin: str = Depends(get_current_admin)):
    await db.container_types.insert_one(container.dict())
    return container

@api_router.put("/admin/container-types/{container_id}", response_model=ContainerType)
async def admin_update_container_type(container_id: str, container: ContainerType, current_admin: str = Depends(get_current_admin)):
    result = await db.container_types.update_one(
        {"id": container_id}, 
        {"$set": container.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Container type not found")
    return container

@api_router.delete("/admin/container-types/{container_id}")
async def admin_delete_container_type(container_id: str, current_admin: str = Depends(get_current_admin)):
    result = await db.container_types.delete_one({"id": container_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Container type not found")
    return {"message": "Container type deleted"}

@api_router.get("/admin/routes", response_model=List[ShippingRoute])
async def admin_get_routes(current_admin: str = Depends(get_current_admin)):
    routes = await db.shipping_routes.find().to_list(100)
    return [ShippingRoute(**route) for route in routes]

@api_router.post("/admin/routes", response_model=ShippingRoute)
async def admin_create_route(route: ShippingRoute, current_admin: str = Depends(get_current_admin)):
    await db.shipping_routes.insert_one(route.dict())
    return route

@api_router.delete("/admin/routes/{route_id}")
async def admin_delete_route(route_id: str, current_admin: str = Depends(get_current_admin)):
    result = await db.shipping_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()