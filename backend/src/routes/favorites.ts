import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { FavoriteStation } from "../types";

const router = Router();
const DATA_FILE = process.env.DATA_FILE || "/app/data/favorites.json";

function ensureDataFile(): void {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify([]), "utf-8");
  }
}

function readFavorites(): FavoriteStation[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as FavoriteStation[];
}

function writeFavorites(favorites: FavoriteStation[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(favorites, null, 2), "utf-8");
}

// GET /api/favorites
router.get("/", (_req: Request, res: Response) => {
  try {
    const favorites = readFavorites();
    res.json({ ok: true, favorites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ ok: false, message });
  }
});

// POST /api/favorites
router.post("/", (req: Request, res: Response) => {
  const station = req.body as Partial<FavoriteStation>;

  if (!station.id || !station.name) {
    res.status(400).json({ ok: false, message: "id and name are required" });
    return;
  }

  try {
    const favorites = readFavorites();
    const exists = favorites.some((f) => f.id === station.id);
    if (exists) {
      res.status(409).json({ ok: false, message: "Station already in favorites" });
      return;
    }

    const newFav: FavoriteStation = {
      id: station.id,
      name: station.name,
      brand: station.brand ?? "",
      street: station.street ?? "",
      houseNumber: station.houseNumber ?? "",
      place: station.place ?? "",
      postCode: station.postCode ?? 0,
      lat: station.lat ?? 0,
      lng: station.lng ?? 0,
    };

    favorites.push(newFav);
    writeFavorites(favorites);
    res.status(201).json({ ok: true, favorite: newFav });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ ok: false, message });
  }
});

// DELETE /api/favorites/:id
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const favorites = readFavorites();
    const index = favorites.findIndex((f) => f.id === id);
    if (index === -1) {
      res.status(404).json({ ok: false, message: "Station not found in favorites" });
      return;
    }

    favorites.splice(index, 1);
    writeFavorites(favorites);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ ok: false, message });
  }
});

export default router;
