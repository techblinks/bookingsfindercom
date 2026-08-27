// BF1-B importer CLI. Admin path: Management API SQL using stored Supabase CLI credential
// (read in-memory, never printed/committed). Idempotent: safe to re-run.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseCountries,
  parseAirlines,
  parseAirports,
  parseCities,
  parseMetroCsv,
  planDiff,
  foldName,
  type CountryRow,
  type CityRow,
  type AirportRow,
  type AirlineRow,
} from './lib.ts';

const SNAPSHOT = '2026-08-25';
const RAW = 'scripts/reference-data/raw/';
const read = (f: string) => readFileSync(RAW + f, 'utf8');

// --- token + query channel ---
const TOKEN = execSync(
  'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/reference-data/get-token.ps1',
  { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
).trim();
if (!TOKEN || TOKEN.length < 20) {
  console.error(JSON.stringify({ error: 'token unavailable' }));
  process.exit(1);
}
const API = 'https://api.supabase.com/v1/projects/pjehrnhmjrxrlrhuhqgf/database/query';
async function Q(sql: string): Promise<Array<Record<string, unknown>>> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    if (r.status === 429 && attempt < 6) {
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      continue;
    }
    const j = (await r.json()) as unknown;
    if (!r.ok)
      throw new Error(`query failed ${r.status}: ${JSON.stringify(j).slice(0, 300)}\nSQL: ${sql.slice(0, 160)}`);
    return Array.isArray(j) ? (j as Array<Record<string, unknown>>) : [];
  }
}
const esc = (v: unknown): string =>
  v === null || v === undefined || v === '' ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
async function insertBatch(table: string, cols: string[], rows: unknown[][]) {
  for (let i = 0; i < rows.length; i += 250) {
    const chunk = rows.slice(i, i + 250);
    const values = chunk.map((r) => '(' + r.map(esc).join(',') + ')').join(',');
    await Q(`insert into public.${table} (${cols.join(',')}) values ${values} on conflict do nothing;`);
    await new Promise((res) => setTimeout(res, 300));
  }
}
async function applyUpdates(table: string, keyCol: string, updates: Array<{ key: string | number; changes: Record<string, unknown> }>) {
  for (const u of updates) {
    const sets = Object.entries(u.changes)
      .map(([c, v]) => `${c}=${esc(v)}`)
      .join(',');
    await Q(`update public.${table} set ${sets}, imported_at=now() where ${keyCol}=${esc(u.key)};`);
    await new Promise((res) => setTimeout(res, 60));
  }
}

(async () => {
  // ---- parse sources ----
  const countries = parseCountries(read('countries.json'), SNAPSHOT);
  const isoByName = new Map<string, string>(countries.rows.map((c) => [foldName(c.name), c.iso2]));
  const citiesParsed = parseCities(read('cities15000.txt'), SNAPSHOT);
  const airportsParsed = parseAirports(read('airports.csv'), SNAPSHOT);
  const airlinesParsed = parseAirlines(read('airlines.dat'), SNAPSHOT, isoByName);
  const metro = parseMetroCsv(readFileSync('scripts/reference-data/metro-airports.csv', 'utf8'));

  // ---- existing state ----
  const dbCountries = await Q(`select iso2,iso3,name,currency_code from public.countries;`);
  const dbCities = await Q(`select id,name,country_iso2,latitude,longitude,population,timezone,is_metro,iata_code from public.cities;`);
  const dbAirports = await Q(`select iata,icao,name,municipality,country_iso2,latitude,longitude,airport_type,is_active from public.airports;`);
  const dbAirlines = await Q(`select id,iata,icao,name,country_iso2,is_active from public.airlines;`);
  const dbMetro = await Q(`select metro_code,airport_iata from public.metro_airports;`);

  // ---- countries ----
  const dCountries = planDiff(dbCountries, countries.rows, {
    keyOf: (r: CountryRow) => r.iso2,
    dbKeyField: 'iso2',
    compare: [
      { field: 'iso3', dbField: 'iso3' },
      { field: 'name', dbField: 'name' },
      { field: 'currency_code', dbField: 'currency_code' },
    ],
  });
  await insertBatch(
    'countries',
    ['iso2', 'iso3', 'name', 'currency_code', 'source', 'source_record_id'],
    dCountries.inserts.map((r) => [r.iso2, r.iso3, r.name, r.currency_code, r.source, r.source_record_id])
  );
  await applyUpdates('countries', 'iso2', dCountries.updates);

  // ---- cities ----
  const knownIso2 = new Set([...dbCountries.map((c) => String(c.iso2)), ...countries.rows.map((c) => c.iso2)]);
  const citiesValid = citiesParsed.rows.filter((c) => {
    if (!knownIso2.has(c.country_iso2)) {
      citiesParsed.stats.rejected++;
      if (citiesParsed.stats.rejectionSamples.length < 10)
        citiesParsed.stats.rejectionSamples.push(`city ${c.id}: country '${c.country_iso2}' not in countries`);
      return false;
    }
    return true;
  });
  const dCities = planDiff(dbCities, citiesValid, {
    keyOf: (r: CityRow) => r.id,
    dbKeyField: 'id',
    compare: [
      { field: 'name', dbField: 'name' },
      { field: 'country_iso2', dbField: 'country_iso2' },
      { field: 'latitude', dbField: 'latitude' },
      { field: 'longitude', dbField: 'longitude' },
      { field: 'population', dbField: 'population' },
      { field: 'timezone', dbField: 'timezone' },
    ],
  });
  await insertBatch(
    'cities',
    ['id', 'name', 'country_iso2', 'latitude', 'longitude', 'population', 'timezone', 'source', 'source_record_id'],
    dCities.inserts.map((r) => [r.id, r.name, r.country_iso2, r.latitude, r.longitude, r.population, r.timezone, r.source, r.source_record_id])
  );
  await applyUpdates('cities', 'id', dCities.updates);

  // ---- metro hosts ----
  const cityPool = [...dbCities.map((c) => ({ id: Number(c.id), n: foldName(String(c.name)), c: String(c.country_iso2), pop: Number(c.population ?? 0) })), ...dCities.inserts.map((r) => ({ id: r.id, n: foldName(r.name), c: r.country_iso2, pop: r.population ?? 0 }))];
  const byMetro = new Map<string, { country: string; aliases: string[]; aps: Array<{ iata: string; rank: number }> }>();
  const metroRejected: string[] = [];
  for (const m of metro.rows) {
    if (!byMetro.has(m.metroCode)) byMetro.set(m.metroCode, { country: m.countryIso2, aliases: m.hostAliases, aps: [] });
    const entry = byMetro.get(m.metroCode)!;
    m.hostAliases.forEach((a) => entry.aliases.includes(a) || entry.aliases.push(a));
    const apOk = airportsParsed.rows.some((a) => a.iata === m.airportIata);
    if (!apOk) {
      metroRejected.push(`${m.metroCode}->${m.airportIata}: airport absent from accepted snapshot`);
      continue;
    }
    entry.aps.push({ iata: m.airportIata, rank: m.rank });
  }
  let syntheticSeq = 0;
  const metroHostUpdates: Array<{ key: number; changes: Record<string, unknown> }> = [];
  const dbCityById = new Map(dbCities.map((c) => [String(c.id), c]));
  const syntheticHosts: CityRow[] = [];
  for (const [code, info] of byMetro) {
    if (info.aps.length === 0) continue;
    const candidates = cityPool.filter((c) => c.c === info.country && info.aliases.includes(c.n));
    if (candidates.length > 0) {
      const host = candidates.reduce((a, b) => (b.pop > a.pop ? b : a));
      // Idempotency: skip hosts already converged (is_metro=true AND iata_code=code in DB)
      const cur = dbCityById.get(String(host.id));
      if (cur && cur.is_metro === true && String(cur.iata_code ?? '') === code) continue;
      metroHostUpdates.push({ key: host.id, changes: { is_metro: true, iata_code: code } });
    } else {
      const aps = info.aps.map((a) => airportsParsed.rows.find((x) => x.iata === a.iata)!);
      const lat = aps.reduce((s, a) => s + a.latitude, 0) / aps.length;
      const lon = aps.reduce((s, a) => s + a.longitude, 0) / aps.length;
      syntheticSeq++;
      const id = -1000 - syntheticSeq;
      const name = info.aliases[0];
      syntheticHosts.push({
        id,
        name,
        country_iso2: info.country,
        latitude: Math.round(lat * 1e4) / 1e4,
        longitude: Math.round(lon * 1e4) / 1e4,
        population: null,
        timezone: null,
        source: `curated-metro@${SNAPSHOT}`,
        source_record_id: `synthetic:${code}`,
      });
      metroHostUpdates.push({ key: id, changes: { is_metro: true, iata_code: code } });
    }
  }
  if (syntheticHosts.length) {
    await insertBatch(
      'cities',
      ['id', 'name', 'country_iso2', 'latitude', 'longitude', 'population', 'timezone', 'iata_code', 'is_metro', 'source', 'source_record_id'],
      syntheticHosts.map((r) => [r.id, r.name, r.country_iso2, r.latitude, r.longitude, null, null, null, false, r.source, r.source_record_id])
    );
  }
  await applyUpdates('cities', 'id', metroHostUpdates);

  // ---- airports (city link resolved against final pool incl. synthetics) ----
  const cityIndex = new Map<string, number>();
  for (const c of [...cityPool.map((c) => ({ id: c.id, k: c.c + '|' + c.n, pop: c.pop })), ...syntheticHosts.map((r) => ({ id: r.id, k: r.country_iso2 + '|' + foldName(r.name), pop: 0 }))])
    if (!cityIndex.has(c.k) || c.pop > 0) cityIndex.set(c.k, c.id);
  const airportsWithCity = airportsParsed.rows.map((a) => ({
    ...a,
    city_id: cityIndex.get(a.country_iso2 + '|' + foldName(a.municipality ?? '')) ?? null,
  }));
  const dAirports = planDiff(dbAirports, airportsWithCity, {
    keyOf: (r: AirportRow & { city_id?: number | null }) => r.iata,
    dbKeyField: 'iata',
    compare: [
      { field: 'icao', dbField: 'icao' },
      { field: 'name', dbField: 'name' },
      { field: 'municipality', dbField: 'municipality' },
      { field: 'country_iso2', dbField: 'country_iso2' },
      { field: 'latitude', dbField: 'latitude' },
      { field: 'longitude', dbField: 'longitude' },
      { field: 'airport_type', dbField: 'airport_type' },
      { field: 'is_active', dbField: 'is_active' },
    ],
  });
  await insertBatch(
    'airports',
    ['iata', 'icao', 'name', 'city_id', 'municipality', 'country_iso2', 'latitude', 'longitude', 'airport_type', 'is_active', 'source', 'source_record_id'],
    dAirports.inserts.map((r) => [r.iata, r.icao, r.name, r.city_id ?? null, r.municipality, r.country_iso2, r.latitude, r.longitude, r.airport_type, r.is_active, r.source, r.source_record_id])
  );
  await applyUpdates('airports', 'iata', dAirports.updates);
  const activeIatas = new Set(airportsWithCity.map((a) => a.iata));
  const deadAirports = dbAirports.filter((a) => String(a.iata) !== '' && !activeIatas.has(String(a.iata)) && a.is_active !== false).map((a) => String(a.iata));
  if (deadAirports.length) await Q(`update public.airports set is_active=false where iata in (${deadAirports.map(esc).join(',')});`);

  // ---- airlines ----
  const dAirlines = planDiff(dbAirlines, airlinesParsed.rows, {
    keyOf: (r: AirlineRow) => r.id,
    dbKeyField: 'id',
    compare: [
      { field: 'iata', dbField: 'iata' },
      { field: 'icao', dbField: 'icao' },
      { field: 'name', dbField: 'name' },
      { field: 'country_iso2', dbField: 'country_iso2' },
      { field: 'is_active', dbField: 'is_active' },
    ],
  });
  await insertBatch(
    'airlines',
    ['id', 'iata', 'icao', 'name', 'country_iso2', 'is_active', 'source', 'source_record_id'],
    dAirlines.inserts.map((r) => [r.id, r.iata, r.icao, r.name, r.country_iso2, r.is_active, r.source, r.source_record_id])
  );
  await applyUpdates('airlines', 'id', dAirlines.updates);
  const activeAirlineIds = new Set(airlinesParsed.rows.map((a) => String(a.id)));
  const deadAirlines = dbAirlines.filter((a) => !activeAirlineIds.has(String(a.id)) && a.is_active !== false).map((a) => Number(a.id));
  if (deadAirlines.length) await Q(`update public.airlines set is_active=false where id in (${deadAirlines.map(esc).join(',')});`);

  // ---- metro mappings (curated file is source of truth; explicit removal allowed) ----
  const wantMetro = new Set<string>();
  const metroRows: unknown[][] = [];
  for (const [code, info] of byMetro) for (const ap of info.aps) {
    wantMetro.add(code + '|' + ap.iata);
    metroRows.push([code, ap.iata, ap.rank, `curated-metro@${SNAPSHOT}`, code]);
  }
  const existingMetro = new Set(dbMetro.map((m) => `${m.metro_code}|${m.airport_iata}`));
  const metroNew = metroRows.filter((r) => !existingMetro.has(r[0] + '|' + r[1]));
  await insertBatch('metro_airports', ['metro_code', 'airport_iata', 'rank', 'source', 'source_record_id'], metroNew);
  const removedMetro = [...existingMetro].filter((k) => !wantMetro.has(k));
  if (removedMetro.length)
    await Q(`delete from public.metro_airports where (metro_code||'|'||airport_iata) in (${removedMetro.map((k) => `'${k.replace(/'/g, "''")}'`).join(',')});`);

  console.log(
    JSON.stringify(
      {
        snapshot: SNAPSHOT,
        countries: { accepted: countries.rows.length, inserted: dCountries.inserts.length, updated: dCountries.updates.length, unchanged: dCountries.unchanged, rejected: countries.stats.rejected, samples: countries.stats.rejectionSamples },
        cities: { parsed: citiesParsed.stats.parsed, accepted: citiesValid.length, inserted: dCities.inserts.length, updated: dCities.updates.length + metroHostUpdates.filter((u) => u.key > 0).length, unchanged: dCities.unchanged, rejected: citiesParsed.stats.rejected, samples: citiesParsed.stats.rejectionSamples.slice(0, 5) },
        airports: { parsed: airportsParsed.stats.parsed, noIataSkipped: airportsParsed.stats.noIata, accepted: airportsWithCity.length, inserted: dAirports.inserts.length, updated: dAirports.updates.length, unchanged: dAirports.unchanged, dupesResolved: airportsParsed.stats.dupesResolved, deactivated: deadAirports.length, withCityLink: airportsWithCity.filter((a) => a.city_id !== null).length, rejected: airportsParsed.stats.rejected, samples: airportsParsed.stats.rejectionSamples },
        // icaoCollisionsResolved: rows deterministically excluded at parse time because another
        // row already holds their non-null ICAO (explicit reporting — see lib.ts parseAirlines).
        airlines: { parsed: airlinesParsed.stats.parsed, accepted: airlinesParsed.rows.length, inserted: dAirlines.inserts.length, updated: dAirlines.updates.length, unchanged: dAirlines.unchanged, dupesResolved: airlinesParsed.stats.dupesResolved, icaoCollisionsResolved: airlinesParsed.stats.icaoCollisionsResolved ?? 0, collisionSamples: airlinesParsed.stats.collisionSamples ?? [], deactivated: deadAirlines.length, rejected: airlinesParsed.stats.rejected, samples: airlinesParsed.stats.rejectionSamples.slice(0, 10) },
        metro: { codes: byMetro.size, mappingsWanted: wantMetro.size, mappingsInserted: metroNew.length, mappingsRemoved: removedMetro.length, rejectedMappings: metroRejected, syntheticHosts: syntheticHosts.map((h) => h.source_record_id) },
      },
      null,
      1
    )
  );
})().catch((e) => {
  console.error('IMPORT FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
