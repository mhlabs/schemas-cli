const AWS = require("aws-sdk");
const schemas = new AWS.Schemas();
const apiGateway = new AWS.APIGateway();
const inputUtil = require("../../shared/input-util");
const fs = require("fs");
const axios = require("axios").default;
async function run(cmd) {
  let fileContent;
  if (cmd.file) {
    fileContent = fs.readFileSync(cmd.file);
  } else if (cmd.url) {
    const response = await axios.get(cmd.url);
    fileContent = JSON.stringify(response.data);
  } else if (cmd.apigatewayId) {
    if (cmd.apigatewayId === true) {
      const apis = await apiGateway.getRestApis().promise();
      const api = await inputUtil.selectOne(
        apis.items.map((p) => {
          return { name: p.name, value: p };
        }),
        "Select API"
      );
      cmd.apigatewayId = api.id;
    }

    if (!cmd.stageName) {
      const stages = await apiGateway.getStages({restApiId: cmd.apigatewayId }).promise();
      cmd.stageName = await inputUtil.selectOne(stages.item.map(p=>p.stageName), "Select stage");
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
  const schema = JSON.parse(fileContent.toString());
  const registry = cmd.registry || (await inputUtil.getRegistry(schemas, true));

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

module.exports = {
  run,
};
