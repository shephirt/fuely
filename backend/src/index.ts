import express from "express";
import cors from "cors";
import path from "path";
import stationsRouter from "./routes/stations";
import favoritesRouter from "./routes/favorites";
import geocodeRouter from "./routes/geocode";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/stations", stationsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/geocode", geocodeRouter);

// Serve built frontend static files
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// SPA fallback — serve index.html for any non-API route
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Fuely server running on port ${PORT}`);
});
