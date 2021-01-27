const { test } = require("quicktype-core/dist/MarkovChain");
const testSchema = require("../../../test-data/petstore.json");
const codeBindings = require("./code-bindings");
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");

describe("Traverse when root is array of objects", () => {
  const outputList = [];
  const allRelevantItems = codeBindings.traverseSchemaReferences(
    testSchema,
    "Pets",
    outputList
  );
  expect(outputList.length).toBe(2);
});

describe("Test allOf", () => {
  const schema = {
    Pet: {
      allOf: [
        {
          $ref: "#/components/schemas/NewPet",
        },
        {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              format: "int64",
            },
          },
        },
      ],
    },
    NewPet: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
        },
        tag: {
          type: "string",
        },
      },
    },
    Error: {
      type: "object",
      properties: {
        code: {
          type: "integer",
          format: "int32",
        },
        message: {
          type: "string",
        },
      },
    },
  };

});
