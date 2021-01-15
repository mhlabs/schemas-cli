const inquirer = require("inquirer");
const prompt = inquirer.createPromptModule();

async function selectOne(list, message) {
  const selectList = await prompt({
    choices: list,
    message: message,
    type: "list",
    name: "answer",
  });
  return selectList.answer;
}

async function getRegistry(schemas, skipManaged = false) {
  const registries = await schemas.listRegistries().promise();
  if (skipManaged) {
    registries.Registries = registries.Registries.filter(
      (p) =>
        p.RegistryName !== "aws.events" &&
        p.RegistryName !== "discovered-schemas"
    );
  }
  if (!Object.keys(registries.Registries).length) {
    return null;
  }

  return await selectOne(
    registries.Registries.map((p) => p.RegistryName),
    "Select registry"
  );
}

module.exports = {
  selectOne,
  getRegistry,
};
