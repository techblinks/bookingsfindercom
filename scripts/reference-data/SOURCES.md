# BF1-B Reference Data — Source Manifest

Recorded before first download (2026-08-25). Refresh cadence: quarterly manual run
(`node scripts/reference-data/run.ts`), diff reviewed before apply.

| Dataset | Source URL | Snapshot | Licence | Attribution requirement | Cadence |
|---|---|---|---|---|---|
| Airports | OurAirports data build — https://davidmegginson.github.io/ourairports-data/airports.csv (`davidmegginson/ourairports-data`) | daily build fetched 2026-08-25 | Public domain (per OurAirports FAQ) | None required; credited in this file | Quarterly |
| Cities | GeoNames `cities15000.zip` — https://download.geonames.org/export/dump/cities15000.zip | dump fetched 2026-08-25 | CC BY 4.0 | Attribution required: "GeoNames (geonames.org), CC BY 4.0" | Quarterly |
| Airlines | OpenFlights `airlines.dat` — https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat | master HEAD @ fetch date 2026-08-25 | ODbL 1.0 | Attribution required: "OpenFlights (openflights.org), ODbL" | Quarterly |
| Countries (+ISO3, currency) | mledoze/countries `countries.json` — https://raw.githubusercontent.com/mledoze/countries/master/countries.json | master HEAD @ fetch date 2026-08-25 | ODbL 1.0 | Attribution required: "mledoze/countries, ODbL" | Quarterly |

Rules:
- Raw files are cached in `scripts/reference-data/raw/` (gitignored); provenance strings
  written into DB rows embed source key + snapshot date, e.g. `ourairports@2026-08-25`.
- No phpTravels-derived data. No travel-site scraping.
- Disappeared records are deactivated (`is_active=false`), never deleted.
