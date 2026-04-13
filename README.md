# Fuely ⛽

A self-hosted, real-time fuel price web app for Germany — powered by the [Tankerkönig API](https://creativecommons.tankerkoenig.de/). Find the cheapest nearby stations, save your favourites, and watch prices update on an interactive map.

> **Germany only.** The Tankerkönig API covers German filling stations exclusively.

---

## Features

- **Nearby stations** — find petrol stations within a configurable radius (1 – 25 km) using GPS or address search
- **Live prices** — E5, E10, Diesel, or all fuel types, refreshed on demand
- **Interactive map** — Leaflet / OpenStreetMap; click any card to fly to that station, click any map marker to scroll to the matching card
- **Favourites** — save stations server-side; prices refresh automatically when you open the tab
- **Cost-aware sorting** — sort by distance, price, cheapest overall (net detour cost), or total cost (drive + fill)
- **Detour cost badge** — each card shows how much more or less a trip costs compared to the nearest station, accounting for your car's consumption, fill volume, and road detour factor
- **Home address** — set a home address in Settings; Favourites will compute distances and detour costs from home instead of your current location
- **Responsive** — mobile, tablet, and desktop layouts; sort filter opens as a floating overlay on mobile so the page never shifts

*Completely vibe coded.*

---

## Prerequisites

| Requirement | Notes |
|---|---|
| [Docker](https://docs.docker.com/get-docker/) ≥ 24 | With Compose V2 (`docker compose`) |
| Tankerkönig API key | Free at [creativecommons.tankerkoenig.de](https://creativecommons.tankerkoenig.de/) |

---

## Installation

### Production (pulls pre-built image from ghcr.io)

```bash
# 1. Clone the repository
git clone https://github.com/shephirt/fuely.git
cd fuely

# 2. Create your environment file
cp .env.example .env
#    Edit .env and set TANKERKOENIG_API_KEY=<your_key>

# 3. Start the container
docker compose up -d
```

The app is now available at **http://localhost:8080**.  
Favourite stations are persisted in a named Docker volume (`fuely-data`).

---

### Development (builds the image locally from source)

```bash
# 1. Clone and configure
git clone https://github.com/shephirt/fuely.git
cd fuely
cp .env.example .env   # fill in TANKERKOENIG_API_KEY

# 2. Build and run
docker compose -f docker-compose.dev.yml up --build
```

---

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and adjust as needed.

| Variable | Required | Default | Description |
|---|---|---|---|
| `TANKERKOENIG_API_KEY` | **Yes** | — | Your Tankerkönig API key |

### Port mapping

The default port mapping is `127.0.0.1:8080:3000` — the app listens only on localhost port 8080. If you run Fuely behind a reverse proxy (e.g. Caddy, Nginx), this is the address to proxy to.

To change the host port, edit `docker-compose.yml`:

```yaml
ports:
  - "127.0.0.1:9000:3000"   # change 9000 to any free port
```

### Data persistence

Favourite stations are stored in `/app/data/favorites.json` inside the container, backed by the `fuely-data` Docker volume. To back up your favourites:

```bash
docker run --rm -v fuely-data:/data alpine cat /data/favorites.json > favorites-backup.json
```

---

## Usage

1. **Set your location** — open the **Nearby** tab and either click **Use GPS** or type an address into the search box.
2. **Choose a radius** — use the radius selector (1 – 25 km) to narrow or widen the search.
3. **Select fuel type** — use the toggle in the header to switch between E5, E10, Diesel, or All.
4. **Sort the list** — use the sort bar (or the filter icon on mobile) to order by Distance, Price, Cheapest, or Total cost.
5. **Refresh prices** — click the refresh icon above the station list at any time.
6. **Save a favourite** — click the ☆ icon on any station card. It will appear in the **Favourites** tab.
7. **Fly to a station on the map** — click anywhere on a station card to centre the map on that station.
8. **Settings** — click the settings icon in the header to configure default view, price sort fuel, consumption, fill volume, detour factor, and home address.

---

## Releases

Fuely follows a tag-based release flow. Stable and pre-release images are both published to the GitHub Container Registry.

| Tag pattern | Image tag(s) | GitHub Release |
|---|---|---|
| `v1.2.3` | `:v1.2.3` + `:latest` | Stable |
| `v1.2.3-beta.1` | `:v1.2.3-beta.1` only | Pre-release (`:latest` never updated) |

To pull a specific release:

```bash
docker pull ghcr.io/shephirt/fuely:v1.2.3
```

---

## Deployment notes

- The container runs as a **non-root user** (`fuely`, UID/GID 1001).
- The backend proxies all Tankerkönig API requests — your API key is **never** exposed to the browser.
- A 5-minute in-memory cache on the backend prevents hitting API rate limits on rapid refreshes.
- The app serves the React frontend as static files from the same Express process — no separate web server required.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Leaflet / react-leaflet, lucide-react |
| Backend | Node.js 25, Express 5, TypeScript |
| Map tiles | OpenStreetMap (via Leaflet) |
| Geocoding | Nominatim (OpenStreetMap) — no additional API key required |
| Fuel data | [Tankerkönig API](https://creativecommons.tankerkoenig.de/) |
| Container | Docker (multi-stage build, node:25-alpine, non-root user) |
| CI/CD | GitHub Actions → ghcr.io |

---

## Attribution

- Fuel price data: [Tankerkönig](https://www.tankerkoenig.de) — licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Map tiles & geocoding: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — © OpenStreetMap

---

## License

[MIT](LICENSE) © 2026 [shephirt](https://github.com/shephirt)

---
