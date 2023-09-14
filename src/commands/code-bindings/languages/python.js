import { BooleanOption } from "quicktype-core/dist/RendererOptions.js";
  
import { pythonOptions as _pythonOptions } from "quicktype-core/dist/language/Python.js";

_pythonOptions.justTypes = new BooleanOption(
    "JustTypes",
    null,
    true
  );
  