import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import httpx
import pytz
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Country Comparator API")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "http://localhost:3000",
        "https://3000-i71l63a2yls0a0xycffdu-7d29b9d0.manusvm.computer",
        "https://8000-i71l63a2yls0a0xycffdu-7d29b9d0.manusvm.computer"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache en memoria con TTL
cache: Dict[str, Dict[str, Any]] = {}

# Cargar países desde JSON estático
COUNTRIES_FILE = os.path.join(os.path.dirname(__file__), "..", "countries_un195.json")
with open(COUNTRIES_FILE, "r", encoding="utf-8") as f:
    COUNTRIES_DATA = json.load(f)

# Variables de entorno
CALENDARIFIC_KEY = os.getenv("CALENDARIFIC_KEY", "")


def is_cache_valid(key: str, ttl_hours: int) -> bool:
    """Verificar si el cache es válido según el TTL."""
    if key not in cache:
        return False
    cached_time = cache[key].get("timestamp")
    if not cached_time:
        return False
    age = datetime.now() - cached_time
    return age < timedelta(hours=ttl_hours)


def get_from_cache(key: str, ttl_hours: int) -> Optional[Any]:
    """Obtener datos del cache si son válidos."""
    if is_cache_valid(key, ttl_hours):
        return cache[key].get("data")
    return None


def set_cache(key: str, data: Any):
    """Guardar datos en el cache."""
    cache[key] = {
        "data": data,
        "timestamp": datetime.now()
    }


async def fetch_with_retry(url: str, max_retries: int = 2) -> Optional[Dict]:
    """Realizar petición HTTP con reintentos."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(max_retries + 1):
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code >= 500:
                    if attempt < max_retries:
                        continue
            except (httpx.TimeoutException, httpx.RequestError):
                if attempt < max_retries:
                    continue
    return None


@app.get("/api/countries")
async def get_countries():
    """Retornar lista de 195 países miembros de la ONU."""
    return {
        "count": len(COUNTRIES_DATA),
        "countries": COUNTRIES_DATA
    }


@app.get("/api/holidays")
async def get_holidays(
    country: str = Query(..., description="Código ISO-2 del país"),
    year: int = Query(..., description="Año para consultar feriados")
):
    """Obtener feriados de un país para un año específico."""
    cache_key = f"holidays_{country}_{year}"
    
    # Verificar cache (TTL 24h)
    cached_data = get_from_cache(cache_key, 24)
    if cached_data:
        return cached_data
    
    # Intentar con Nager.Date primero
    nager_url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/{country}"
    nager_data = await fetch_with_retry(nager_url)
    
    if nager_data:
        result = {
            "country": country,
            "year": year,
            "source": "Nager.Date",
            "items": [
                {
                    "date": item["date"],
                    "localName": item.get("localName", ""),
                    "name": item.get("name", "")
                }
                for item in nager_data
            ]
        }
        set_cache(cache_key, result)
        return result
    
    # Fallback a Calendarific si está configurado
    if CALENDARIFIC_KEY:
        calendarific_url = f"https://calendarific.com/api/v2/holidays?api_key={CALENDARIFIC_KEY}&country={country}&year={year}"
        calendarific_data = await fetch_with_retry(calendarific_url)
        
        if calendarific_data and calendarific_data.get("response"):
            holidays = calendarific_data["response"].get("holidays", [])
            result = {
                "country": country,
                "year": year,
                "source": "Calendarific",
                "items": [
                    {
                        "date": item["date"]["iso"],
                        "localName": item.get("name", ""),
                        "name": item.get("name", "")
                    }
                    for item in holidays
                ]
            }
            set_cache(cache_key, result)
            return result
    
    # Si ambos fallan, retornar error
    raise HTTPException(
        status_code=503,
        detail=f"No se pudieron obtener feriados para {country} en {year}"
    )


@app.get("/api/timezones")
async def get_timezones(
    country: str = Query(..., description="Código ISO-2 del país")
):
    """Obtener lista de zonas horarias IANA para un país."""
    try:
        zones = pytz.country_timezones.get(country.upper(), [])
        return {
            "country": country,
            "zones": zones
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al obtener zonas horarias: {str(e)}"
        )


@app.get("/api/zone-status")
async def get_zone_status(
    zone: str = Query(..., description="Zona IANA (ej: America/New_York)")
):
    """Obtener offset UTC actual y estado DST de una zona horaria."""
    cache_key = f"zone_status_{zone}"
    
    # Verificar cache (TTL 1h)
    cached_data = get_from_cache(cache_key, 1)
    if cached_data:
        return cached_data
    
    # Consultar WorldTimeAPI
    worldtime_url = f"https://worldtimeapi.org/api/timezone/{zone}"
    worldtime_data = await fetch_with_retry(worldtime_url)
    
    if worldtime_data:
        result = {
            "zone": zone,
            "utc_offset": worldtime_data.get("utc_offset", ""),
            "dst": worldtime_data.get("dst", False)
        }
        set_cache(cache_key, result)
        return result
    
    # Fallback: calcular localmente con pytz
    try:
        tz = pytz.timezone(zone)
        now = datetime.now(tz)
        offset = now.strftime("%z")
        # Formatear offset como +HH:MM o -HH:MM
        formatted_offset = f"{offset[:3]}:{offset[3:]}"
        # Detectar DST comparando con offset estándar
        dst_active = bool(now.dst())
        
        result = {
            "zone": zone,
            "utc_offset": formatted_offset,
            "dst": dst_active
        }
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo obtener información de la zona {zone}: {str(e)}"
        )


@app.get("/api/compare")
async def compare_countries(
    countryA: str = Query(..., description="Código ISO-2 del país A"),
    countryB: str = Query(..., description="Código ISO-2 del país B"),
    year: int = Query(..., description="Año para comparar")
):
    """Comparar feriados y zonas horarias entre dos países."""
    
    # Obtener feriados de ambos países
    try:
        holidays_a = await get_holidays(countryA, year)
        holidays_b = await get_holidays(countryB, year)
    except HTTPException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Error al obtener feriados: {e.detail}"
        )
    
    # Calcular feriados en común y únicos
    dates_a = {item["date"]: item for item in holidays_a["items"]}
    dates_b = {item["date"]: item for item in holidays_b["items"]}
    
    common_dates = set(dates_a.keys()) & set(dates_b.keys())
    only_a_dates = set(dates_a.keys()) - set(dates_b.keys())
    only_b_dates = set(dates_b.keys()) - set(dates_a.keys())
    
    common_holidays = [
        {
            "date": date,
            "nameA": dates_a[date]["localName"] or dates_a[date]["name"],
            "nameB": dates_b[date]["localName"] or dates_b[date]["name"]
        }
        for date in sorted(common_dates)
    ]
    
    only_a = [
        {
            "date": date,
            "name": dates_a[date]["localName"] or dates_a[date]["name"]
        }
        for date in sorted(only_a_dates)
    ]
    
    only_b = [
        {
            "date": date,
            "name": dates_b[date]["localName"] or dates_b[date]["name"]
        }
        for date in sorted(only_b_dates)
    ]
    
    # Obtener zonas horarias de ambos países
    try:
        timezones_a = await get_timezones(countryA)
        timezones_b = await get_timezones(countryB)
    except HTTPException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Error al obtener zonas horarias: {e.detail}"
        )
    
    # Obtener status de cada zona
    zones_status_a = []
    for zone in timezones_a["zones"]:
        try:
            status = await get_zone_status(zone)
            zones_status_a.append(status)
        except:
            # Si falla una zona, continuar con las demás
            zones_status_a.append({
                "zone": zone,
                "utc_offset": "N/A",
                "dst": False
            })
    
    zones_status_b = []
    for zone in timezones_b["zones"]:
        try:
            status = await get_zone_status(zone)
            zones_status_b.append(status)
        except:
            zones_status_b.append({
                "zone": zone,
                "utc_offset": "N/A",
                "dst": False
            })
    
    # Calcular coincidencias de offset
    offsets_a = {}
    for zone_status in zones_status_a:
        offset = zone_status["utc_offset"]
        if offset != "N/A":
            if offset not in offsets_a:
                offsets_a[offset] = []
            offsets_a[offset].append(zone_status["zone"])
    
    offsets_b = {}
    for zone_status in zones_status_b:
        offset = zone_status["utc_offset"]
        if offset != "N/A":
            if offset not in offsets_b:
                offsets_b[offset] = []
            offsets_b[offset].append(zone_status["zone"])
    
    # Encontrar offsets comunes
    common_offsets = set(offsets_a.keys()) & set(offsets_b.keys())
    overlaps = [
        {
            "offset": offset,
            "zonesA": offsets_a[offset],
            "zonesB": offsets_b[offset]
        }
        for offset in sorted(common_offsets)
    ]
    
    return {
        "inputs": {
            "countryA": countryA,
            "countryB": countryB,
            "year": year
        },
        "holidays": {
            "common": common_holidays,
            "onlyA": only_a,
            "onlyB": only_b
        },
        "timezones": {
            "A": zones_status_a,
            "B": zones_status_b,
            "commonOffsetNow": {
                "hasOverlap": len(overlaps) > 0,
                "overlaps": overlaps
            }
        }
    }


@app.get("/")
async def root():
    """Endpoint raíz."""
    return {
        "message": "Country Comparator API",
        "version": "1.0.0",
        "endpoints": [
            "/api/countries",
            "/api/holidays",
            "/api/timezones",
            "/api/zone-status",
            "/api/compare"
        ]
    }
