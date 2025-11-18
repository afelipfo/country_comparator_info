# Country Comparator

Aplicación web para comparar feriados y zonas horarias entre dos países de la ONU.

## Características

- **Comparación de Feriados**: Identifica feriados que coinciden por fecha entre dos países
- **Análisis de Zonas Horarias**: Muestra todas las zonas IANA por país con offsets UTC actuales
- **Detección de Coincidencias**: Identifica si dos países comparten el mismo offset UTC en tiempo real
- **Calendarios Visuales**: Muestra calendarios anuales lado a lado con feriados resaltados
- **195 Países**: Soporta todos los Estados Miembro de la ONU

## Stack Tecnológico

### Backend
- **Python 3.11** + **FastAPI**
- **httpx**: Cliente HTTP asíncrono
- **pytz**: Manejo de zonas horarias
- **python-dateutil**: Manipulación de fechas
- **uvicorn**: Servidor ASGI

### Frontend
- **React 19** + **Vite**
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui**: Componentes de UI

### APIs Externas
- **Nager.Date**: Feriados públicos (principal)
- **Calendarific**: Feriados públicos (fallback opcional)
- **WorldTimeAPI**: Información de zonas horarias en tiempo real
- **pytz**: Fallback local para zonas horarias

## Estructura del Proyecto

```
country_comparator/
├── backend/                 # Backend FastAPI
│   ├── app.py              # Aplicación principal
│   └── requirements.txt    # Dependencias Python
├── client/                 # Frontend React
│   └── src/
│       ├── pages/
│       │   └── Home.tsx    # Página principal
│       └── App.tsx         # Configuración de rutas
├── countries_un195.json    # Lista de 195 países (ISO-3166)
├── vite.config.ts          # Configuración de Vite
└── README.md               # Este archivo
```

## Instalación

### Backend

1. Navegar al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
pip3 install -r requirements.txt
```

### Frontend

1. Navegar al directorio raíz:
```bash
cd ..
```

2. Instalar dependencias:
```bash
npm install
# o
pnpm install
```

## Ejecución

### Iniciar Backend

Desde el directorio `backend/`:

```bash
uvicorn app:app --reload
```

El backend estará disponible en `http://localhost:8000`

### Iniciar Frontend

Desde el directorio raíz:

```bash
npm run dev
# o
pnpm dev
```

El frontend estará disponible en `http://localhost:3000`

## Uso

1. Abrir el navegador en `http://localhost:3000`
2. Seleccionar **País A** de la lista desplegable
3. Seleccionar **País B** de la lista desplegable
4. Seleccionar el **Año** a comparar (por defecto: año actual)
5. Hacer clic en **"Comparar Países"**

## Resultados

La aplicación muestra tres secciones principales:

### 1. Feriados en Común
- Tabla con fechas que coinciden en ambos países
- Nombres locales de cada feriado
- Listas de feriados únicos por país

### 2. Zonas Horarias
- Lista de zonas IANA por país
- Offset UTC actual de cada zona
- Indicador de DST (Daylight Saving Time)
- Detección de coincidencias de offset entre países

### 3. Calendarios Anuales
- Vista mensual de todo el año
- Feriados resaltados en azul
- Fechas comunes resaltadas en verde

## APIs Disponibles

### GET /api/countries
Retorna la lista de 195 países miembros de la ONU.

**Respuesta:**
```json
{
  "count": 195,
  "countries": [
    {
      "name_es": "Argentina",
      "name_en": "Argentina",
      "iso2": "AR",
      "iso3": "ARG"
    }
  ]
}
```

### GET /api/holidays
Obtiene los feriados de un país para un año específico.

**Parámetros:**
- `country` (string): Código ISO-2 del país
- `year` (int): Año a consultar

**Respuesta:**
```json
{
  "country": "AR",
  "year": 2025,
  "source": "Nager.Date",
  "items": [
    {
      "date": "2025-01-01",
      "localName": "Año Nuevo",
      "name": "New Year's Day"
    }
  ]
}
```

### GET /api/timezones
Obtiene las zonas horarias IANA de un país.

**Parámetros:**
- `country` (string): Código ISO-2 del país

**Respuesta:**
```json
{
  "country": "US",
  "zones": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles"
  ]
}
```

### GET /api/zone-status
Obtiene el offset UTC actual y estado DST de una zona horaria.

**Parámetros:**
- `zone` (string): Zona IANA (ej: "America/New_York")

**Respuesta:**
```json
{
  "zone": "America/New_York",
  "utc_offset": "-05:00",
  "dst": false
}
```

### GET /api/compare
Compara dos países en términos de feriados y zonas horarias.

**Parámetros:**
- `countryA` (string): Código ISO-2 del país A
- `countryB` (string): Código ISO-2 del país B
- `year` (int): Año a comparar

**Respuesta:**
```json
{
  "inputs": {
    "countryA": "US",
    "countryB": "CO",
    "year": 2025
  },
  "holidays": {
    "common": [
      {
        "date": "2025-01-01",
        "nameA": "New Year's Day",
        "nameB": "Año Nuevo"
      }
    ],
    "onlyA": [...],
    "onlyB": [...]
  },
  "timezones": {
    "A": [
      {
        "zone": "America/New_York",
        "utc_offset": "-05:00",
        "dst": false
      }
    ],
    "B": [...],
    "commonOffsetNow": {
      "hasOverlap": true,
      "overlaps": [
        {
          "offset": "-05:00",
          "zonesA": ["America/New_York"],
          "zonesB": ["America/Bogota"]
        }
      ]
    }
  }
}
```

## Características Técnicas

### Cache
- **Feriados**: TTL de 24 horas
- **Zonas horarias**: TTL de 1 hora
- Implementación en memoria (diccionario + timestamps)

### Manejo de Errores
- Reintentos automáticos (máximo 2) ante errores 5xx o timeouts
- Fallback a Calendarific si Nager.Date falla (requiere API key)
- Fallback local con pytz si WorldTimeAPI falla
- Mensajes de error claros y descriptivos

### Variables de Entorno

Crear archivo `.env` en el directorio `backend/` (opcional):

```env
PORT=8000
CALENDARIFIC_KEY=tu_api_key_aqui
```

**Nota**: La API key de Calendarific es opcional. La aplicación funciona completamente con Nager.Date.

## Pruebas de Aceptación

### ✅ Verificaciones Implementadas

1. `/api/countries` retorna exactamente 195 países
2. `/api/compare` funciona con países válidos sin fallar
3. Manejo correcto de países con múltiples zonas (US, AU, RU)
4. Detección de coincidencias de offset funciona correctamente
5. Fallback a Calendarific implementado
6. Fallback local con pytz implementado
7. UI resalta correctamente fechas comunes en calendarios
8. Soporte para años pasados y futuros

## Limitaciones Conocidas

- Sin base de datos (cache en memoria se pierde al reiniciar)
- Sin autenticación ni autorización
- Sin paginación en resultados grandes
- Sin tests automatizados (MVP)
- Sin Docker ni CI/CD (MVP)

## Mejoras Futuras

- Agregar base de datos para persistencia
- Implementar tests unitarios e integración
- Agregar exportación de resultados (PDF, CSV)
- Implementar comparación de más de 2 países
- Agregar gráficos y visualizaciones avanzadas
- Implementar búsqueda y filtrado de países
- Agregar soporte para múltiples idiomas

## Licencia

MIT

## Autor

Desarrollado como MVP para comparación de países.
