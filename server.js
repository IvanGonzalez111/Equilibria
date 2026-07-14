const express = require("express");
const path = require("path");
const authRoutes = require("./src/routes/authRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const { ensureDatabase } = require("./src/storage/database");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const audioDir = path.join(__dirname, "Assets mp3");

ensureDatabase();

app.disable("x-powered-by");

app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  express.static(publicDir, {
    etag: true,
    maxAge: "1d",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  })
);

app.use(
  "/assets-mp3",
  express.static(audioDir, {
    etag: true,
    maxAge: "7d"
  })
);

app.use("/api", authRoutes);
app.use("/api", groupRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Equilibria running at http://localhost:${PORT}`);
});
