const helper = require("./target-helper.cjs");

const target = () => helper.defaultValue();

target.named = () => helper.namedValue();

module.exports = target;
