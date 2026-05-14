const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null
  };
}

module.exports = {
  hashPassword,
  sanitizeUser
};
