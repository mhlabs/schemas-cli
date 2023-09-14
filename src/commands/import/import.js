import { SchemasClient } from "@aws-sdk/client-schemas";
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { fromSSO } from "@aws-sdk/credential-provider-sso";

import parser from "../../shared/parser.js";
import { selectOne, getRegistry } from "../../shared/input-util.js";
import { readFileSync } from "fs";
import axios from "axios";
export async function run(cmd) {
  const credentials = await fromSSO({ profile: cmd.profile });
  const schemas = new SchemasClient({ credentials, region: cmd.region });
  const apiGateway = new APIGatewayClient( { credentials, region: cmd.region });
    let fileContent;
  if (cmd.file) {
    fileContent = readFileSync(cmd.file);
  } else if (cmd.url) {
    const response = await axios.get(cmd.url);
    fileContent = JSON.stringify(response.data);
  } else if (cmd.apigatewayId) {
    if (cmd.apigatewayId === true) {
      const apis = await apiGateway.getRestApis().promise();
      const api = await selectOne(
        apis.items.map((p) => {
          return { name: p.name, value: p };
        }),
        "Select API"
      );
      cmd.apigatewayId = api.id;
    }

    if (!cmd.stageName) {
      const stages = await apiGateway.getStages({ restApiId: cmd.apigatewayId }).promise();
      cmd.stageName = await selectOne(stages.item.map(p => p.stageName), "Select stage");
    }

    const schemaRespone = await apiGateway
      .getExport({
        exportType: "oas30",
        restApiId: cmd.apigatewayId,
        stageName: cmd.stageName,
      })
      .promise();

    fileContent = schemaRespone.body.toString();
  }
  const schema = parser.parse(fileContent.toString());
  const registry = cmd.registry || (await getRegistry(schemas, true));

  if (!registry) {
    console.log("Please create a custom registry");
    return;
  }

  const schemaName = cmd.schemaName || schema.info.title.replace(/ /g, "_");
  try {
    await schemas
      .updateSchema({
        RegistryName: registry,
        SchemaName: schemaName,
        Content: fileContent.toString(),
        Description: schema.info.description,
        Type: "OpenApi3",
      })
      .promise();
    console.log("Schema updated");

  } catch (err) {
    if (err.message == `Schema with name ${schemaName} does not exist.`) {
      await schemas
        .createSchema({
          RegistryName: registry,
          SchemaName: schemaName,
          Content: fileContent.toString(),
          Description: schema.info.description,
          Type: "OpenApi3",
        })
        .promise();
      console.log("Schema created");
    } else {
      console.log(err);
    }
  }
}

export default {
  run,
};
