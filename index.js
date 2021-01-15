#!/usr/bin/env node
const AWS = require("aws-sdk");
process.env.AWS_SDK_LOAD_CONFIG = 1;
const program = require("commander");
const package = require("./package.json");
require("@mhlabs/aws-sdk-sso");
require("./src/commands/code-bindings");
require("./src/commands/import");

AWS.config.credentialProvider.providers.unshift(
  new AWS.SingleSignOnCredentials()
);
program.version(package.version, "-v, --vers", "output the current version");

program.parse(process.argv);
if (process.argv.length < 3) {
  program.help();
}
