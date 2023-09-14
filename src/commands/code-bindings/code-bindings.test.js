import { test } from "quicktype-core/dist/MarkovChain";
import testSchema from "../../../test-data/petstore.json";
import { traverseSchemaReferences } from "./code-bindings";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";

describe("Traverse when root is array of objects", () => {
  const outputList = [];
  const allRelevantItems = traverseSchemaReferences(
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
