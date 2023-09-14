import { BooleanOption } from "quicktype-core/dist/RendererOptions.js";
  
import { tsFlowOptions } from "quicktype-core/dist/language/TypeScriptFlow.js";

tsFlowOptions.justTypes = new BooleanOption(
    "JustTypes",
    null,
    true
  );
  