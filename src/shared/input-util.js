import { statSync } from "fs";
import path from "path";
import inquirer from "inquirer";
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt";
import { ListRegistriesCommand } from "@aws-sdk/client-schemas";
inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection);
const prompt = inquirer.createPromptModule();

export async function selectOne(list, message) {
  const selectList = await prompt({
    choices: list,
    message: message,
    type: "list",
    name: "answer",
  });
  return selectList.answer;
}

async function getSchemaStorage(schemas, offlineMode = false) {
  const sources = [];
  if (!offlineMode) {
    sources.push(new inquirer.Separator("Amazon EventBridge Schema Registry"));
    sources.push(...(await getRegistries(schemas)));
    sources.push(new inquirer.Separator("Amazon API Gateway"));
    sources.push("REST APIs");
  }
  sources.push(new inquirer.Separator("Other sources"));
  sources.push("Local file");
  sources.push("URL");
  if (!sources.length) {
    return null;
  }

  return await getRegistryName(sources);
}

async function getRegistryName(sources) {
  return await selectOne(sources, "Select registry");
}

export async function getRegistry(schemas, skipManaged) {
  return await selectOne(
    await getRegistries(schemas, skipManaged),
    "Select registry"
  );
}

async function getRegistries(schemas, skipManaged) {
  const sources = [];
  const registries = await schemas.send(new ListRegistriesCommand( {}));
  if (skipManaged) {
    registries.Registries = registries.Registries.filter(
      (p) =>
        p.RegistryName !== "aws.events" &&
        p.RegistryName !== "discovered-schemas"
    );
  }
  sources.push(...registries.Registries.map((p) => p.RegistryName));
  return sources;
}

async function input(message) {
  return (
    await prompt({
      type: "input",
      message: message,
      name: "input",
    })
  ).input;
}

async function file(message) {
  let cont = false;
  let fileName;
  do {
    fileName = (
      await _prompt({
        type: "file-tree-selection",
        name: "file",
        message: message,
        validate: (f) => {
          const stats = statSync(f);
          if (stats.isDirectory()) return true;
          if (
            f.toLowerCase().endsWith(".json") ||
            f.toLowerCase().endsWith(".yaml") ||
            f.toLowerCase().endsWith(".yml")
          ) {
            return true;
          }
          return false;
        },
        onlyShowValid: true,
      })
    ).file;
    const stats = statSync(fileName);
    cont = stats.isDirectory();
  } while (cont);
  return fileName;
}

export default {
  selectOne,
  getSchemaStorage,
  getRegistry,
  input,
  file,
};
