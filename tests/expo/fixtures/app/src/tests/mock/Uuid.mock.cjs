const crypto = require("node:crypto");

module.exports = {
  __esModule: true,
  v4: () => crypto.randomUUID(),
  validate: (value) => typeof value === "string" && value.length > 0,
};
