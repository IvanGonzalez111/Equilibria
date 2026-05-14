const express = require("express");
const path = require("path");
const authRoutes = require("./src/routes/authRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const { ensureDatabase } = require("./src/storage/database");

const app = express();
const PORT = process.env.PORT || 3000;

ensureDatabase();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets-mp3", express.static(path.join(__dirname, "Assets mp3")));

app.use("/api", authRoutes);
app.use("/api", groupRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Equilibria running at http://localhost:${PORT}`);
});
