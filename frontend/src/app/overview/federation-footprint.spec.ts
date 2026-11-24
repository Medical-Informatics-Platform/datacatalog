import { geoConicConformal } from 'd3';
import { FEDERATION_DATASETS } from './federation-footprint';
import { EUROPE_LAND, MAP_H, MAP_W, PROJECTION } from './europe-map-data';

const networks = Object.values(FEDERATION_DATASETS);
const sites = networks.flatMap((n) => [...n.sites]);

describe('federation dataset locations', () => {
  it('gives every site a unique key and a label inside one federation', () => {
    for (const [code, network] of Object.entries(FEDERATION_DATASETS)) {
      const keys = network.sites.map((s) => s.key);
      expect(new Set(keys).size).withContext(code).toBe(keys.length);
      for (const site of network.sites) {
        expect(site.label).withContext(`${code} -> ${site.key}`).toBeTruthy();
      }
    }
  });

  it('uses the same coordinates for a site shared by two federations', () => {
    const byKey = new Map<string, (typeof sites)[number]>();
    for (const site of sites) {
      const prior = byKey.get(site.key);
      if (prior) expect([site.x, site.y]).withContext(site.key).toEqual([prior.x, prior.y]);
      else byKey.set(site.key, site);
    }
  });

  it('keeps digits out of labels and notes; counts come from the API', () => {
    for (const site of sites) expect(/\d/.test(site.label)).withContext(site.key).toBeFalse();
    for (const network of networks) {
      if (network.note) expect(/\d/.test(network.note)).withContext(network.note).toBeFalse();
    }
  });

  it('places Slovenia at the country centre, not at Ljubljana', () => {
    const slovenia = sites.find((s) => s.key === 'slovenia')!;
    expect(slovenia.x).toBeGreaterThan(318);
    expect(slovenia.precision).toBe('country');
  });

  it('keeps every site inside the map viewBox', () => {
    for (const { x, y } of sites) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_W);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_H);
    }
  });

  it('projects every lat/lon to its baked x/y', () => {
    const projection = geoConicConformal()
      .parallels([PROJECTION.parallels[0], PROJECTION.parallels[1]])
      .rotate([PROJECTION.rotate[0], PROJECTION.rotate[1]])
      .center([PROJECTION.center[0], PROJECTION.center[1]])
      .scale(PROJECTION.scale)
      .translate([PROJECTION.translate[0], PROJECTION.translate[1]]);
    for (const site of sites) {
      const point = projection([site.lon, site.lat]);
      expect(point).withContext(site.key).not.toBeNull();
      if (!point) continue;
      expect(Math.abs(point[0] - site.x)).withContext(site.key).toBeLessThan(0.5);
      expect(Math.abs(point[1] - site.y)).withContext(site.key).toBeLessThan(0.5);
    }
  });

  it('puts every site on the land path', () => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
    svg.setAttribute('width', String(MAP_W));
    svg.setAttribute('height', String(MAP_H));
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', EUROPE_LAND);
    path.setAttribute('fill', 'black');
    svg.appendChild(path);
    document.body.appendChild(svg);
    for (const site of sites) {
      expect(path.isPointInFill(new DOMPoint(site.x, site.y))).withContext(site.key).toBeTrue();
    }
    svg.remove();
  });
});
