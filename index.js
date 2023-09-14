#!/usr/bin/env node
process.env.AWS_SDK_LOAD_CONFIG = 1;

process.env.AWS_SDK_LOAD_CONFIG = 1;
import commander from "commander";
import fs from "fs";
import path from "path";
import url from "url";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const _version = JSON.parse(fs.readFileSync(path.join(__dirname, "./package.json"), "utf-8")).version;

(await import("./src/commands/code-bindings/index.js")).createCommand(commander);
(await import("./src/commands/import/index.js")).createCommand(commander);
(await import("./src/commands/create/index.js")).createCommand(commander);

commander.version(_version, "-v, --vers", "output the current version");

commander.parse(process.argv);
if (process.argv.length < 3) {
  commander.help();
}
