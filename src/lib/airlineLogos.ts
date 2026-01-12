// Airline logo URLs using a public CDN
// Format: IATA code -> logo URL

const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";

// Common airline codes and their names
export const airlineNames: Record<string, string> = {
  AA: "American Airlines",
  UA: "United Airlines",
  DL: "Delta Air Lines",
  WN: "Southwest Airlines",
  B6: "JetBlue",
  AS: "Alaska Airlines",
  NK: "Spirit Airlines",
  F9: "Frontier Airlines",
  G4: "Allegiant Air",
  HA: "Hawaiian Airlines",
  SY: "Sun Country",
  // International
  BA: "British Airways",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  EK: "Emirates",
  QR: "Qatar Airways",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  NH: "ANA",
  JL: "Japan Airlines",
  QF: "Qantas",
  AC: "Air Canada",
  AM: "Aeromexico",
  LA: "LATAM",
  AV: "Avianca",
  TK: "Turkish Airlines",
  LX: "Swiss",
  OS: "Austrian",
  IB: "Iberia",
  AY: "Finnair",
  SK: "SAS",
  FR: "Ryanair",
  U2: "easyJet",
  W6: "Wizz Air",
  VY: "Vueling",
};

export function getAirlineLogo(iataCode: string): string {
  if (!iataCode) return "";
  const code = iataCode.toUpperCase().trim();
  return `${AIRLINE_LOGO_BASE}/${code}.png`;
}

export function getAirlineName(iataCode: string): string {
  if (!iataCode) return "Unknown Airline";
  const code = iataCode.toUpperCase().trim();
  return airlineNames[code] || code;
}
