import { UN_195_COUNTRIES, type Country } from "./countries";

// Cache en memoria con TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

const CACHE_TTL = {
  HOLIDAYS: 24 * 60 * 60 * 1000, // 24 horas
  TIMEZONES: 60 * 60 * 1000, // 1 hora
};

function getCacheKey(prefix: string, ...args: string[]): string {
  return `${prefix}:${args.join(":")}`;
}

function getFromCache<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Función para hacer peticiones HTTP con reintentos
async function fetchWithRetry(url: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

export interface Holiday {
  date: string;
  name: string;
  localName?: string;
  countryCode?: string;
}

export interface ZoneStatus {
  zone: string;
  utc_offset: string;
  dst: boolean;
}

export interface ComparisonResult {
  inputs: {
    countryA: string;
    countryB: string;
    year: number;
  };
  holidays: {
    common: Array<{
      date: string;
      nameA: string;
      nameB: string;
    }>;
    onlyA: Holiday[];
    onlyB: Holiday[];
  };
  timezones: {
    A: ZoneStatus[];
    B: ZoneStatus[];
    commonOffsetNow: {
      hasOverlap: boolean;
      overlaps: Array<{
        offset: string;
        zonesA: string[];
        zonesB: string[];
      }>;
    };
  };
}

// Obtener todos los países
export function getCountries(): { count: number; countries: Country[] } {
  return {
    count: UN_195_COUNTRIES.length,
    countries: UN_195_COUNTRIES,
  };
}

// Obtener feriados de un país
export async function getHolidays(countryCode: string, year: number): Promise<Holiday[]> {
  const cacheKey = getCacheKey("holidays", countryCode, year.toString());
  const cached = getFromCache<Holiday[]>(cacheKey, CACHE_TTL.HOLIDAYS);
  if (cached) return cached;

  try {
    // Intentar con Nager.Date
    const data = await fetchWithRetry(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    const holidays: Holiday[] = data.map((h: any) => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      countryCode: h.countryCode,
    }));
    
    setCache(cacheKey, holidays);
    return holidays;
  } catch (error) {
    console.error(`Error fetching holidays for ${countryCode}:`, error);
    // Retornar array vacío si falla
    return [];
  }
}

// Obtener zonas horarias de un país usando mapping estático
const COUNTRY_TIMEZONES: Record<string, string[]> = {
  AF: ["Asia/Kabul"],
  AL: ["Europe/Tirane"],
  DE: ["Europe/Berlin", "Europe/Busingen"],
  AD: ["Europe/Andorra"],
  AO: ["Africa/Luanda"],
  AG: ["America/Antigua"],
  SA: ["Asia/Riyadh"],
  DZ: ["Africa/Algiers"],
  AR: ["America/Argentina/Buenos_Aires", "America/Argentina/Cordoba", "America/Argentina/Salta", "America/Argentina/Jujuy", "America/Argentina/Tucuman", "America/Argentina/Catamarca", "America/Argentina/La_Rioja", "America/Argentina/San_Juan", "America/Argentina/Mendoza", "America/Argentina/San_Luis", "America/Argentina/Rio_Gallegos", "America/Argentina/Ushuaia"],
  AM: ["Asia/Yerevan"],
  AU: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Australia/Hobart", "Australia/Darwin", "Australia/Lindeman", "Australia/Lord_Howe", "Australia/Eucla", "Australia/Broken_Hill"],
  AT: ["Europe/Vienna"],
  AZ: ["Asia/Baku"],
  BS: ["America/Nassau"],
  BH: ["Asia/Bahrain"],
  BD: ["Asia/Dhaka"],
  BB: ["America/Barbados"],
  BE: ["Europe/Brussels"],
  BZ: ["America/Belize"],
  BJ: ["Africa/Porto-Novo"],
  BY: ["Europe/Minsk"],
  MM: ["Asia/Yangon"],
  BO: ["America/La_Paz"],
  BA: ["Europe/Sarajevo"],
  BW: ["Africa/Gaborone"],
  BR: ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Belem", "America/Recife", "America/Araguaina", "America/Maceio", "America/Bahia", "America/Campo_Grande", "America/Cuiaba", "America/Santarem", "America/Porto_Velho", "America/Boa_Vista", "America/Rio_Branco", "America/Noronha"],
  BN: ["Asia/Brunei"],
  BG: ["Europe/Sofia"],
  BF: ["Africa/Ouagadougou"],
  BI: ["Africa/Bujumbura"],
  BT: ["Asia/Thimphu"],
  CV: ["Atlantic/Cape_Verde"],
  KH: ["Asia/Phnom_Penh"],
  CM: ["Africa/Douala"],
  CA: ["America/Toronto", "America/Vancouver", "America/Halifax", "America/Winnipeg", "America/Edmonton", "America/St_Johns", "America/Regina", "America/Whitehorse", "America/Yellowknife", "America/Inuvik", "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Atikokan", "America/Blanc-Sablon", "America/Iqaluit", "America/Rankin_Inlet", "America/Resolute", "America/Cambridge_Bay", "America/Dawson", "America/Swift_Current"],
  QA: ["Asia/Qatar"],
  TD: ["Africa/Ndjamena"],
  CL: ["America/Santiago", "Pacific/Easter"],
  CN: ["Asia/Shanghai", "Asia/Urumqi"],
  CY: ["Asia/Nicosia", "Asia/Famagusta"],
  CO: ["America/Bogota"],
  KM: ["Indian/Comoro"],
  CG: ["Africa/Brazzaville"],
  KP: ["Asia/Pyongyang"],
  KR: ["Asia/Seoul"],
  CI: ["Africa/Abidjan"],
  CR: ["America/Costa_Rica"],
  HR: ["Europe/Zagreb"],
  CU: ["America/Havana"],
  DK: ["Europe/Copenhagen"],
  DM: ["America/Dominica"],
  EC: ["America/Guayaquil", "Pacific/Galapagos"],
  EG: ["Africa/Cairo"],
  SV: ["America/El_Salvador"],
  AE: ["Asia/Dubai"],
  ER: ["Africa/Asmara"],
  SK: ["Europe/Bratislava"],
  SI: ["Europe/Ljubljana"],
  ES: ["Europe/Madrid", "Africa/Ceuta", "Atlantic/Canary"],
  US: ["America/New_York", "America/Detroit", "America/Kentucky/Louisville", "America/Kentucky/Monticello", "America/Indiana/Indianapolis", "America/Indiana/Vincennes", "America/Indiana/Winamac", "America/Indiana/Marengo", "America/Indiana/Petersburg", "America/Indiana/Vevay", "America/Chicago", "America/Indiana/Tell_City", "America/Indiana/Knox", "America/Menominee", "America/North_Dakota/Center", "America/North_Dakota/New_Salem", "America/North_Dakota/Beulah", "America/Denver", "America/Boise", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "America/Juneau", "America/Sitka", "America/Metlakatla", "America/Yakutat", "America/Nome", "America/Adak", "Pacific/Honolulu"],
  EE: ["Europe/Tallinn"],
  SZ: ["Africa/Mbabane"],
  ET: ["Africa/Addis_Ababa"],
  PH: ["Asia/Manila"],
  FI: ["Europe/Helsinki"],
  FJ: ["Pacific/Fiji"],
  FR: ["Europe/Paris"],
  GA: ["Africa/Libreville"],
  GM: ["Africa/Banjul"],
  GE: ["Asia/Tbilisi"],
  GH: ["Africa/Accra"],
  GD: ["America/Grenada"],
  GR: ["Europe/Athens"],
  GT: ["America/Guatemala"],
  GN: ["Africa/Conakry"],
  GW: ["Africa/Bissau"],
  GQ: ["Africa/Malabo"],
  GY: ["America/Guyana"],
  HT: ["America/Port-au-Prince"],
  HN: ["America/Tegucigalpa"],
  HU: ["Europe/Budapest"],
  IN: ["Asia/Kolkata"],
  ID: ["Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"],
  IQ: ["Asia/Baghdad"],
  IR: ["Asia/Tehran"],
  IE: ["Europe/Dublin"],
  IS: ["Atlantic/Reykjavik"],
  MH: ["Pacific/Majuro", "Pacific/Kwajalein"],
  SB: ["Pacific/Guadalcanal"],
  IL: ["Asia/Jerusalem"],
  IT: ["Europe/Rome"],
  JM: ["America/Jamaica"],
  JP: ["Asia/Tokyo"],
  JO: ["Asia/Amman"],
  KZ: ["Asia/Almaty", "Asia/Qyzylorda", "Asia/Qostanay", "Asia/Aqtobe", "Asia/Aqtau", "Asia/Atyrau", "Asia/Oral"],
  KE: ["Africa/Nairobi"],
  KG: ["Asia/Bishkek"],
  KI: ["Pacific/Tarawa", "Pacific/Enderbury", "Pacific/Kiritimati"],
  KW: ["Asia/Kuwait"],
  LA: ["Asia/Vientiane"],
  LS: ["Africa/Maseru"],
  LV: ["Europe/Riga"],
  LB: ["Asia/Beirut"],
  LR: ["Africa/Monrovia"],
  LY: ["Africa/Tripoli"],
  LI: ["Europe/Vaduz"],
  LT: ["Europe/Vilnius"],
  LU: ["Europe/Luxembourg"],
  MK: ["Europe/Skopje"],
  MG: ["Indian/Antananarivo"],
  MY: ["Asia/Kuala_Lumpur", "Asia/Kuching"],
  MW: ["Africa/Blantyre"],
  MV: ["Indian/Maldives"],
  ML: ["Africa/Bamako"],
  MT: ["Europe/Malta"],
  MA: ["Africa/Casablanca"],
  MU: ["Indian/Mauritius"],
  MR: ["Africa/Nouakchott"],
  MX: ["America/Mexico_City", "America/Cancun", "America/Merida", "America/Monterrey", "America/Matamoros", "America/Mazatlan", "America/Chihuahua", "America/Ojinaga", "America/Hermosillo", "America/Tijuana", "America/Bahia_Banderas"],
  FM: ["Pacific/Chuuk", "Pacific/Pohnpei", "Pacific/Kosrae"],
  MD: ["Europe/Chisinau"],
  MC: ["Europe/Monaco"],
  MN: ["Asia/Ulaanbaatar", "Asia/Hovd", "Asia/Choibalsan"],
  ME: ["Europe/Podgorica"],
  MZ: ["Africa/Maputo"],
  NA: ["Africa/Windhoek"],
  NR: ["Pacific/Nauru"],
  NP: ["Asia/Kathmandu"],
  NI: ["America/Managua"],
  NE: ["Africa/Niamey"],
  NG: ["Africa/Lagos"],
  NO: ["Europe/Oslo"],
  NZ: ["Pacific/Auckland", "Pacific/Chatham"],
  OM: ["Asia/Muscat"],
  NL: ["Europe/Amsterdam"],
  PK: ["Asia/Karachi"],
  PW: ["Pacific/Palau"],
  PA: ["America/Panama"],
  PG: ["Pacific/Port_Moresby", "Pacific/Bougainville"],
  PY: ["America/Asuncion"],
  PE: ["America/Lima"],
  PL: ["Europe/Warsaw"],
  PT: ["Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores"],
  GB: ["Europe/London"],
  CF: ["Africa/Bangui"],
  CZ: ["Europe/Prague"],
  CD: ["Africa/Kinshasa", "Africa/Lubumbashi"],
  DO: ["America/Santo_Domingo"],
  RW: ["Africa/Kigali"],
  RO: ["Europe/Bucharest"],
  RU: ["Europe/Moscow", "Europe/Kaliningrad", "Europe/Simferopol", "Europe/Volgograd", "Europe/Kirov", "Europe/Astrakhan", "Europe/Samara", "Europe/Ulyanovsk", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Barnaul", "Asia/Tomsk", "Asia/Novokuznetsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Chita", "Asia/Yakutsk", "Asia/Khandyga", "Asia/Vladivostok", "Asia/Ust-Nera", "Asia/Magadan", "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Kamchatka", "Asia/Anadyr"],
  WS: ["Pacific/Apia"],
  KN: ["America/St_Kitts"],
  SM: ["Europe/San_Marino"],
  VC: ["America/St_Vincent"],
  LC: ["America/St_Lucia"],
  ST: ["Africa/Sao_Tome"],
  SN: ["Africa/Dakar"],
  RS: ["Europe/Belgrade"],
  SC: ["Indian/Mahe"],
  SL: ["Africa/Freetown"],
  SG: ["Asia/Singapore"],
  SY: ["Asia/Damascus"],
  SO: ["Africa/Mogadishu"],
  LK: ["Asia/Colombo"],
  ZA: ["Africa/Johannesburg"],
  SD: ["Africa/Khartoum"],
  SS: ["Africa/Juba"],
  SE: ["Europe/Stockholm"],
  CH: ["Europe/Zurich"],
  SR: ["America/Paramaribo"],
  TH: ["Asia/Bangkok"],
  TZ: ["Africa/Dar_es_Salaam"],
  TJ: ["Asia/Dushanbe"],
  TL: ["Asia/Dili"],
  TG: ["Africa/Lome"],
  TO: ["Pacific/Tongatapu"],
  TT: ["America/Port_of_Spain"],
  TN: ["Africa/Tunis"],
  TM: ["Asia/Ashgabat"],
  TR: ["Europe/Istanbul"],
  TV: ["Pacific/Funafuti"],
  UA: ["Europe/Kiev", "Europe/Uzhgorod", "Europe/Zaporozhye"],
  UG: ["Africa/Kampala"],
  UY: ["America/Montevideo"],
  UZ: ["Asia/Samarkand", "Asia/Tashkent"],
  VU: ["Pacific/Efate"],
  VA: ["Europe/Vatican"],
  VE: ["America/Caracas"],
  VN: ["Asia/Ho_Chi_Minh"],
  YE: ["Asia/Aden"],
  DJ: ["Africa/Djibouti"],
  ZM: ["Africa/Lusaka"],
  ZW: ["Africa/Harare"],
};

export function getTimezones(countryCode: string): string[] {
  return COUNTRY_TIMEZONES[countryCode] || [];
}

// Obtener estado de zona horaria
export async function getZoneStatus(zone: string): Promise<ZoneStatus | null> {
  const cacheKey = getCacheKey("zone", zone);
  const cached = getFromCache<ZoneStatus>(cacheKey, CACHE_TTL.TIMEZONES);
  if (cached) return cached;

  try {
    // Intentar con WorldTimeAPI
    const data = await fetchWithRetry(`http://worldtimeapi.org/api/timezone/${zone}`);
    const zoneStatus: ZoneStatus = {
      zone: data.timezone,
      utc_offset: data.utc_offset,
      dst: data.dst || false,
    };
    
    setCache(cacheKey, zoneStatus);
    return zoneStatus;
  } catch (error) {
    // Fallback: calcular offset localmente
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        timeZoneName: "longOffset",
      });
      
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(p => p.type === "timeZoneName");
      
      if (offsetPart) {
        const offset = offsetPart.value.replace("GMT", "");
        const zoneStatus: ZoneStatus = {
          zone,
          utc_offset: offset,
          dst: false, // No podemos determinar DST localmente
        };
        
        setCache(cacheKey, zoneStatus);
        return zoneStatus;
      }
    } catch (fallbackError) {
      console.error(`Error getting zone status for ${zone}:`, fallbackError);
    }
    
    return null;
  }
}

// Comparar países
export async function compareCountries(
  countryA: string,
  countryB: string,
  year: number
): Promise<ComparisonResult> {
  // Obtener feriados
  const [holidaysA, holidaysB] = await Promise.all([
    getHolidays(countryA, year),
    getHolidays(countryB, year),
  ]);

  // Calcular feriados en común
  const holidaysAMap = new Map(holidaysA.map(h => [h.date, h]));
  const holidaysBMap = new Map(holidaysB.map(h => [h.date, h]));

  const common: Array<{ date: string; nameA: string; nameB: string }> = [];
  const onlyA: Holiday[] = [];

  Array.from(holidaysAMap.entries()).forEach(([date, holiday]) => {
    if (holidaysBMap.has(date)) {
      common.push({
        date,
        nameA: holiday.name,
        nameB: holidaysBMap.get(date)!.name,
      });
    } else {
      onlyA.push(holiday);
    }
  });

  const onlyB: Holiday[] = [];
  Array.from(holidaysBMap.entries()).forEach(([date, holiday]) => {
    if (!holidaysAMap.has(date)) {
      onlyB.push(holiday);
    }
  });

  // Obtener zonas horarias
  const zonesA = getTimezones(countryA);
  const zonesB = getTimezones(countryB);

  // Obtener estados de zonas
  const [statusesA, statusesB] = await Promise.all([
    Promise.all(zonesA.map(z => getZoneStatus(z))),
    Promise.all(zonesB.map(z => getZoneStatus(z))),
  ]);

  const validStatusesA = statusesA.filter((s): s is ZoneStatus => s !== null);
  const validStatusesB = statusesB.filter((s): s is ZoneStatus => s !== null);

  // Detectar coincidencias de offset
  const offsetMapA = new Map<string, string[]>();
  const offsetMapB = new Map<string, string[]>();

  for (const status of validStatusesA) {
    const zones = offsetMapA.get(status.utc_offset) || [];
    zones.push(status.zone);
    offsetMapA.set(status.utc_offset, zones);
  }

  for (const status of validStatusesB) {
    const zones = offsetMapB.get(status.utc_offset) || [];
    zones.push(status.zone);
    offsetMapB.set(status.utc_offset, zones);
  }

  const overlaps: Array<{
    offset: string;
    zonesA: string[];
    zonesB: string[];
  }> = [];

  Array.from(offsetMapA.entries()).forEach(([offset, zonesA]) => {
    if (offsetMapB.has(offset)) {
      overlaps.push({
        offset,
        zonesA,
        zonesB: offsetMapB.get(offset)!,
      });
    }
  });

  return {
    inputs: {
      countryA,
      countryB,
      year,
    },
    holidays: {
      common,
      onlyA,
      onlyB,
    },
    timezones: {
      A: validStatusesA,
      B: validStatusesB,
      commonOffsetNow: {
        hasOverlap: overlaps.length > 0,
        overlaps,
      },
    },
  };
}
