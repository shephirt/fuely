import { Router, Request, Response } from "express";

const router = Router();

// GET /api/geocode?q=address
// Uses Nominatim (OpenStreetMap) — no API key required
router.get("/", async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 3) {
    res.status(400).json({ ok: false, message: "Query parameter 'q' must be at least 3 characters" });
    return;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "de"); // limit to Germany (MTS-K data is DE only)
  url.searchParams.set("addressdetails", "1");

  try {
    const apiRes = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a descriptive User-Agent
        "User-Agent": "Fuely/1.0 (fuel price viewer; https://github.com/fuely)",
        "Accept-Language": "de,en",
      },
    });

    if (!apiRes.ok) {
      throw new Error(`Nominatim returned HTTP ${apiRes.status}`);
    }

    const results = (await apiRes.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    const places = results.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name,
    }));

    res.json({ ok: true, places });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Geocoding failed";
    res.status(502).json({ ok: false, message });
  }
});

export default router;
