const program = require("commander");
const authHelper = require("../../shared/auth-helper");
const inportUtil = require("./import");
program
  .command("import")
  .alias("i")
  .option("-f, --file [file-path]", "OpenAPI Input file (optional. One of --file or --url has to be specified)")
  .option("-u, --url [url]", "URL to OpenAPI definition (optional. One of --file or --url has to be specified)")
  .option("-r, --registry [registryName]", "URL to OpenAPI definition (optional)")
  .option("-p, --profile [profile]", "AWS profile to use")
  .option(
    "--region [region]",
    "The AWS region to use. Falls back on AWS_REGION environment variable if not specified"
  )
  .description("Imports OpenAPI3 speficications from file or URL into Amazon EventBridge Schema Registry")
  .action(async (cmd) => {
    await authHelper.initAuth(cmd);
    await inportUtil.run(cmd);
  });
