import yaml from "yaml";

function parse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return yaml.parse(str);
  }
}

export default {
    parse
}
