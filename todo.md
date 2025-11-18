# Country Comparator - TODO

## Estructura y Configuración
- [x] Crear archivo countries_un195.json con 195 países de la ONU
- [x] Configurar estructura de backend con FastAPI
- [x] Configurar dependencias de Python (httpx, pytz, python-dateutil, uvicorn)
- [x] Crear archivo .env para configuración
- [x] Crear README con instrucciones de ejecución

## Backend - APIs
- [x] GET /api/countries - Retornar 195 países del JSON estático
- [x] GET /api/holidays?country=CC&year=YYYY - Proxy con cache (TTL 24h) a Nager.Date
- [x] Implementar fallback a Calendarific si Nager.Date falla
- [x] GET /api/timezones?country=CC - Retornar zonas IANA usando pytz
- [x] GET /api/zone-status?zone=Area/City - Proxy con cache (TTL 1h) a WorldTimeAPI
- [x] GET /api/compare - Endpoint principal que calcula todo
- [x] Implementar cache en memoria con TTL
- [x] Implementar retries simples (máx. 2) ante errores
- [x] Manejo de errores legibles

## Backend - Lógica de Comparación
- [x] Calcular feriados en común por fecha (YYYY-MM-DD)
- [x] Calcular feriados solo en A y solo en B
- [x] Obtener offsets UTC actuales para todas las zonas
- [x] Detectar coincidencias de offset entre países
- [x] Manejar países con múltiples zonas horarias
- [x] Soportar años pasados y futuros

## Frontend - Componentes Base
- [x] Selector de País A (195 países ONU)
- [x] Selector de País B (195 países ONU)
- [x] Selector de Año (por defecto año actual)
- [x] Botón "Comparar"

## Frontend - Visualización de Resultados
- [x] Tarjeta de Calendarios: dos calendarios anuales lado a lado
- [x] Resaltar feriados en cada calendario
- [x] Resaltar fechas comunes en color notorio
- [x] Tarjeta de Feriados en Común: tabla con fecha, nombre en A, nombre en B
- [x] Mostrar feriados "solo en A" y "solo en B"
- [x] Tarjeta de Zonas Horarias: listas de zonas por país
- [x] Mostrar offset UTC actual y estado DST por zona
- [x] Mostrar "Coincidencia de offset actual: Sí/No"
- [x] Si hay coincidencia, mostrar offsets y zonas que coinciden

## Frontend - UX y Accesibilidad
- [x] Estados vacíos claros (sin datos)
- [x] Estados de error claros
- [x] Estados de carga
- [x] Labels accesibles
- [x] Contrastes adecuados
- [x] Navegación por teclado

## Pruebas de Aceptación
- [x] /api/countries retorna exactamente 195 entradas
- [x] /api/compare con países válidos y año actual funciona sin fallar
- [x] Países con múltiples zonas (US) vs una zona (CO) funciona correctamente
- [x] commonOffsetNow.hasOverlap es boolean coherente
- [x] Fallback a Calendarific funciona si Nager.Date falla
- [x] Fallback local con pytz implementado
- [x] UI resalta correctamente fechas comunes en ambos calendarios
- [x] Probar con años pasados y futuros
- [x] Probar manejo de errores de API

## Documentación
- [x] README con instrucciones de backend: uvicorn app:app --reload
- [x] README con instrucciones de frontend: npm i && npm run dev
- [x] Documentar variables de entorno (.env)
- [x] Documentar estructura del proyecto

## Bugs Reportados
- [x] Error de parsing JSON: Frontend recibe HTML en lugar de JSON desde el backend
- [x] Error "Failed to fetch": Backend FastAPI no está disponible en el entorno de despliegue
- [x] Migrar backend a Node.js/TypeScript para compatibilidad con el entorno de despliegue
- [x] Error de claves duplicadas: Dos países con código ISO2 "SZ" causan warning en React
