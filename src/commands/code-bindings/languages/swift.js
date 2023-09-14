import { BooleanOption } from "quicktype-core/dist/RendererOptions.js";
  
import { swiftOptions } from "quicktype-core/dist/language/Swift.js";

swiftOptions.justTypes = new BooleanOption(
  "JustTypes",
  null,
  true
);
