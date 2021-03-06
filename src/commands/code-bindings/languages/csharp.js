const { CSharpTargetLanguage } = require("quicktype-core");
const {
    StringOption,
    EnumOption,
  } = require("quicktype-core/dist/RendererOptions");
  
const cSharpOptions = require("quicktype-core/dist/language/CSharp");
const languages = require("quicktype-core/dist/language/All");
languages.all.splice(languages.all.findIndex(v => v.displayName === "C#"), 1)
languages.all.unshift(new CSharpTargetLanguage("C#", ["csharp"], "cs"));
cSharpOptions.cSharpOptions.namespace = new StringOption(
  "Namespace",
  null,
  null,
  "AutoGenerated"
);
cSharpOptions.cSharpOptions.useList = new EnumOption(
  "array-type",
  "Use T[] or List<T>",
  [
    ["array", true],
    ["list", false],
  ]
);
