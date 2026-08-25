// BF1-B reference-data importer library — PURE functions only (Node type-stripping compatible).
// No IO here; run.ts handles fetching/executing. All parsers return {rows, stats} so the CLI
// can report inserted/updated/unchanged/deactivated/rejected precisely.

export interface Stats {
  parsed: number;
  accepted: number;
  rejected: number;
  noIata?: number;
  dupesResolved?: number;
  icaoCollisionsResolved?: number;
  collisionSamples?: string[];
  rejectionSamples: string[];
}
export interface WithStats<T> {
  rows: T[];
  stats: Stats;
}

// ---------- normalisation / validation ----------
export function foldName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
export const isValidIata3 = (s: string | null | undefined): s is string =>
  !!s && /^[A-Z]{3}$/.test(s);
export const isValidIata2 = (s: string | null | undefined): s is string =>
  !!s && /^[A-Z0-9]{2}$/.test(s);
export const isValidIcao = (s: string | null | undefined, len: number): s is string =>
  !!s && new RegExp(`^[A-Z]{${len}}$`).test(s);
export const validLatLon = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

function rej(stats: Stats, msg: string) {
  stats.rejected++;
  if (stats.rejectionSamples.length < 10) stats.rejectionSamples.push(msg);
}

// ---------- countries (mledoze/countries) ----------
export interface CountryRow {
  iso2: string;
  iso3: string;
  name: string;
  currency_code: string | null;
  source: string;
  source_record_id: string;
}
export function parseCountries(jsonText: string, snapshot: string): WithStats<CountryRow> {
  const stats: Stats = { parsed: 0, accepted: 0, rejected: 0, rejectionSamples: [] };
  const arr = JSON.parse(jsonText) as Array<Record<string, unknown>>;
  const seenIso2 = new Set<string>();
  const seenIso3 = new Set<string>();
  const rows: CountryRow[] = [];
  for (const c of arr) {
    stats.parsed++;
    const iso2 = String(c.cca2 ?? '');
    const iso3 = String(c.cca3 ?? '');
    const name = String((c.name as Record<string, unknown>)?.common ?? '');
    if (!/^[A-Z]{2}$/.test(iso2)) {
      rej(stats, `countries: bad iso2 '${iso2}'`);
      continue;
    }
    if (!/^[A-Z]{3}$/.test(iso3)) {
      rej(stats, `countries: bad iso3 '${iso3}'`);
      continue;
    }
    if (!name) {
      rej(stats, 'countries: empty name');
      continue;
    }
    if (seenIso2.has(iso2) || seenIso3.has(iso3)) {
      rej(stats, `countries: duplicate ${iso2}/${iso3}`);
      continue;
    }
    seenIso2.add(iso2);
    seenIso3.add(iso3);
    const currencies = (c.currency as string[] | undefined) ?? [];
    const cur = currencies.length > 0 && /^[A-Z]{3}$/.test(currencies[0]) ? currencies[0] : null;
    rows.push({ iso2, iso3, name, currency_code: cur, source: `mledoze-countries@${snapshot}`, source_record_id: iso3 });
    stats.accepted++;
  }
  return { rows, stats };
}

// ---------- airports (OurAirports) ----------
export interface AirportRow {
  iata: string;
  icao: string | null;
  name: string;
  municipality: string | null;
  country_iso2: string;
  latitude: number;
  longitude: number;
  airport_type: string;
  is_active: boolean;
  source: string;
  source_record_id: string;
}
const TYPE_RANK: Record<string, number> = {
  large_airport: 5,
  medium_airport: 4,
  small_airport: 3,
  seaplane_base: 2,
  heliport: 1,
  balloonport: 0,
  closed: -1,
};
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
export function parseAirports(csvText: string, snapshot: string): WithStats<AirportRow> {
  const stats: Stats = { parsed: 0, accepted: 0, rejected: 0, noIata: 0, dupesResolved: 0, rejectionSamples: [] };
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsvLine(lines.shift()!);
  const idx = (n: string) => header.findIndex((h) => h.replace(/"/g, '') === n);
  const cId = idx('id'),
    cType = idx('type'),
    cName = idx('name'),
    cLat = idx('latitude_deg'),
    cLon = idx('longitude_deg'),
    cCountry = idx('iso_country'),
    cMuni = idx('municipality'),
    cIata = idx('iata_code'),
    cGps = idx('gps_code');
  if ([cId, cType, cName, cLat, cLon, cCountry, cIata].some((i) => i < 0))
    throw new Error('airports.csv: unexpected column layout');
  const best = new Map<string, AirportRow>();
  for (const line of lines) {
    stats.parsed++;
    const f = splitCsvLine(line);
    const iata = f[cIata]?.trim();
    if (!isValidIata3(iata)) {
      stats.noIata!++;
      continue; // bounded v1: IATA-bearing airports only (documented divergence)
    }
    const lat = parseFloat(f[cLat]);
    const lon = parseFloat(f[cLon]);
    const country = f[cCountry]?.trim();
    if (!validLatLon(lat, lon)) {
      rej(stats, `airport ${iata}: bad coords`);
      continue;
    }
    if (!/^[A-Z]{2}$/.test(country)) {
      rej(stats, `airport ${iata}: bad country '${country}'`);
      continue;
    }
    const type = f[cType]?.trim() || 'unknown';
    const icaoRaw = f[cGps]?.trim();
    const row: AirportRow = {
      iata,
      icao: isValidIcao(icaoRaw, 4) ? icaoRaw : null,
      name: f[cName]?.trim() || iata,
      municipality: f[cMuni]?.trim() || null,
      country_iso2: country,
      latitude: lat,
      longitude: lon,
      airport_type: type,
      is_active: type !== 'closed',
      source: `ourairports@${snapshot}`,
      source_record_id: f[cId]?.trim(),
    };
    const prev = best.get(iata);
    if (!prev || (TYPE_RANK[type] ?? 0) > (TYPE_RANK[prev.airport_type] ?? 0)) {
      if (prev) stats.dupesResolved!++;
      best.set(iata, row);
    } else stats.dupesResolved!++;
  }
  return { rows: [...best.values()], stats };
}

// ---------- cities (GeoNames cities15000) ----------
export interface CityRow {
  id: number;
  name: string;
  country_iso2: string;
  latitude: number;
  longitude: number;
  population: number | null;
  timezone: string | null;
  source: string;
  source_record_id: string;
}
export function parseCities(txt: string, snapshot: string): WithStats<CityRow> {
  const stats: Stats = { parsed: 0, accepted: 0, rejected: 0, rejectionSamples: [] };
  const rows: CityRow[] = [];
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim()) continue;
    stats.parsed++;
    const f = line.split('\t');
    if (f.length < 18) {
      rej(stats, `city: short line '${f.slice(0, 2).join('/')}'`);
      continue;
    }
    const id = parseInt(f[0], 10);
    const name = f[1];
    const lat = parseFloat(f[4]);
    const lon = parseFloat(f[5]);
    const country = f[8];
    const pop = parseInt(f[14], 10);
    const tz = f[17] || null;
    if (!Number.isFinite(id) || !name || !/^[A-Z]{2}$/.test(country) || !validLatLon(lat, lon)) {
      rej(stats, `city ${id}/${name}: invalid core fields`);
      continue;
    }
    rows.push({
      id,
      name,
      country_iso2: country,
      latitude: lat,
      longitude: lon,
      population: Number.isFinite(pop) ? pop : null,
      timezone: tz,
      source: `geonames@${snapshot}`,
      source_record_id: String(id),
    });
    stats.accepted++;
  }
  return { rows, stats };
}

// ---------- airlines (OpenFlights) ----------
export interface AirlineRow {
  id: number;
  iata: string | null;
  icao: string | null;
  name: string;
  country_iso2: string | null;
  is_active: boolean | null;
  source: string;
  source_record_id: string;
}
export function parseAirlines(
  datText: string,
  snapshot: string,
  nameToIso2: Map<string, string>
): WithStats<AirlineRow> {
  const stats: Stats = { parsed: 0, accepted: 0, rejected: 0, dupesResolved: 0, rejectionSamples: [] };
  const all: AirlineRow[] = [];
  for (const line of datText.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    stats.parsed++;
    const f = splitCsvLine(line);
    const id = parseInt(f[0]?.replace(/["']/g, ''), 10);
    const name = (f[1] ?? '').replace(/["']/g, '').trim();
    if (!Number.isFinite(id) || !name) {
      rej(stats, `airline '${f[0]}': bad id/name`);
      continue;
    }
    const iata = isValidIata2(f[3]?.replace(/["']/g, '')) ? f[3].replace(/["']/g, '') : null;
    const icaoRaw = (f[4] ?? '').replace(/["']/g, '').trim();
    const icao = isValidIcao(icaoRaw, 3) ? icaoRaw : null;
    const countryName = (f[6] ?? '').replace(/["']/g, '').trim();
    const activeRaw = (f[7] ?? '').replace(/["']/g, '').trim().toLowerCase();
    const iso2 =
      countryName && nameToIso2.has(foldName(countryName))
        ? nameToIso2.get(foldName(countryName))!
        : countryName === ''
          ? null
          : (() => {
              rej(stats, `airline ${id}: unknown country '${countryName}'`);
              return null;
            })();
    const isActive = activeRaw === 'y' ? true : activeRaw === 'n' ? false : null;
    const row: AirlineRow = {
      id,
      iata,
      icao,
      name,
      country_iso2: iso2,
      is_active: isActive,
      source: `openflights@${snapshot}`,
      source_record_id: String(id),
    };
    all.push(row);
    stats.accepted++;
  }
  // Global duplicate resolution: exactly ONE row keeps a colliding IATA (active preferred,
  // then lowest id). Losers KEEP their record but shed the code — no drops, no unique violations.
  const byIata = new Map<string, AirlineRow[]>();
  for (const r of all) {
    if (!r.iata) continue;
    const g = byIata.get(r.iata);
    if (g) g.push(r);
    else byIata.set(r.iata, [r]);
  }
  for (const group of byIata.values()) {
    if (group.length < 2) continue;
    stats.dupesResolved! += group.length - 1;
    group.sort((a, b) => (b.is_active === true ? 1 : 0) - (a.is_active === true ? 1 : 0) || a.id - b.id);
    for (let i = 1; i < group.length; i++) group[i].iata = null;
  }
  // Global ICAO collision resolution: the partial unique index admits only ONE row per non-null
  // ICAO. Deterministic rule mirrors historical DB behaviour exactly — FIRST occurrence in file
  // order keeps the code and is stored; every later member of the group is REJECTED as
  // collision-resolved (explicitly counted + sampled here, never silently swallowed by
  // ON CONFLICT DO NOTHING at write time).
  stats.icaoCollisionsResolved = 0;
  stats.collisionSamples = [];
  const byIcao = new Map<string, AirlineRow[]>();
  for (const r of all) {
    if (!r.icao) continue;
    const g = byIcao.get(r.icao);
    if (g) g.push(r);
    else byIcao.set(r.icao, [r]);
  }
  const icaoDropped = new Set<number>();
  for (const [icaoCode, group] of byIcao) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) {
      stats.icaoCollisionsResolved!++;
      if (stats.collisionSamples!.length < 10)
        stats.collisionSamples!.push(
          `airline ${group[i].id} '${group[i].name}' ICAO ${icaoCode} already held by airline ${group[0].id} '${group[0].name}'; record rejected (collision-resolved)`
        );
      icaoDropped.add(group[i].id);
    }
  }
  const best = new Map<string, AirlineRow>();
  for (const r of all) {
    if (icaoDropped.has(r.id)) continue;
    best.set(String(r.id), r);
  }
  return { rows: [...best.values()], stats };
}

// ---------- metro mapping (curated CSV) ----------
export interface MetroMappingRow {
  metroCode: string;
  countryIso2: string;
  hostAliases: string[];
  airportIata: string;
  rank: number;
}
export function parseMetroCsv(csvText: string): WithStats<MetroMappingRow> {
  const stats: Stats = { parsed: 0, accepted: 0, rejected: 0, rejectionSamples: [] };
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  lines.shift(); // header
  const rows: MetroMappingRow[] = [];
  for (const line of lines) {
    stats.parsed++;
    const f = splitCsvLine(line);
    const [code, country, alias, ap, rankStr] = f.map((x) => x.trim());
    if (
      !isValidIata3(code) ||
      !/^[A-Z]{2}$/.test(country) ||
      !alias ||
      !isValidIata3(ap) ||
      !/^[1-9]$/.test(rankStr)
    ) {
      rej(stats, `metro row malformed: '${line.slice(0, 60)}'`);
      continue;
    }
    rows.push({
      metroCode: code,
      countryIso2: country,
      hostAliases: alias.split('|').map((a) => foldName(a)),
      airportIata: ap,
      rank: parseInt(rankStr, 10),
    });
    stats.accepted++;
  }
  return { rows, stats };
}

// ---------- generic upsert planning (idempotency core) ----------
export interface DiffResult<K, T> {
  inserts: T[];
  updates: Array<{ key: K; changes: Partial<T> }>;
  unchanged: number;
}
type FieldPicker<K, T> = {
  keyOf: (row: T) => K;
  dbKeyField: string;
  compare: Array<{ field: keyof T; dbField: string }>;
};
export function planDiff<K extends string | number, T extends Record<string, unknown>>(
  existing: Array<Record<string, unknown>>,
  incoming: T[],
  spec: FieldPicker<K, T>
): DiffResult<K, T> {
  const dbMap = new Map<string, Record<string, unknown>>();
  for (const e of existing) dbMap.set(String(e[spec.dbKeyField]), e);
  const res: DiffResult<K, T> = { inserts: [], updates: [], unchanged: 0 };
  const seen = new Set<string>();
  for (const inc of incoming) {
    const k = String(spec.keyOf(inc));
    seen.add(k);
    const db = dbMap.get(k);
    if (!db) {
      res.inserts.push(inc);
      continue;
    }
    const changes: Partial<T> = {};
    let differs = false;
    const numEq = (x: unknown, y: unknown): boolean | null => {
      const toN = (v: unknown): number | null =>
        typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
      const nx = toN(x);
      const ny = toN(y);
      return nx !== null && ny !== null ? Math.abs(nx - ny) < 1e-9 : null;
    };
    for (const cmp of spec.compare) {
      const dbVal = db[cmp.dbField];
      const inVal = inc[cmp.field];
      let neq: boolean;
      const nres = numEq(dbVal, inVal);
      if (nres !== null) neq = nres;
      else {
        const d = dbVal === undefined || dbVal === null ? 'null' : String(dbVal);
        const i2 = inVal === undefined || inVal === null ? 'null' : String(inVal);
        neq = d === i2;
      }
      if (!neq) {
        (changes as Record<string, unknown>)[cmp.field as string] = inVal;
        differs = true;
      }
    }
    if (differs) res.updates.push({ key: spec.keyOf(inc), changes });
    else res.unchanged++;
  }
  return res;
}
