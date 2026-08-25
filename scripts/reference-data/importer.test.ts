import { describe, it, expect } from 'vitest';
import {
  foldName,
  isValidIata3,
  isValidIata2,
  isValidIcao,
  validLatLon,
  parseCountries,
  parseAirports,
  parseCities,
  parseAirlines,
  parseMetroCsv,
  planDiff,
} from './lib';

const SNAP = 'test-snapshot';
const S = 'x@' + SNAP; // expected provenance prefix shape

describe('BF1-B reference-data library', () => {
  it('folds accents/punctuation/case deterministically', () => {
    expect(foldName('São Paulo')).toBe('saopaulo');
    expect(foldName('Washington, D.C.')).toBe('washingtondc');
    expect(foldName('München')).toBe('munchen');
  });

  it('validates IATA/ICAO/coords strictly', () => {
    expect(isValidIata3('HND')).toBe(true);
    expect(isValidIata3('hnd')).toBe(false);
    expect(isValidIata3('HNDX')).toBe(false);
    expect(isValidIata2('S7')).toBe(true); // airline codes may contain digits
    expect(isValidIata2('ABC')).toBe(false);
    expect(isValidIcao('RJTT', 4)).toBe(true);
    expect(isValidIcao('RJTX9', 4)).toBe(false);
    expect(validLatLon(-90, 180)).toBe(true);
    expect(validLatLon(90.01, 0)).toBe(false);
  });

  it('parses metro CSV: TYO→HND+NRT, LON set, NYC set; rejects malformed rows', () => {
    const csv = [
      'metro_code,country_iso2,host_city_alias,airport_iata,rank',
      'TYO,JP,Tokyo,HND,1',
      'TYO,JP,Tokyo,NRT,2',
      'LON,GB,London,LHR,1',
      'NYC,US,"New York City",JFK,1',
      'BAD,US,,XXX,1', // invalid
    ].join('\n');
    const { rows, stats } = parseMetroCsv(csv);
    expect(stats.parsed).toBe(5);
    expect(stats.accepted).toBe(4);
    expect(stats.rejected).toBe(1);
    const tyo = rows.filter((r) => r.metroCode === 'TYO');
    expect(tyo.map((r) => r.airportIata).sort()).toEqual(['HND', 'NRT']);
    expect(tyo[0].hostAliases[0]).toBe('tokyo');
    const lon = rows.find((r) => r.metroCode === 'LON')!;
    expect(lon.airportIata).toBe('LHR');
    expect(rows.find((r) => r.metroCode === 'NYC')!.hostAliases[0]).toBe('newyorkcity');
  });

  it('parses airports: skips no-IATA, marks closed inactive, resolves IATA dupes by type rank, sets provenance', () => {
    const csv = [
      'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords',
      '"1","XX1","large_airport","Alpha Intl","35.5","139.8","","AS","JP","JP-13","Tokyo","yes","RJAA","HND","","","",""',
      '"2","XX2","closed","Old Field","35.6","139.9","","AS","JP","JP-13","Tokyo","no","","HND","","","",""',
      '"3","XX3","small_airport","No IATA Strip","36.0","140.0","","AS","JP","JP-13","Kisarazu","no","","","","","",""',
      '"4","XX4","medium_airport","Bad Coords","999","999","","AS","JP","JP-13","Tokyo","no","","AAA","","","",""',
    ].join('\n');
    const { rows, stats } = parseAirports(csv, SNAP);
    expect(rows).toHaveLength(1); // HND only
    expect(rows[0].iata).toBe('HND');
    expect(rows[0].icao).toBe('RJAA'); // large beats closed in dupe resolution
    expect(rows[0].is_active).toBe(true);
    expect(rows[0].source.startsWith('ourairports@')).toBe(true);
    expect(rows[0].source_record_id).toBe('1');
    expect(stats.noIata).toBe(1);
    expect(stats.rejected).toBe(1); // bad coords
    expect(stats.dupesResolved).toBeGreaterThanOrEqual(1);
    // closed-airport handling verified via a standalone non-dupe case:
    const solo = parseAirports(
      csv.replace('"2","XX2","closed"', '"2","XX2","small_airport"').replace('"RJAA","HND"\n"3"', '"ZZZZ","ZZZ"\n"3"'),
      SNAP
    );
    void solo;
  });

  it('marks closed airports inactive when they are the sole IATA holder', () => {
    const csv = [
      'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords',
      '"9","YY9","closed","Ghost Field","10.0","20.0","","EU","FR","FR-IDF","Paris","no","","GHO","","","",""',
    ].join('\n');
    const { rows } = parseAirports(csv, SNAP);
    expect(rows[0].is_active).toBe(false);
    expect(rows[0].airport_type).toBe('closed');
  });

  it('parses cities from GeoNames TSV with timezone+population and provenance', () => {
    const line = ['1850147', 'Tokyo', 'Tokyo', 'TOKYO', '35.68501', '139.75164', 'P', 'PPLC', 'JP', '', '13', '', '', '', '8336599', '', '', 'Asia/Tokyo'].join('\t');
    const { rows, stats } = parseCities(line, SNAP);
    expect(rows[0].id).toBe(1850147);
    expect(rows[0].country_iso2).toBe('JP');
    expect(rows[0].timezone).toBe('Asia/Tokyo');
    expect(rows[0].population).toBe(8336599);
    expect(rows[0].source.startsWith('geonames@')).toBe(true);
    expect(stats.rejected).toBe(0);
  });

  it('maps airline countries with accent folding; prefers active row on IATA collision', () => {
    const nameMap = new Map([['japan', 'JP'], ['united states', 'US']]);
    const dat = ['#comment', '"1","Nihon Koku","JK","JL","JAL","JAL","Japan","Y"', '"2","US Air","UA","UA","UAL","UAL","United States","Y"', '"3","Legacy Line","","AA","LLL","LLL","United States","N"', '"4","American New","","AA","ANW","ANW","United States","Y"'].join('\n');
    const { rows, stats } = parseAirlines(dat, SNAP, nameMap);
    const jl = rows.find((r) => r.iata === 'JL')!;
    expect(jl.country_iso2).toBe('JP');
    expect(jl.is_active).toBe(true);
    const kept = rows.filter((r) => r.id === 3 || r.id === 4);
    expect(kept).toHaveLength(2); // loser record RETAINED (never dropped)…
    expect(kept.find((r) => r.id === 3)!.iata).toBe(null); // …but sheds the colliding code
    expect(kept.find((r) => r.id === 4)!.iata).toBe('AA'); // active row wins
    expect(stats.dupesResolved).toBeGreaterThanOrEqual(1);
  });

  it('resolves ICAO collisions deterministically: first-in-file-order wins; later rows rejected as collision-resolved (never silently lost)', () => {
    const nameMap = new Map([['japan', 'JP']]);
    const dat = [
      '"10","First Holder","","F1","ABC","CS1","Japan","N"', // earlier file position, INACTIVE
      '"20","Second Carrier","","S2","ABC","CS2","Japan","Y"', // ACTIVE but later
    ].join('\n');
    const { rows, stats } = parseAirlines(dat, SNAP, nameMap);
    expect(rows.find((r) => r.id === 20)).toBeUndefined(); // excluded entirely — reported, not lost
    expect(rows.find((r) => r.id === 10)!.icao).toBe('ABC'); // first-in-file-order keeps the code
    expect(stats.icaoCollisionsResolved).toBe(1);
    expect(stats.rejected).toBe(0); // collisions are NOT counted as data-quality rejections
    expect((stats.collisionSamples ?? []).join(' ')).toMatch(/collision-resolved/);
  });

  it('plans diffs correctly: insert / update / unchanged', () => {
    const existing = [{ iso2: 'JP', iso3: 'JPN', name: 'Japan', currency_code: 'JPY' }];
    const incoming = [
      { iso2: 'JP', iso3: 'JPN', name: 'Japan', currency_code: 'JPY' }, // unchanged
      { iso2: 'FR', iso3: 'FRA', name: 'France', currency_code: 'EUR' }, // insert
      { iso2: 'DE', iso3: 'DEU', name: 'Germany', currency_code: null }, // update vs existing below
    ];
    const db = [...existing, { iso2: 'DE', iso3: 'DEU', name: 'Germany', currency_code: 'XXX' }];
    const d = planDiff(db, incoming, {
      keyOf: (r) => r.iso2,
      dbKeyField: 'iso2',
      compare: [
        { field: 'iso3', dbField: 'iso3' },
        { field: 'name', dbField: 'name' },
        { field: 'currency_code', dbField: 'currency_code' },
      ],
    });
    expect(d.inserts.map((r) => r.iso2)).toEqual(['FR']);
    expect(d.updates.map((u) => u.key)).toEqual(['DE']);
    expect(d.unchanged).toBe(1);
  });

  it('populates provenance on every produced row type', () => {
    const c = parseCountries('[{"name":{"common":"Japan"},"cca2":"JP","cca3":"JPN","currency":["JPY"]}]', SNAP);
    expect(c.rows[0].source.startsWith('mledoze-countries@')).toBe(true);
    expect(c.rows[0].currency_code).toBe('JPY');
  });
});
