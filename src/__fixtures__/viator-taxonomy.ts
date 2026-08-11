/**
 * Viator taxonomy TEST FIXTURES — destinations, hierarchy, and tags.
 * TEST_ONLY. Never used in production unless returned by an actual provider.
 */
import type { ExperienceDestination, ExperienceTag } from "@/types/experiences";

export const TAXONOMY_DESTINATIONS: ExperienceDestination[] = [
  { provider: "viator", destinationId: "1", name: "Australia", type: "COUNTRY", parentDestinationId: null, lookupId: null, defaultCurrencyCode: "AUD", timeZone: null, latitude: -25.2744, longitude: 133.7751 },
  { provider: "viator", destinationId: "2", name: "New South Wales", type: "REGION", parentDestinationId: "1", lookupId: null, defaultCurrencyCode: "AUD", timeZone: "Australia/Sydney", latitude: -33.8688, longitude: 151.2093 },
  { provider: "viator", destinationId: "3", name: "Sydney", type: "CITY", parentDestinationId: "2", lookupId: "SYD", defaultCurrencyCode: "AUD", timeZone: "Australia/Sydney", latitude: -33.8688, longitude: 151.2093 },
  { provider: "viator", destinationId: "4", name: "France", type: "COUNTRY", parentDestinationId: null, lookupId: null, defaultCurrencyCode: "EUR", timeZone: null, latitude: 46.6034, longitude: 1.8883 },
  { provider: "viator", destinationId: "5", name: "Ile-de-France", type: "REGION", parentDestinationId: "4", lookupId: null, defaultCurrencyCode: "EUR", timeZone: "Europe/Paris", latitude: 48.8566, longitude: 2.3522 },
  { provider: "viator", destinationId: "6", name: "Paris", type: "CITY", parentDestinationId: "5", lookupId: "PAR", defaultCurrencyCode: "EUR", timeZone: "Europe/Paris", latitude: 48.8566, longitude: 2.3522 },
  { provider: "viator", destinationId: "7", name: "Italy", type: "COUNTRY", parentDestinationId: null, lookupId: null, defaultCurrencyCode: "EUR", timeZone: null, latitude: 41.8719, longitude: 12.5674 },
  { provider: "viator", destinationId: "8", name: "Lazio", type: "REGION", parentDestinationId: "7", lookupId: null, defaultCurrencyCode: "EUR", timeZone: "Europe/Rome", latitude: 41.9028, longitude: 12.4964 },
  { provider: "viator", destinationId: "9", name: "Rome", type: "CITY", parentDestinationId: "8", lookupId: "ROM", defaultCurrencyCode: "EUR", timeZone: "Europe/Rome", latitude: 41.9028, longitude: 12.4964 },
  { provider: "viator", destinationId: "10", name: "United Kingdom", type: "COUNTRY", parentDestinationId: null, lookupId: null, defaultCurrencyCode: "GBP", timeZone: null, latitude: 55.3781, longitude: -3.4360 },
  { provider: "viator", destinationId: "11", name: "England", type: "REGION", parentDestinationId: "10", lookupId: null, defaultCurrencyCode: "GBP", timeZone: "Europe/London", latitude: 51.5074, longitude: -0.1278 },
  { provider: "viator", destinationId: "12", name: "London", type: "CITY", parentDestinationId: "11", lookupId: "LON", defaultCurrencyCode: "GBP", timeZone: "Europe/London", latitude: 51.5074, longitude: -0.1278 },
  { provider: "viator", destinationId: "13", name: "Nepal", type: "COUNTRY", parentDestinationId: null, lookupId: null, defaultCurrencyCode: "NPR", timeZone: null, latitude: 28.3949, longitude: 84.1240 },
  { provider: "viator", destinationId: "14", name: "Bagmati", type: "REGION", parentDestinationId: "13", lookupId: null, defaultCurrencyCode: "NPR", timeZone: "Asia/Kathmandu", latitude: 27.7172, longitude: 85.3240 },
  { provider: "viator", destinationId: "15", name: "Kathmandu", type: "CITY", parentDestinationId: "14", lookupId: "KTM", defaultCurrencyCode: "NPR", timeZone: "Asia/Kathmandu", latitude: 27.7172, longitude: 85.3240 },
];

export const TAXONOMY_TAGS: ExperienceTag[] = [
  { provider: "viator", tagId: 1, name: "Museums & Culture", parentTagIds: null, category: "culture" },
  { provider: "viator", tagId: 2, name: "Tours & Sightseeing", parentTagIds: null, category: "sightseeing" },
  { provider: "viator", tagId: 3, name: "Cruises", parentTagIds: [2], category: "water" },
  { provider: "viator", tagId: 4, name: "Theme Parks", parentTagIds: null, category: "entertainment" },
  { provider: "viator", tagId: 5, name: "Landmarks", parentTagIds: [2], category: "sightseeing" },
  { provider: "viator", tagId: 6, name: "Zoos & Aquariums", parentTagIds: null, category: "wildlife" },
  { provider: "viator", tagId: 7, name: "Food & Drink", parentTagIds: null, category: "culinary" },
  { provider: "viator", tagId: 8, name: "Outdoor Adventures", parentTagIds: null, category: "adventure" },
];

export function searchDestinations(query: string, destinations = TAXONOMY_DESTINATIONS): ExperienceDestination[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return destinations.filter(d => d.name.toLowerCase().includes(q));
}

export function displayDestination(dest: ExperienceDestination, all = TAXONOMY_DESTINATIONS): string {
  const parent = all.find(d => d.destinationId === dest.parentDestinationId);
  const country = parent ? (parent.type === "COUNTRY" ? parent : all.find(d => d.destinationId === parent.parentDestinationId)) : null;
  if (country && country.type === "COUNTRY") return dest.name + ", " + country.name;
  return dest.name;
}

export function getHierarchy(destId: string, all = TAXONOMY_DESTINATIONS): ExperienceDestination[] {
  const result: ExperienceDestination[] = [];
  let current = all.find(d => d.destinationId === destId);
  while (current) {
    result.unshift(current);
    current = current.parentDestinationId ? all.find(d => d.destinationId === current!.parentDestinationId) : undefined;
  }
  return result;
}
