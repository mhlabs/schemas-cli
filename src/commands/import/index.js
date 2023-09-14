import { run } from "./import.js";
const optionalString = `(Optional. One of --file, --url or --apigateway-id has to be specified)`;
export function createCommand(program) {
  program.command('import')
    .alias("i")
    .option(`-f, --file [file-path]", "OpenAPI Input file.  ${optionalString}`)
    .option(`-u, --url [url]", "URL to OpenAPI definition. ${optionalString}`)
    .option(`-a, --apigateway-id [id]", "API Gateway Rest API Id. ${optionalString}`)
    .option(`-s, --stage-name [stageId]", "API Gateway Rest API Stage Id. (Optional and only used together with apigateway lookup)`)
    .option("-r, --registry [registryName]", "URL to OpenAPI definition (optional)")
    .option("-p, --profile [profile]", "AWS profile to use")
    .option("-n, --schema-name [schemaName]", "Name of the schema. Defaults to $.info.title")
    .option(
      "--region [region]",
      "The AWS region to use. Falls back on AWS_REGION environment variable if not specified"
    )
    .description("Imports OpenAPI3 speficications from file or URL into Amazon EventBridge Schema Registry")
    .action(async (cmd) => {
      await run(cmd);
    });
}