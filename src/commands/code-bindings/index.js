import { create } from "./code-bindings.js";
export function createCommand(program) {
  program.command("code-bindings")
    .alias("cb")
    .option("-f, --file [filePath]", "File path to OpenAPI definition (optional)")
    .option("-u, --url [url]", "URL to OpenAPI definition (optional)")
    .option("-l, --language [language]", "Output language (optional)")
    .option(
      "-o, --output-file [output-file]",
      "Output file (optional. Writes to std-out if omitted)"
    )
    .option("-p, --profile [profile]", "AWS profile to use", "default")
    .option(
      "--region [region]",
      "The AWS region to use. Falls back on AWS_REGION environment variable if not specified"
    )
    .description("Starts a schema registry browser and outputs code bindings")
    .action(async (cmd) => {
      await create(cmd);
    });
}