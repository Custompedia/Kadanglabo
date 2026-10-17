# Dot map for Work > Lokasi proyek: land of South Sumatra, Java, Bali and the Kalimantan coast as a staggered dot grid.
# Source: Natural Earth 1:10m land (public domain), https://www.naturalearthdata.com
#   curl -L -o ne_10m_land.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson
#   python3 -I scripts/make-dotmap.py ne_10m_land.geojson dots.json   then   node scripts/dotmap-to-ts.mjs dots.json
import json, sys
LON0, LON1, LAT0, LAT1 = 102.6, 116.6, -1.6, -9.2   # west, east, north, south
STEP = 0.13                                          # degrees between dots
K = 100                                              # svg units per degree
src, out = sys.argv[1], sys.argv[2]
data = json.load(open(src))
rings = []  # (bbox, ring, polygon_id)
pid = 0
for f in data['features']:
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        pid += 1
        for ring in poly:
            xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
            bb = (min(xs), max(xs), min(ys), max(ys))
            if bb[1] < LON0 - 1 or bb[0] > LON1 + 1 or bb[3] < LAT1 - 1 or bb[2] > LAT0 + 1:
                continue
            rings.append((bb, ring, pid))
print('rings in box:', len(rings), file=sys.stderr)

def inside(x, y):
    # even-odd over the rings of each polygon; land if inside any polygon
    hits = {}
    for bb, ring, p in rings:
        if x < bb[0] or x > bb[1] or y < bb[2] or y > bb[3]:
            continue
        c = False
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i]; xj, yj = ring[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        if c:
            hits[p] = not hits.get(p, False)
    return any(hits.values())

dots = []
row = 0
lat = LAT0
while lat >= LAT1:
    lon = LON0 + (STEP / 2 if row % 2 else 0)
    while lon <= LON1:
        if inside(lon, lat):
            dots.append((round((lon - LON0) * K, 1), round((LAT0 - lat) * K, 1)))
        lon += STEP
    lat -= STEP
    row += 1
W = round((LON1 - LON0) * K); H = round((LAT0 - LAT1) * K)
json.dump({'w': W, 'h': H, 'step': STEP * K, 'lon0': LON0, 'lat0': LAT0, 'k': K, 'dots': dots}, open(out, 'w'))
print('dots:', len(dots), 'box', W, 'x', H, file=sys.stderr)
