import { authTools } from "./auth.js";
import { testExecutionTools } from "./test-execution.js";
import { testResultsTools } from "./test-results.js";
import { groupsTools } from "./groups.js";
import { environmentTools } from "./environment.js";
import { packagesTools } from "./packages.js";
import { configTools } from "./config.js";
import { utilitiesTools } from "./utilities.js";

export const allTools = {
  ...authTools,
  ...testExecutionTools,
  ...testResultsTools,
  ...groupsTools,
  ...environmentTools,
  ...packagesTools,
  ...configTools,
  ...utilitiesTools,
};

export type ToolName = keyof typeof allTools;

export {
  authTools,
  testExecutionTools,
  testResultsTools,
  groupsTools,
  environmentTools,
  packagesTools,
  configTools,
  utilitiesTools,
};
