import { vi } from "vitest";
import type { ExecuteResult } from "../../src/cli/executor.js";

/**
 * Mock response builder for CLI command results
 */
export function mockResult(overrides: Partial<ExecuteResult> = {}): ExecuteResult {
  return {
    success: true,
    stdout: "",
    stderr: "",
    exitCode: 0,
    ...overrides,
  };
}

/**
 * Create a mock for executeQitCommand that returns the specified result
 */
export function createExecuteQitCommandMock(result: ExecuteResult) {
  return vi.fn().mockResolvedValue(result);
}

/**
 * Create a mock that returns different results based on command arguments
 */
export function createConditionalMock(
  conditions: Array<{
    match: (args: string[]) => boolean;
    result: ExecuteResult;
  }>,
  defaultResult: ExecuteResult = mockResult({ success: false, stderr: "No matching condition" })
) {
  return vi.fn().mockImplementation((args: string[]) => {
    for (const condition of conditions) {
      if (condition.match(args)) {
        return Promise.resolve(condition.result);
      }
    }
    return Promise.resolve(defaultResult);
  });
}

/**
 * Sample CLI outputs for testing parsing logic
 */
export const sampleOutputs = {
  extensionsList: `| ID    | Slug                  | Type   |
|-------|----------------------|--------|
| 12345 | my-plugin            | plugin |
| 67890 | another-plugin       | plugin |
| 11111 | my-theme             | theme  |`,

  packagesList: `| Package ID               | Namespace    | Version | Size   | Visibility |
|--------------------------|--------------|---------|--------|------------|
| test-pkg/e2e-tests       | test-pkg     | 1.0.0   | 2.1 MB | 🌐 Public  |
| private-ns/utility       | private-ns   | 2.3.1   | 512 KB | 🔒 Private |`,

  envList: `Environment Information
------------------------------------------------------------------------------
Env_id                    qitenv01ed18d948bfe5cc
Created_at                2024-01-15 10:30:00
Php_version               8.2
Woocommerce_version       8.5.0
Site_url                  http://localhost:8080
Status                    running
------------------------------------------------------------------------------`,

  envListMultiple: `Environment Information
------------------------------------------------------------------------------
Env_id                    qitenv01ed18d948bfe5cc
Created_at                2024-01-15 10:30:00
Php_version               8.2
Woocommerce_version       8.5.0
Site_url                  http://localhost:8080
Status                    running
------------------------------------------------------------------------------
Environment Information
------------------------------------------------------------------------------
Env_id                    qitenv02abc123def456
Created_at                2024-01-15 11:00:00
Php_version               8.3
Woocommerce_version       9.0.0
Site_url                  http://localhost:8081
Status                    running
------------------------------------------------------------------------------`,

  testResult: `Test Run Id: 123456
Status: success
Test Type: security
Extension: my-plugin
Report URL: https://qit.woo.com/report/123456`,

  testResultJson: `{
  "test_run_id": 123456,
  "status": "success",
  "test_type": "security",
  "extension": "my-plugin",
  "report_url": "https://qit.woo.com/report/123456"
}`,

  authError: "You are not connected. Please authenticate using 'qit connect'.",
};
