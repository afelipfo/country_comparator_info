import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import {
  compareCountries,
  getCountries,
  getHolidays,
  getTimezones,
  getZoneStatus,
} from "./countryHelpers";

export const countryRouter = router({
  // GET /api/countries
  getCountries: publicProcedure.query(() => {
    return getCountries();
  }),

  // GET /api/holidays?country=CC&year=YYYY
  getHolidays: publicProcedure
    .input(
      z.object({
        country: z.string().length(2),
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const holidays = await getHolidays(input.country, input.year);
      return holidays;
    }),

  // GET /api/timezones?country=CC
  getTimezones: publicProcedure
    .input(
      z.object({
        country: z.string().length(2),
      })
    )
    .query(({ input }) => {
      const timezones = getTimezones(input.country);
      return timezones;
    }),

  // GET /api/zone-status?zone=Area/City
  getZoneStatus: publicProcedure
    .input(
      z.object({
        zone: z.string(),
      })
    )
    .query(async ({ input }) => {
      const status = await getZoneStatus(input.zone);
      return status;
    }),

  // GET /api/compare?countryA=CC&countryB=CC&year=YYYY
  compare: publicProcedure
    .input(
      z.object({
        countryA: z.string().length(2),
        countryB: z.string().length(2),
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const result = await compareCountries(
        input.countryA,
        input.countryB,
        input.year
      );
      return result;
    }),
});
