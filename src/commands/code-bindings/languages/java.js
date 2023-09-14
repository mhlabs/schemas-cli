import { BooleanOption } from "quicktype-core/dist/RendererOptions.js";
  
import { javaOptions } from "quicktype-core/dist/language/Java.js";

javaOptions.justTypes = new BooleanOption(
  "JustTypes",
  null,
  true
);
javaOptions.useList = new BooleanOption(
  "UseList",
  null,
  true
);
