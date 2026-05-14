const express = require("express");
const { readDatabase, writeDatabase } = require("../storage/database");
const { createId } = require("../utils/ids");
const { hashPassword, sanitizeUser } = require("../utils/security");

const router = express.Router();

router.post("/register", (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !confirmPassword) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "La contraseña y la confirmación deben coincidir." });
  }

  const db = readDatabase();
  const emailExists = db.users.some((user) => user.email === normalizedEmail);

  if (emailExists) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
  }

  const user = {
    id: createId("usr"),
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashPassword(password),
    avatar: null
  };

  db.users.push(user);
  writeDatabase(db);

  return res.status(201).json({ user: sanitizeUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios." });
  }

  const db = readDatabase();
  const user = db.users.find((entry) => entry.email === normalizedEmail);

  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }

  return res.json({ user: sanitizeUser(user) });
});

router.put("/users/:userId/avatar", (req, res) => {
  const { avatar } = req.body;
  const avatarValue = typeof avatar === "string" ? avatar.trim() : null;

  if (
    avatarValue &&
    (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(avatarValue) || avatarValue.length > 1_500_000)
  ) {
    return res.status(400).json({ error: "La imagen debe ser PNG, JPG o WebP y pesar menos de 1.5 MB." });
  }

  const db = readDatabase();
  const user = db.users.find((entry) => entry.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: "No se encontró el usuario." });
  }

  user.avatar = avatarValue || null;
  writeDatabase(db);

  return res.json({ user: sanitizeUser(user) });
});

module.exports = router;
