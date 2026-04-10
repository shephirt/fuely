import { Router, Request, Response } from "express";
import {
  fetchNearby,
  fetchPrices,
  fetchDetail,
} from "../services/tankerkoenig";

const router = Router();

// GET /api/stations/nearby?lat=&lng=&rad=&type=
router.get("/nearby", async (req: Request, res: Response) => {
  const { lat, lng, rad, type } = req.query;

  if (!lat || !lng) {
    res.status(400).json({ ok: false, message: "lat and lng are required" });
    return;
  }

  const latNum = parseFloat(lat as string);
  const lngNum = parseFloat(lng as string);
  const radNum = parseFloat((rad as string) || "5");
  const fuelType = (type as string) || "all";

  if (isNaN(latNum) || isNaN(lngNum)) {
    res.status(400).json({ ok: false, message: "lat and lng must be numbers" });
    return;
  }

  if (radNum < 1 || radNum > 25) {
    res.status(400).json({ ok: false, message: "rad must be between 1 and 25" });
    return;
  }

  const validTypes = ["e5", "e10", "diesel", "all"];
  if (!validTypes.includes(fuelType)) {
    res.status(400).json({ ok: false, message: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }

  try {
    const data = await fetchNearby(latNum, lngNum, radNum, fuelType);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ ok: false, message });
  }
});

// GET /api/stations/prices?ids=id1,id2,...
router.get("/prices", async (req: Request, res: Response) => {
  const { ids } = req.query;

  if (!ids) {
    res.status(400).json({ ok: false, message: "ids query parameter is required" });
    return;
  }

  const idList = (ids as string).split(",").map((id) => id.trim()).filter(Boolean);

  if (idList.length === 0) {
    res.status(400).json({ ok: false, message: "No valid IDs provided" });
    return;
  }

  if (idList.length > 10) {
    res.status(400).json({ ok: false, message: "Maximum 10 IDs per request" });
    return;
  }

  try {
    const data = await fetchPrices(idList);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ ok: false, message });
  }
});

// GET /api/stations/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    res.status(400).json({ ok: false, message: "Invalid station ID format" });
    return;
  }

  try {
    const data = await fetchDetail(id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ ok: false, message });
  }
});

export default router;
