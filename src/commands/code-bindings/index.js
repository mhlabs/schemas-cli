const program = require("commander");
const authHelper = require("../../shared/auth-helper");
const AWS = require("aws-sdk");
const codeBindings = require("./code-bindings");
program
  .command("code-bindings")
  .alias("cb")
  .option("-l, --language [language]", "Output language (optional)")
  .option("-o, --output-file [output-file]", "Output file (optional. Writes to std-out if omitted)")
  .option("-p, --profile [profile]", "AWS profile to use", "default")
  .option(
    "--region [region]",
    "The AWS region to use. Falls back on AWS_REGION environment variable if not specified"
  )
  .description("Starts a schmea registry browser and outputs code bindings")
  .action(async (cmd) => {
    await authHelper.initAuth(cmd);
    await codeBindings.create(cmd)
  });
