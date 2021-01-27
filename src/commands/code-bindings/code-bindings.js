const AWS = require("aws-sdk");
const schemas = new AWS.Schemas();
const apiGateway = new AWS.APIGateway();
const inputUtil = require("../../shared/input-util");
const fs = require("fs");
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");
const {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
  JSONSchemaInput,
  JSONSchemaStore,
} = require("quicktype-core");
const typeScriptOptions = require("quicktype-core/dist/language/TypeScriptFlow");
const languages = require("quicktype-core/dist/language/All");

require("./languages/csharp");
require("./languages/typescript");
require("./languages/python");
require("./languages/java");
require("./languages/swift");

const applicationJson = "application/json";
async function create(cmd) {
  let schema;
  const registry = await inputUtil.getRegistry(schemas);
  if (registry === "API Gateway") {
    const apis = [];
    let apiResponse = await apiGateway.getRestApis().promise();
    apis.push(...apiResponse.items.map((p) => {
      return { name: p.name, value: p };
    }));
    while(apiResponse.$response.hasNextPage()) {
      apiResponse = await apiResponse.$response.nextPage().promise();
      apis.push(...apiResponse.items.map((p) => {
        return { name: p.name, value: p };
      }));        
      
    } 
    const restApi = await inputUtil.selectOne(apis, "Select Rest API");
    const stages = (
      await apiGateway.getStages({ restApiId: restApi.id }).promise()
    ).item.map((p) => p.stageName);
    const stage = await inputUtil.selectOne(stages, "Select stage");
    const schemaResponse = await apiGateway
      .getExport({
        restApiId: restApi.id,
        exportType: "oas30",
        stageName: stage,
      })
      .promise();
    schema = JSON.parse(schemaResponse.body.toString());
  } else {
    const schemaName = await getSchemaName(registry);
    schema = schema || (await getSchema(registry, schemaName));
  }
  const paths = Object.keys(schema.paths);
  let outputSchemaName;
  if (paths.length) {
    const path = await getPath(schema);
    const method = await getMethod(schema, path);
    const direction = await getDirection(schema, path, method);
    if (direction === "responses") {
      const status = await getStatusCode(schema, path, method);
      const responses = schema.paths[path][method].responses[status];
      if (!responses.content || !responses.content[applicationJson]) {
        console.log(
          "No application/json content type. Can't parse schema:",
          responses
        );
        return;
      }
      const content =
        schema.paths[path][method].responses[status].content[applicationJson];
      if (!content.schema) {
        console.log(
          `Cannot handle ${JSON.stringify(content, null, 2)}`
        );
        return;
      }

      const ref =
      content.schema.type === "array"
          ? content.schema.items.$ref
          : content.schema.$ref;
      outputSchemaName = ref != null ? ref.split("/").slice(-1)[0] : null;
    } else {
      const ref =
        schema.paths[path][method].requestBody.content[applicationJson].schema
          .$ref;
      if (ref) {
        outputSchemaName = ref.split("/").slice(-1)[0];
      }
    }
  } else {
    outputSchemaName = await getSchemaNameFromComponents(schema);
  }
  if (outputSchemaName) {
    await generateType(outputSchemaName, schema, cmd);
  } else {
    console.log("Could not find reference");
  }
}

async function getSchemaNameFromComponents(schema) {
  const schemas = Object.keys(schema.components.schemas);
  if (schemas.length === 1) {
    return schemas[0];
  }
  return await inputUtil.selectOne(schemas, "Select component schema");
}
async function getStatusCode(schema, path, method) {
  const responses = Object.keys(schema.paths[path][method].responses);
  if (responses.length === 1) {
    return responses[0];
  }
  return await inputUtil.selectOne(responses, "Select status code");
}

async function getDirection(schema, path, method) {
  const directions = Object.keys(schema.paths[path][method]).filter(
    (p) => p === "requestBody" || p === "responses"
  );
  if (directions.length === 1) {
    return directions[0];
  }
  return await inputUtil.selectOne(directions, "Select request or response");
}

async function getMethod(schema, path) {
  const methods = Object.keys(schema.paths[path]);
  if (methods.length === 1) {
    return methods[0];
  }
  return await inputUtil.selectOne(methods, "Select method");
}

async function getPath(schema) {
  const paths = [];
  for (const path of Object.keys(schema.paths)) {
    paths.push({name: `[${Object.keys(schema.paths[path]).join(",")}] ${path}`, value: path})
  }
  return await inputUtil.selectOne(paths, "Select path");
}

async function getSchemaName(registry) {
  const schemaResponse = await schemas
    .listSchemas({ RegistryName: registry })
    .promise();
  return await inputUtil.selectOne(
    schemaResponse.Schemas.map((p) => p.SchemaName),
    "Select schema"
  );
}

async function getSchema(registry, schemaName) {
  const schema = await schemas
    .describeSchema({ RegistryName: registry, SchemaName: schemaName })
    .promise();
  return JSON.parse(schema.Content);
}

function traverseSchemaReferences(schema, current, list) {
  if (!list.includes(current)) {
    list.push(current);
    currentNode = schema.components.schemas[current];
    if (currentNode.type === "array") {
      const propName = schema.components.schemas[current].items.$ref
        .split("/")
        .slice(-1)[0];
      schema.components.schemas[
        current
      ].items.$ref = `#/definitions/${propName}`;
      traverseSchemaReferences(schema, propName, list);
    } else if (currentNode.enum) {
      schema.components.schemas[current].$ref = `#/definitions/${current}`;
    } else {
      for (const property of Object.keys(
        schema.components.schemas[current].properties
      )) {
        let prop = schema.components.schemas[current].properties[property];
        if (prop.type === "array") {
          prop = schema.components.schemas[current].properties[property].items;
        }
        if (prop.$ref) {
          const propName = prop.$ref.split("/").slice(-1)[0];
          if (
            schema.components.schemas[current].properties[property].type ===
            "array"
          ) {
            schema.components.schemas[current].properties[
              property
            ].items.$ref = `#/definitions/${propName}`;
          } else {
            schema.components.schemas[current].properties[
              property
            ].$ref = `#/definitions/${propName}`;
          }
          traverseSchemaReferences(schema, propName, list);
        }
      }
    }
  }
}

function traverse(schema, currentNode, list) {
  const refs = allNodes(currentNode, "$ref");
  for (const ref of refs) {
    const typeName = ref.split("/").slice(-1)[0];
    if (!list.includes(typeName)) {
      list.push(typeName);
    }
    traverse(schema.components.schemas[typeName]);
  }
}

function allNodes(obj, key, array) {
  array = array || [];
  if ("object" === typeof obj) {
    for (let k in obj) {
      if (k === key) {
        array.push(obj[k]);
      } else {
        allNodes(obj[k], key, array);
      }
    }
  }
  return array;
}

async function generateType(typeName, schema, cmd) {
  let jsonSchema = {
    $schema: "http://json-schema.org/draft-04/schema#",
    title: typeName,
    definitions: {},
    type: "object",
    ...toJsonSchema(schema.components.schemas[typeName]),
  };
  const includeList = [];
  traverse(schema, schema.components.schemas[typeName], includeList);
  for (const schemaItem of Object.keys(schema.components.schemas)) {
    if (!includeList.includes(schemaItem)) {
      // delete schema.components.schemas[schemaItem];
    }
  }
  jsonSchema.definitions = toJsonSchema(schema.components.schemas);

  jsonSchema = JSON.parse(
    JSON.stringify(jsonSchema).replace(
      /#\/components\/schemas\//g,
      "#/definitions/"
    )
  );
  const schemaInput = new JSONSchemaInput(new JSONSchemaStore());
  await schemaInput.addSource({
    name: typeName,
    schema: JSON.stringify(jsonSchema),
  });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  if (!cmd.language) {
    cmd.language = await inputUtil.selectOne(
      languages.all.map((p) => p.displayName).sort(),
      "Select language. Provide --language <languageName> flag to command to skip"
    );
  }

  const output = (
    await quicktype({
      inputData,
      lang: cmd.language,
    })
  ).lines.join("\n");

  if (cmd.outputFile) {
    fs.writeFileSync(cmd.outputFile, output);
  } else {
    console.log(output);
  }
}

async function generateTypeOld(typeName, schema, cmd) {
  const includeList = [];
  const allTypes = Object.keys(schema.components.schemas);
  traverseSchemaReferences(schema, typeName, includeList);
  schema.definitions = {};
  const jsonSchema = {
    $schema: "http://json-schema.org/draft-04/schema#",
    title: typeName,
    definitions: {},
    properties: {},
    type: "object",
  };
  const rootObject = includeList.shift();

  const node = schema.components.schemas[rootObject];
  if (node.properties) {
    for (const prop of Object.keys(node.properties)) {
      jsonSchema.properties[prop] = toJsonSchema(
        schema.components.schemas[rootObject].properties[prop]
      );
    }
  } else {
    jsonSchema.properties[rootObject] = toJsonSchema(node);
  }

  delete jsonSchema.properties.$schema;
  for (const name of allTypes) {
    if (includeList.includes(name)) {
      jsonSchema.definitions[name] = toJsonSchema(
        schema.components.schemas[name]
      );
    }
  }

  const schemaInput = new JSONSchemaInput(new JSONSchemaStore());
  await schemaInput.addSource({
    name: typeName,
    schema: JSON.stringify(jsonSchema),
  });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  if (!cmd.language) {
    cmd.language = await inputUtil.selectOne(
      languages.all.map((p) => p.displayName).sort(),
      "Select language. Provide --language <languageName> flag to command to skip"
    );
  }

  const output = (
    await quicktype({
      inputData,
      lang: cmd.language,
    })
  ).lines.join("\n");

  if (cmd.outputFile) {
    fs.writeFileSync(cmd.outputFile, output);
  } else {
    console.log(output);
  }
}

module.exports = {
  create,
  traverseSchemaReferences,
  generateType,
};
