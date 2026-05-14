const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDir, "db.json");

const initialData = {
  users: [],
  groups: []
};

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  const rawData = fs.readFileSync(dataFile, "utf8");
  return JSON.parse(rawData);
}

function writeDatabase(data) {
  ensureDatabase();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

module.exports = {
  ensureDatabase,
  readDatabase,
  writeDatabase
};
