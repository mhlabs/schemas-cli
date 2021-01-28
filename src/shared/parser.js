const YAML = require("yaml");

function parse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return YAML.parse(str);
  }
}

module.exports = {
    parse
}
