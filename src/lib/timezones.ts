/**
 * Airport timezone mapping for major international airports
 * Format: UTC offset in hours (can be fractional for :30/:45 offsets)
 */
export const AIRPORT_TIMEZONES: Record<string, { offset: number; abbr: string; name: string }> = {
  // Asia
  KTM: { offset: 5.75, abbr: "NPT", name: "Nepal Time" },
  DEL: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  BOM: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  BLR: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  MAA: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  CCU: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  HYD: { offset: 5.5, abbr: "IST", name: "India Standard Time" },
  DAC: { offset: 6, abbr: "BST", name: "Bangladesh Time" },
  CMB: { offset: 5.5, abbr: "SLST", name: "Sri Lanka Time" },
  ISB: { offset: 5, abbr: "PKT", name: "Pakistan Time" },
  KHI: { offset: 5, abbr: "PKT", name: "Pakistan Time" },
  LHE: { offset: 5, abbr: "PKT", name: "Pakistan Time" },
  BKK: { offset: 7, abbr: "ICT", name: "Indochina Time" },
  DMK: { offset: 7, abbr: "ICT", name: "Indochina Time" },
  SIN: { offset: 8, abbr: "SGT", name: "Singapore Time" },
  KUL: { offset: 8, abbr: "MYT", name: "Malaysia Time" },
  CGK: { offset: 7, abbr: "WIB", name: "Western Indonesia Time" },
  DPS: { offset: 8, abbr: "WITA", name: "Central Indonesia Time" },
  MNL: { offset: 8, abbr: "PHT", name: "Philippine Time" },
  SGN: { offset: 7, abbr: "ICT", name: "Indochina Time" },
  HAN: { offset: 7, abbr: "ICT", name: "Indochina Time" },
  HKG: { offset: 8, abbr: "HKT", name: "Hong Kong Time" },
  TPE: { offset: 8, abbr: "CST", name: "China Standard Time" },
  ICN: { offset: 9, abbr: "KST", name: "Korea Standard Time" },
  GMP: { offset: 9, abbr: "KST", name: "Korea Standard Time" },
  NRT: { offset: 9, abbr: "JST", name: "Japan Standard Time" },
  HND: { offset: 9, abbr: "JST", name: "Japan Standard Time" },
  KIX: { offset: 9, abbr: "JST", name: "Japan Standard Time" },
  PEK: { offset: 8, abbr: "CST", name: "China Standard Time" },
  PKX: { offset: 8, abbr: "CST", name: "China Standard Time" },
  PVG: { offset: 8, abbr: "CST", name: "China Standard Time" },
  SHA: { offset: 8, abbr: "CST", name: "China Standard Time" },
  CAN: { offset: 8, abbr: "CST", name: "China Standard Time" },
  SZX: { offset: 8, abbr: "CST", name: "China Standard Time" },
  MLE: { offset: 5, abbr: "MVT", name: "Maldives Time" },
  
  // Middle East
  DXB: { offset: 4, abbr: "GST", name: "Gulf Standard Time" },
  AUH: { offset: 4, abbr: "GST", name: "Gulf Standard Time" },
  DOH: { offset: 3, abbr: "AST", name: "Arabia Standard Time" },
  BAH: { offset: 3, abbr: "AST", name: "Arabia Standard Time" },
  MCT: { offset: 4, abbr: "GST", name: "Gulf Standard Time" },
  KWI: { offset: 3, abbr: "AST", name: "Arabia Standard Time" },
  RUH: { offset: 3, abbr: "AST", name: "Arabia Standard Time" },
  JED: { offset: 3, abbr: "AST", name: "Arabia Standard Time" },
  TLV: { offset: 2, abbr: "IST", name: "Israel Standard Time" },
  AMM: { offset: 3, abbr: "EET", name: "Eastern European Time" },
  BEY: { offset: 2, abbr: "EET", name: "Eastern European Time" },
  IST: { offset: 3, abbr: "TRT", name: "Turkey Time" },
  SAW: { offset: 3, abbr: "TRT", name: "Turkey Time" },
  
  // Oceania
  SYD: { offset: 11, abbr: "AEDT", name: "Australian Eastern Daylight Time" },
  MEL: { offset: 11, abbr: "AEDT", name: "Australian Eastern Daylight Time" },
  BNE: { offset: 10, abbr: "AEST", name: "Australian Eastern Standard Time" },
  PER: { offset: 8, abbr: "AWST", name: "Australian Western Standard Time" },
  ADL: { offset: 10.5, abbr: "ACDT", name: "Australian Central Daylight Time" },
  AKL: { offset: 13, abbr: "NZDT", name: "New Zealand Daylight Time" },
  CHC: { offset: 13, abbr: "NZDT", name: "New Zealand Daylight Time" },
  WLG: { offset: 13, abbr: "NZDT", name: "New Zealand Daylight Time" },
  NAN: { offset: 12, abbr: "FJT", name: "Fiji Time" },
  
  // Europe
  LHR: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  LGW: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  STN: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  LTN: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  MAN: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  EDI: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  CDG: { offset: 1, abbr: "CET", name: "Central European Time" },
  ORY: { offset: 1, abbr: "CET", name: "Central European Time" },
  NCE: { offset: 1, abbr: "CET", name: "Central European Time" },
  AMS: { offset: 1, abbr: "CET", name: "Central European Time" },
  FRA: { offset: 1, abbr: "CET", name: "Central European Time" },
  MUC: { offset: 1, abbr: "CET", name: "Central European Time" },
  BER: { offset: 1, abbr: "CET", name: "Central European Time" },
  ZRH: { offset: 1, abbr: "CET", name: "Central European Time" },
  GVA: { offset: 1, abbr: "CET", name: "Central European Time" },
  VIE: { offset: 1, abbr: "CET", name: "Central European Time" },
  PRG: { offset: 1, abbr: "CET", name: "Central European Time" },
  WAW: { offset: 1, abbr: "CET", name: "Central European Time" },
  BUD: { offset: 1, abbr: "CET", name: "Central European Time" },
  FCO: { offset: 1, abbr: "CET", name: "Central European Time" },
  MXP: { offset: 1, abbr: "CET", name: "Central European Time" },
  VCE: { offset: 1, abbr: "CET", name: "Central European Time" },
  MAD: { offset: 1, abbr: "CET", name: "Central European Time" },
  BCN: { offset: 1, abbr: "CET", name: "Central European Time" },
  LIS: { offset: 0, abbr: "WET", name: "Western European Time" },
  OPO: { offset: 0, abbr: "WET", name: "Western European Time" },
  ATH: { offset: 2, abbr: "EET", name: "Eastern European Time" },
  CPH: { offset: 1, abbr: "CET", name: "Central European Time" },
  OSL: { offset: 1, abbr: "CET", name: "Central European Time" },
  ARN: { offset: 1, abbr: "CET", name: "Central European Time" },
  HEL: { offset: 2, abbr: "EET", name: "Eastern European Time" },
  DUB: { offset: 0, abbr: "GMT", name: "Greenwich Mean Time" },
  BRU: { offset: 1, abbr: "CET", name: "Central European Time" },
  SVO: { offset: 3, abbr: "MSK", name: "Moscow Time" },
  DME: { offset: 3, abbr: "MSK", name: "Moscow Time" },
  LED: { offset: 3, abbr: "MSK", name: "Moscow Time" },
  
  // North America
  JFK: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  LGA: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  EWR: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  LAX: { offset: -8, abbr: "PST", name: "Pacific Standard Time" },
  SFO: { offset: -8, abbr: "PST", name: "Pacific Standard Time" },
  ORD: { offset: -6, abbr: "CST", name: "Central Standard Time" },
  MDW: { offset: -6, abbr: "CST", name: "Central Standard Time" },
  ATL: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  DFW: { offset: -6, abbr: "CST", name: "Central Standard Time" },
  DEN: { offset: -7, abbr: "MST", name: "Mountain Standard Time" },
  SEA: { offset: -8, abbr: "PST", name: "Pacific Standard Time" },
  MIA: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  BOS: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  IAD: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  DCA: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  PHX: { offset: -7, abbr: "MST", name: "Mountain Standard Time" },
  LAS: { offset: -8, abbr: "PST", name: "Pacific Standard Time" },
  MCO: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  HNL: { offset: -10, abbr: "HST", name: "Hawaii Standard Time" },
  YYZ: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  YVR: { offset: -8, abbr: "PST", name: "Pacific Standard Time" },
  YUL: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  YYC: { offset: -7, abbr: "MST", name: "Mountain Standard Time" },
  MEX: { offset: -6, abbr: "CST", name: "Central Standard Time" },
  CUN: { offset: -5, abbr: "EST", name: "Eastern Standard Time" },
  
  // South America
  GRU: { offset: -3, abbr: "BRT", name: "Brasilia Time" },
  GIG: { offset: -3, abbr: "BRT", name: "Brasilia Time" },
  EZE: { offset: -3, abbr: "ART", name: "Argentina Time" },
  SCL: { offset: -3, abbr: "CLT", name: "Chile Standard Time" },
  LIM: { offset: -5, abbr: "PET", name: "Peru Time" },
  BOG: { offset: -5, abbr: "COT", name: "Colombia Time" },
  UIO: { offset: -5, abbr: "ECT", name: "Ecuador Time" },
  CCS: { offset: -4, abbr: "VET", name: "Venezuela Time" },
  
  // Africa
  JNB: { offset: 2, abbr: "SAST", name: "South Africa Standard Time" },
  CPT: { offset: 2, abbr: "SAST", name: "South Africa Standard Time" },
  CAI: { offset: 2, abbr: "EET", name: "Eastern European Time" },
  NBO: { offset: 3, abbr: "EAT", name: "East Africa Time" },
  ADD: { offset: 3, abbr: "EAT", name: "East Africa Time" },
  LOS: { offset: 1, abbr: "WAT", name: "West Africa Time" },
  CMN: { offset: 1, abbr: "WEST", name: "Western European Summer Time" },
  TUN: { offset: 1, abbr: "CET", name: "Central European Time" },
  ALG: { offset: 1, abbr: "CET", name: "Central European Time" },
  MRU: { offset: 4, abbr: "MUT", name: "Mauritius Time" },
};

/**
 * Get timezone info for an airport code
 */
export function getAirportTimezone(code: string): { offset: number; abbr: string; name: string } | null {
  return AIRPORT_TIMEZONES[code.toUpperCase()] || null;
}

/**
 * Format timezone offset as string (e.g., "UTC+5:45" or "UTC-8")
 */
export function formatTimezoneOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '';
  const hours = Math.floor(Math.abs(offset));
  const minutes = Math.round((Math.abs(offset) - hours) * 60);
  
  if (minutes === 0) {
    return `UTC${sign}${offset}`;
  }
  return `UTC${sign}${offset >= 0 ? hours : -hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate day difference between departure and arrival
 * Returns number of days difference (0, 1, 2, etc.)
 */
export function calculateDayDifference(
  departureTime: string,
  durationMinutes: number,
  destinationCode?: string
): number {
  try {
    const departure = new Date(departureTime);
    const arrivalUTC = new Date(departure.getTime() + durationMinutes * 60 * 1000);
    
    // Get departure day (in departure timezone, approximated by the date in the ISO string)
    const departureDay = departure.getDate();
    
    // Calculate arrival day - if we have destination timezone, use it
    let arrivalDay: number;
    
    if (destinationCode && AIRPORT_TIMEZONES[destinationCode]) {
      const destOffset = AIRPORT_TIMEZONES[destinationCode].offset;
      const arrivalLocal = new Date(arrivalUTC.getTime() + destOffset * 60 * 60 * 1000);
      arrivalDay = arrivalLocal.getUTCDate();
    } else {
      // Fall back to simple day calculation
      arrivalDay = arrivalUTC.getDate();
    }
    
    // Calculate difference considering month boundaries
    const departureDate = new Date(departure.getFullYear(), departure.getMonth(), departureDay);
    const arrivalDate = new Date(arrivalUTC.getFullYear(), arrivalUTC.getMonth(), arrivalDay);
    
    const diffTime = arrivalDate.getTime() - departureDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Format day difference as string (e.g., "+1", "+2")
 */
export function formatDayDifference(days: number): string | null {
  if (days <= 0) return null;
  return `+${days}`;
}

// ── BF-0R-7: timezone-safe provider timestamp parsing ──────────────────
//
// Travelpayouts timestamps carry an explicit local offset (e.g.
// "2026-09-03T21:25:00+03:00"). `new Date(iso).toLocaleTimeString()` /
// `.toLocaleDateString()` re-interpret that instant through the *browser's*
// local timezone, which can display a different wall-clock time or even a
// different calendar date than what the provider actually stated — e.g. a
// departure timestamp with a +11:00 offset, reinterpreted through a
// browser running in UTC-8, shows the wrong hour and can cross a midnight
// boundary. The digits immediately after "T" in the ISO string ARE the
// provider's stated local date/time for that leg; reading them directly
// is correct, converting them through Date is not.

export interface ProviderLocalDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

/** Parse the calendar date + wall-clock time exactly as stated in a provider ISO 8601 timestamp. */
export function parseProviderLocalDateTime(isoTimestamp: string | null | undefined): ProviderLocalDateTime | null {
  if (!isoTimestamp) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(isoTimestamp);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

/** "HH:MM" as literally stated by the provider — never shifted by the browser's local timezone. */
export function formatProviderLocalTime(isoTimestamp: string | null | undefined): string {
  const parsed = parseProviderLocalDateTime(isoTimestamp);
  if (!parsed) return "";
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
}

/**
 * e.g. "Mon, Jan 30" as literally stated by the provider — never shifted by
 * the browser's local timezone. Anchored at UTC noon and formatted with
 * timeZone: 'UTC' so neither construction nor formatting can cross a day
 * boundary in the browser's local timezone.
 */
export function formatProviderLocalDate(isoTimestamp: string | null | undefined): string {
  const parsed = parseProviderLocalDateTime(isoTimestamp);
  if (!parsed) return "";
  const anchored = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
  return anchored.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}
