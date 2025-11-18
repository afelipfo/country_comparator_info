import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, Globe, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Country {
  name_es: string;
  name_en: string;
  iso2: string;
  iso3: string;
}

interface Holiday {
  date: string;
  nameA?: string;
  nameB?: string;
  name?: string;
}

interface ZoneStatus {
  zone: string;
  utc_offset: string;
  dst: boolean;
}

interface ComparisonResult {
  inputs: {
    countryA: string;
    countryB: string;
    year: number;
  };
  holidays: {
    common: Holiday[];
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

export default function Home() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryA, setCountryA] = useState<string>("");
  const [countryB, setCountryB] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [result, setResult] = useState<ComparisonResult | null>(null);

  // Cargar países usando tRPC
  const countriesQuery = trpc.country.getCountries.useQuery();

  useEffect(() => {
    if (countriesQuery.data) {
      setCountries(countriesQuery.data.countries);
    }
  }, [countriesQuery.data]);

  const [shouldCompare, setShouldCompare] = useState(false);

  // Query para comparar países
  const compareQuery = trpc.country.compare.useQuery(
    {
      countryA,
      countryB,
      year,
    },
    {
      enabled: shouldCompare && !!countryA && !!countryB && countryA !== countryB,
    }
  );

  // Manejar resultados de la comparación
  useEffect(() => {
    if (compareQuery.data && shouldCompare) {
      setResult(compareQuery.data);
      toast.success("Comparación completada exitosamente");
      setShouldCompare(false);
    }
  }, [compareQuery.data, shouldCompare]);

  useEffect(() => {
    if (compareQuery.error && shouldCompare) {
      toast.error("Error al realizar la comparación: " + compareQuery.error.message);
      console.error(compareQuery.error);
      setShouldCompare(false);
    }
  }, [compareQuery.error, shouldCompare]);

  const isComparing = compareQuery.isLoading || compareQuery.isFetching;

  const handleCompare = () => {
    if (!countryA || !countryB) {
      toast.error("Por favor selecciona ambos países");
      return;
    }

    if (countryA === countryB) {
      toast.error("Por favor selecciona dos países diferentes");
      return;
    }

    setResult(null);
    setShouldCompare(true);
  };

  const getCountryName = (iso2: string) => {
    const country = countries.find(c => c.iso2 === iso2);
    return country?.name_es || iso2;
  };

  const renderCalendar = (holidays: Holiday[], title: string) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const holidayDates = new Set(holidays.map(h => h.date));
    const commonDates = result?.holidays.common.map(h => h.date) || [];
    const commonDatesSet = new Set(commonDates);

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="grid grid-cols-3 gap-4">
          {months.map((month, idx) => {
            const monthNum = (idx + 1).toString().padStart(2, '0');
            const daysInMonth = new Date(year, idx + 1, 0).getDate();
            
            return (
              <div key={month} className="border rounded-lg p-3">
                <div className="font-medium text-sm mb-2 text-center">{month}</div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = (i + 1).toString().padStart(2, '0');
                    const dateStr = `${year}-${monthNum}-${day}`;
                    const isHoliday = holidayDates.has(dateStr);
                    const isCommon = commonDatesSet.has(dateStr);
                    
                    return (
                      <div
                        key={i}
                        className={`text-xs p-1 text-center rounded ${
                          isCommon
                            ? "bg-green-500 text-white font-bold"
                            : isHoliday
                            ? "bg-blue-400 text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Comparador de Países</h1>
          <p className="text-gray-600">Compara feriados y zonas horarias entre dos países</p>
        </div>

        {/* Selector Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Selecciona los países a comparar
            </CardTitle>
            <CardDescription>
              Elige dos países de la lista de 195 Estados Miembro de la ONU
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">País A</label>
                <Select value={countryA} onValueChange={setCountryA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona país A" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name_es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">País B</label>
                <Select value={countryB} onValueChange={setCountryB}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona país B" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name_es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Año</label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleCompare} 
              disabled={isComparing || !countryA || !countryB}
              className="w-full"
              size="lg"
            >
              {isComparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Comparando...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Comparar Países
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Timezone Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Comparación de Zonas Horarias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold mb-3">{getCountryName(result.inputs.countryA)}</h3>
                    <div className="space-y-2">
                      {result.timezones.A.map((tz) => (
                        <div key={tz.zone} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{tz.zone}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{tz.utc_offset}</span>
                            {tz.dst && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">DST</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">{getCountryName(result.inputs.countryB)}</h3>
                    <div className="space-y-2">
                      {result.timezones.B.map((tz) => (
                        <div key={tz.zone} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{tz.zone}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{tz.utc_offset}</span>
                            {tz.dst && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">DST</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {result.timezones.commonOffsetNow.hasOverlap && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">✓ Coincidencia de offset actual detectada</h4>
                    {result.timezones.commonOffsetNow.overlaps.map((overlap, idx) => (
                      <div key={idx} className="mb-2">
                        <p className="text-sm text-green-800">
                          <strong>Offset {overlap.offset}:</strong>
                        </p>
                        <p className="text-sm text-green-700">
                          {getCountryName(result.inputs.countryA)}: {overlap.zonesA.join(", ")}
                        </p>
                        <p className="text-sm text-green-700">
                          {getCountryName(result.inputs.countryB)}: {overlap.zonesB.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!result.timezones.commonOffsetNow.hasOverlap && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      No hay coincidencias de offset UTC entre estos países actualmente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Common Holidays */}
            <Card>
              <CardHeader>
                <CardTitle>Feriados en Común ({result.holidays.common.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {result.holidays.common.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-left p-2">{getCountryName(result.inputs.countryA)}</th>
                          <th className="text-left p-2">{getCountryName(result.inputs.countryB)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.holidays.common.map((holiday, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{holiday.date}</td>
                            <td className="p-2">{holiday.nameA}</td>
                            <td className="p-2">{holiday.nameB}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No hay feriados en común en {year}</p>
                )}
              </CardContent>
            </Card>

            {/* Unique Holidays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Solo en {getCountryName(result.inputs.countryA)} ({result.holidays.onlyA.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.holidays.onlyA.map((holiday, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm">{holiday.name}</span>
                        <span className="text-xs text-gray-600">{holiday.date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Solo en {getCountryName(result.inputs.countryB)} ({result.holidays.onlyB.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.holidays.onlyB.map((holiday, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                        <span className="text-sm">{holiday.name}</span>
                        <span className="text-xs text-gray-600">{holiday.date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendars */}
            <Card>
              <CardHeader>
                <CardTitle>Calendarios Anuales {year}</CardTitle>
                <CardDescription>
                  <span className="inline-block w-4 h-4 bg-green-500 rounded mr-2"></span>Feriados comunes
                  <span className="inline-block w-4 h-4 bg-blue-400 rounded mx-2"></span>Feriados únicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderCalendar(
                    [...result.holidays.common.map(h => ({ ...h, date: h.date })), ...result.holidays.onlyA],
                    getCountryName(result.inputs.countryA)
                  )}
                  {renderCalendar(
                    [...result.holidays.common.map(h => ({ ...h, date: h.date })), ...result.holidays.onlyB],
                    getCountryName(result.inputs.countryB)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
