import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testResultsTools } from "../../src/tools/test-results.js";
import * as executor from "../../src/cli/executor.js";
import { mockResult, sampleOutputs } from "../mocks/executor.mock.js";

vi.mock("../../src/cli/executor.js", async () => {
  const actual = await vi.importActual("../../src/cli/executor.js");
  return {
    ...actual,
    executeQitCommand: vi.fn(),
    executeAndFormat: vi.fn(),
    buildArgs: actual.buildArgs,
  };
});

describe("testResultsTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get_test_result", () => {
    it("should get single test result by ID", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.testResult })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "123456",
      });

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "get",
        "123456",
      ]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Test Run Id");
    });

    it("should get multiple test results", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.testResult })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: ["123", "456", "789"],
      });

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "get-multiple",
        "123",
        "456",
        "789",
      ]);
      expect(result.isError).toBe(false);
    });

    it("should include json flag when requested", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.testResultJson })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "123456",
        json: true,
      });

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "get",
        "123456",
        "--json",
      ]);
      expect(result.isError).toBe(false);
    });

    it("should reject non-numeric test run IDs", async () => {
      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "abc123",
      });

      expect(executor.executeQitCommand).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content).toContain("Invalid test run ID");
      expect(result.content).toContain("must be numeric");
    });

    it("should reject test run IDs exceeding PHP_INT_MAX", async () => {
      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "99999999999999999999999",
      });

      expect(executor.executeQitCommand).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content).toContain("too large");
    });

    it("should accept valid large IDs within PHP_INT_MAX", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.testResult })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "9223372036854775807", // PHP_INT_MAX
      });

      expect(executor.executeQitCommand).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it("should reject mixed valid/invalid IDs in array", async () => {
      const result = await testResultsTools.get_test_result.handler({
        test_run_id: ["123", "abc", "456"],
      });

      expect(executor.executeQitCommand).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content).toContain('Invalid test run ID "abc"');
    });

    it("should handle failed test status as non-error (exit code 1 with valid data)", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          exitCode: 1,
          stdout: "Test Run Id: 123\nStatus: failed",
        })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Test Run Id");
    });

    it("should handle JSON response as valid result", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          exitCode: 1,
          stdout: '{"test_run_id": 123, "status": "failed"}',
        })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
    });

    it("should return error when test not found", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stderr: "Test not found",
        })
      );

      const result = await testResultsTools.get_test_result.handler({
        test_run_id: "999999",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Error");
    });
  });

  describe("list_tests", () => {
    it("should list tests with default per_page of 10", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({});

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--per_page",
        "10",
      ]);
    });

    it("should filter by status", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({ status: "failed" });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--test_status",
        "failed",
        "--per_page",
        "10",
      ]);
    });

    it("should filter by test_type", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({ test_type: "security" });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--test_types",
        "security",
        "--per_page",
        "10",
      ]);
    });

    it("should filter by extension", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({ extension: "my-plugin" });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--extensions",
        "my-plugin",
        "--per_page",
        "10",
      ]);
    });

    it("should use custom per_page value", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({ per_page: 50 });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--per_page",
        "50",
      ]);
    });

    it("should combine multiple filters", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Test list output",
        isError: false,
      });

      await testResultsTools.list_tests.handler({
        status: "success",
        test_type: "e2e",
        extension: "my-plugin",
        per_page: 25,
      });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "list-tests",
        "--test_status",
        "success",
        "--test_types",
        "e2e",
        "--extensions",
        "my-plugin",
        "--per_page",
        "25",
      ]);
    });
  });

  describe("get_test_report", () => {
    it("should get local test report", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: "Detailed test report content..." })
      );

      const result = await testResultsTools.get_test_report.handler({
        test_run_id: "123",
      });

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "report",
        "123",
      ]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Detailed test report");
    });

    it("should handle report not found gracefully", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stdout: "Could not find report for test 123",
        })
      );

      const result = await testResultsTools.get_test_report.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Report not available locally");
      expect(result.content).toContain("managed test");
    });

    it("should handle 'not found' error message", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stderr: "Report not found for this test run",
        })
      );

      const result = await testResultsTools.get_test_report.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Report not available locally");
    });

    it("should return error when no output at all", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: false, stdout: "", stderr: "" })
      );

      const result = await testResultsTools.get_test_report.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBe("No report found");
    });
  });

  describe("open_test_result", () => {
    it("should open test result in browser and return URL", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: true,
          stderr: "Opening https://qit.woo.com/report/123 in browser...",
        })
      );

      const result = await testResultsTools.open_test_result.handler({
        test_run_id: "123",
      });

      expect(executor.executeQitCommand).toHaveBeenCalledWith(["open", "123"]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Report opened in browser");
      expect(result.content).toContain("https://qit.woo.com/report/123");
    });

    it("should extract URL from stdout", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: true,
          stdout: "Report URL: https://qit.woo.com/test/456",
        })
      );

      const result = await testResultsTools.open_test_result.handler({
        test_run_id: "456",
      });

      expect(result.content).toContain("https://qit.woo.com/test/456");
    });

    it("should handle case with no URL in output", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: true,
          stdout: "Browser launched successfully",
        })
      );

      const result = await testResultsTools.open_test_result.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBe("Browser launched successfully");
    });

    it("should return generic message when no output at all", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: "", stderr: "" })
      );

      const result = await testResultsTools.open_test_result.handler({
        test_run_id: "123",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBe("Report opened in browser.");
    });
  });
});
