const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://rockets-game-day-checklist-frontend.onrender.com", // your Render frontend URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin (like curl / server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// Load games from CSV
function loadGamesFromCsv() {
  const filePath = path.join(__dirname, "Games.csv");
  const csvContent = fs.readFileSync(filePath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!records || records.length === 0) {
    return [];
  }

  // Look at the actual header names in the file
  const headerKeys = Object.keys(records[0]);
  console.log("DEBUG CSV HEADERS:", headerKeys);

  // Find the key that *acts* like "date" (ignores extra spaces/BOM/etc.)
  const dateKey =
    headerKeys.find(
      (k) => k && k.trim().toLowerCase() === "date"
    ) || headerKeys[0]; // fallback just in case

  console.log("USING dateKey:", dateKey);

  return records.map((row) => ({
    // Use whatever the real key is for the date
    date: row[dateKey],
    time: row.time,
    opponent: row.opponent,
    managerName: row.managerName,
  }));
}

//return the first game in the csv file 

function pickCurrentGame(games) {
  if (!games || games.length === 0) {
    return null;
  }

  const g = games[0]; // first row in games.csv

  return {
    opponent: g.opponent,
    date: g.date,
    time: g.time,
    managerName: g.managerName,
  };
}


// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Current game route
app.get("/current-game", (req, res) => {
  try {
    const games = loadGamesFromCsv();
    const currentGame = pickCurrentGame(games);

    if (!currentGame) {
      return res.status(404).json({ error: "No games found in CSV" });
    }
    console.log("SENDING CURRENT GAME:", currentGame);
    res.json(currentGame);
  } catch (err) {
    console.error("Error reading games CSV:", err);
    res.status(500).json({ error: "Failed to load game schedule" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
