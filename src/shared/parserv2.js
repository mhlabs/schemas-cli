import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { yamlParse, yamlDump } from "yaml-cfn";
let format = {
  yaml: "yaml",
};
export function parse(identifier, str) {
  try {
    const parsed = JSON.parse(str);
    format[identifier] = "json";
    return parsed;
  } catch {
    const parsed = yamlParse(str);
    format[identifier] = "yaml";
    return parsed;
  }
}
export function stringify(identifier, obj) {
  if (format[identifier] === "json") return JSON.stringify(obj, null, 2);
  if (format[identifier] === "yaml")
    return yamlDump(obj).replace(/!<(.+?)>/g, "$1");
}

function findSAMTemplateFile(directory) {
  if (process.env.SAMP_TEMPLATE_PATH && process.env.SAMP_TEMPLATE_PATH !== 'undefined') {
    return process.env.SAMP_TEMPLATE_PATH;
  }
  if (existsSync("./cdk.json")) {
    return ".samp-out/mock-template.yaml";
  }
  const files = readdirSync(directory);

  for (const file of files) {
    const filePath = join(directory, file);

    // Check if the file extension is .json, .yml, or .yaml
    if (file.match(/\.(json|ya?ml|template)$/i)) {
      const content = readFileSync(filePath, 'utf8');

      // Check if the content of the file contains the specified string
      if (content.includes('AWS::Serverless-2016-10-31')) {
        //console.log('SAM template file found:', file);
        return filePath;
      }
    }
  }

  console.log('Template file not found.');
  return null;
}

export default {
  parse,
  stringify,
  format,
  findSAMTemplateFile
};
