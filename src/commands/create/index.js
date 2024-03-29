import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse, stringify } from '../../shared/parserv2.js';
import TJS from 'typescript-json-schema';
import ts from 'typescript';
import process from 'node:process';
import { SchemasClient, ListRegistriesCommand } from "@aws-sdk/client-schemas";
import { fromSSO } from "@aws-sdk/credential-provider-sso";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

export function createCommand(program) {

  program.command('create')
    .alias('c')
    .description('Browses types in your project and lets you create schemas from them')
    .option('-t, --template [path]', 'Path to SAM template', './template.yaml')
    .option('-e, --file-extension [extension]', 'File extension filter', '.ts')
    .option("-p, --profile [profile]", "AWS profile to use", "default")
    .option('--path [path]', 'Root path', './bin/Debug/net6.0')
    .option(
      "--region [region]",
      "The AWS region to use. Falls back on AWS_REGION environment variable if not specified"
    )
    .action(async (cmd) => {
      //console.log(cmd);
      let template = parse('template', fs.readFileSync(cmd.template, 'utf-8'));
      const globalRuntime = template.Globals?.Function?.Runtime;
      const firstFunctionRuntime = Object.values(template.Resources).find(r => r.Type === 'AWS::Serverless::Function')?.Properties?.Runtime;
      const runtime = globalRuntime || firstFunctionRuntime;
      const runtimeShort = runtime.substring(0, 3).toLowerCase();
      let result;
      if (runtimeShort === 'dot') {
        result = await dotnet(cmd);
      } else if (runtimeShort === 'nod') {
        result = await nodejs(cmd);
      } else {
        throw new Error(`Unsupported runtime ${runtime}`);
      }

      //create ./schemas if not exists
      if (!fs.existsSync('./schemas')) {
        fs.mkdirSync('./schemas');
      }

      var fileName = result.file.name.split('.').pop();

      const credentials = fromSSO({ profile: cmd.profile });
      const schemas = new SchemasClient({ credentials, region: cmd.region });

      const registries = await getRegistries(schemas);
      const registry = await inquirer.prompt({
        type: 'list',
        name: 'registry',
        message: 'Select registry',
        choices: registries
      });

      //create ./schemas/schema.json      
      fs.writeFileSync(`./schemas/${fileName}.json`, result.schema);
      template.Resources[fileName + 'Schema'] = {
        Type: 'AWS::EventSchemas::Schema',
        Properties: {
          Type: 'JSONSchemaDraft4',
          RegistryName: registry.registry,
          SchemaName: {
            'Fn::Sub': '${AWS::StackName}@' + fileName
          },
          Content: {
            'Fn::ToJsonString': {
              'Fn::Transform': {
                'Name': 'AWS::Include',
                'Parameters': {
                  'Location': `./schemas/${fileName}.json`
                }
              }
            }
          }
        }
      }

      // Add 'AWS::LanguageExtensions' to the template Transforms property
      template = ensureTemplatePropertyExist(template, 'Transform', 'AWS::LanguageExtensions');

      fs.writeFileSync(cmd.template, stringify('template', template));

      console.log(`✅ Added schema to ./schemas/${fileName}.json`);
      console.log('✅ Added schema resource to template');
      console.log('✅ Added AWS::LanguageExtensions transform to template');
    });
}

async function nodejs(cmd) {
  const types = []
  listTypesInDirectory("./src", types);

  const file = await inquirer.prompt({
    type: 'list',
    name: 'type',
    message: 'Select type',
    choices: types
  });

  //console.log(file);
  const program = TJS.getProgramFromFiles([file.type.filePath]);

  // We can either get the schema for one file and one type...
  const schema = JSON.stringify(TJS.generateSchema(program, file.type.name), null, 2);
  return { file: file.type, schema };
}

async function dotnet(cmd) {
  try {
    const netPath = path.resolve(__dirname, "..", "..", "..", 'net');
    const binFolderPath = cmd.path ? path.resolve(cmd.path) : process.cwd();
    const binFolderFiles = fs.readdirSync(binFolderPath);
    // Get the project name from the dll in the bin folder
    const projectName = binFolderFiles.filter(file => path.extname(file).toLowerCase() === '.dll')[0];
    const proc = execSync(`dotnet run ${path.resolve(cmd.path)} list ${projectName} ${binFolderPath} ${projectName}`, { cwd: netPath });
    const types = proc.toString().split('\n').sort().filter(p => p && p.length && !p.includes(" warning "));
    const file = await inquirer.prompt({
      type: 'list',
      name: 'name',
      message: 'Select',
      choices: types
    });
    const schemaProcess = execSync(`dotnet run ${path.resolve(cmd.path)} schema ${file.name} ${process.cwd()} ${projectName}`, { cwd: netPath });
    const schema = schemaProcess.toString();
    return { file, schema };
  } catch (e) {
    console.log(e.message);
  }
}

async function getRegistries(schemas) {
  const sources = [];
  let nextToken;
  do {
    const registries = await schemas.send(new ListRegistriesCommand({ NextToken: nextToken }));
    nextToken = registries.NextToken;
    registries.Registries = registries.Registries.filter(
      (p) =>
        p.RegistryName !== "aws.events" &&
        p.RegistryName !== "discovered-schemas"
    );
    sources.push(...registries.Registries.map((p) => p.RegistryName));
  } while (nextToken);
  return sources;
}

function listTypesInDirectory(directoryPath, types) {
  const fileNames = fs.readdirSync(directoryPath);
  for (const fileName of fileNames) {
    const filePath = path.join(directoryPath, fileName);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      listTypesInDirectory(filePath, types);
    } else if (filePath.endsWith(".ts")) {
      const sourceCode = fs.readFileSync(filePath, "utf-8");
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract types from the source file
      const typeNodes = [];
      function extractTypes(node) {
        if (ts.isTypeAliasDeclaration(node)) {
          typeNodes.push(node);
        }
        ts.forEachChild(node, extractTypes);
      }
      extractTypes(sourceFile);

      // Print type names
      typeNodes.forEach((typeNode) => {
        types.push({ name: typeNode.name.text, value: { name: typeNode.name.text, filePath } });
      });
    }
  }
}

function ensureTemplatePropertyExist(template, property, value) {
  // If property in the template is missing, make sure we create the property and the value to it
  if (!template[property]) {
    template[property] = value;
  } 
  // If property in the template is an array
  else if (Array.isArray(template[property])) {
    // If the value is not already in the array, add it
    if(!template[property].includes(value)) {
      // Add the new value second last of the array
      template[property].splice(template[property].length - 1, 0, value);
    }
  }
  // If property is not an array we should convert it to an array and push the value
  else if (!Array.isArray(template[property])) {
    const existingValue = template[property];

    // If the existingValue is not the same as the provided value, add it
    if(existingValue !== value) {
      // Add the new value to the beginning of the array
      template[property] = [value, existingValue];
    }
  }
  return template;
}