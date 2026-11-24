/**
 * Dataset locations for each federation's network, projected with the same
 * geoConicConformal setup as EUROPE_LAND (see europe-map-data.ts). These are
 * dataset-level sites, not federation hubs and not patient locations.
 * Source: descriptions from GET /services/federations (2026-11-24). Every x/y
 * is checked against lat/lon in the spec; no counts are stored here.
 * shortcut: static from published descriptions, replace with an API sites field when the backend publishes one.
 */
export type SitePrecision = 'city' | 'country';

export interface DatasetSite {
  /** Stable key: two federations sharing a site are drawn in separate lanes. */
  key: string;
  label: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
  precision: SitePrecision;
}

export interface FederationDatasetNetwork {
  sites: readonly DatasetSite[];
  /** Locations named in the description that fall outside this Europe map. */
  note?: string;
}

const LAUSANNE: DatasetSite = {
  key: 'lausanne', label: 'Lausanne', lat: 46.52, lon: 6.63, x: 229.7, y: 288.8, precision: 'city',
};

export const FEDERATION_DATASETS: Record<string, FederationDatasetNetwork> = {
  // CLM Lausanne, IRCCS Brescia, CHU Lille; ADNI is an external comparison set.
  dementia: {
    sites: [
      { key: 'lille', label: 'Lille', lat: 50.63, lon: 3.06, x: 199.2, y: 219.2, precision: 'city' },
      LAUSANNE,
      { key: 'brescia', label: 'Brescia', lat: 45.54, lon: 10.21, x: 268.6, y: 306.9, precision: 'city' },
    ],
    note: 'Also uses the ADNI comparison cohort (North America, not mapped)',
  },
  // Fifteen French centres; the description names no individual cities.
  repomse: {
    sites: [
      { key: 'france', label: 'France', lat: 46.6, lon: 2.2, x: 181.3, y: 282.0, precision: 'country' },
    ],
  },
  // Seventeen emergency departments in Italy, Slovenia and Poland; no cities published.
  ecream: {
    sites: [
      { key: 'italy', label: 'Italy', lat: 42.84, lon: 12.57, x: 294.9, y: 350.9, precision: 'country' },
      { key: 'slovenia', label: 'Slovenia', lat: 46.12, lon: 14.82, x: 320.3, y: 297.9, precision: 'country' },
      { key: 'poland', label: 'Poland', lat: 52.1, lon: 19.15, x: 360.6, y: 199.8, precision: 'country' },
    ],
  },
  // Public demo: the Lausanne source dataset; the teaching datasets are mostly US.
  publicmip: {
    sites: [{ ...LAUSANNE, label: 'Lausanne source dataset' }],
    note: 'Teaching datasets are mostly from the US (not mapped)',
  },
  // mentalhealth and feres publish no dataset locations; they stay off the map.
};
