const AWS = require("aws-sdk");
const schemas = new AWS.Schemas();
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
  }
  const schema = JSON.parse(fileContent.toString());
  const registry = cmd.registry || await inputUtil.getRegistry(schemas, true);

  if (!registry) {
    console.log("Please create a custom registry");
    return;
  }
  const schemaName = schema.info.title.replace(/ /g, "_");
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
  } catch (err) {
    if (err.message == `Schema with name ${schemaName} does not exist.`) {
      await schemas
        .createSchema({
          RegistryName: registry,
          SchemaName: schema.info.title.replace(/ /g, "_"),
          Content: fileContent.toString(),
          Description: schema.info.description,
          Type: "OpenApi3",
        })
        .promise();
    } else {
      console.log(err.message);
    }
  }
}

module.exports = {
  run,
};
