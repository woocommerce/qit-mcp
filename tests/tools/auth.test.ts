import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authTools } from "../../src/tools/auth.js";
import * as executor from "../../src/cli/executor.js";
import { mockResult, sampleOutputs } from "../mocks/executor.mock.js";

vi.mock("../../src/cli/executor.js", async () => {
  const actual = await vi.importActual("../../src/cli/executor.js");
  return {
    ...actual,
    executeQitCommand: vi.fn(),
    executeAndFormat: vi.fn(),
  };
});

describe("authTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authenticate", () => {
    it("should call connect command with no args when credentials not provided", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Connected successfully",
        isError: false,
      });

      const result = await authTools.authenticate.handler({});

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "connect",
        "--no-interaction",
      ]);
      expect(result.isError).toBe(false);
    });

    it("should include user flag when username provided", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Connected successfully",
        isError: false,
      });

      await authTools.authenticate.handler({ user: "testuser" });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "connect",
        "--user",
        "testuser",
        "--no-interaction",
      ]);
    });

    it("should include application_password flag when provided", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Connected successfully",
        isError: false,
      });

      await authTools.authenticate.handler({
        user: "testuser",
        application_password: "secret123",
      });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "connect",
        "--user",
        "testuser",
        "--application_password",
        "secret123",
        "--no-interaction",
      ]);
    });

    it("should return error from CLI", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Error: Invalid credentials",
        isError: true,
      });

      const result = await authTools.authenticate.handler({
        user: "baduser",
        application_password: "wrong",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Invalid credentials");
    });
  });

  describe("get_auth_status", () => {
    it("should return authenticated status with extension count when CLI succeeds", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.extensionsList })
      );

      const result = await authTools.get_auth_status.handler();

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "extensions",
        "--no-interaction",
      ]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Authenticated");
      expect(result.content).toContain("3 extension(s)"); // 3 rows in sample
    });

    it("should return not authenticated message when auth error detected", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stderr: "You are not connected. Please authenticate.",
        })
      );

      const result = await authTools.get_auth_status.handler();

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Not authenticated");
      expect(result.content).toContain("authenticate");
    });

    it("should return not authenticated when output contains 'connect'", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stderr: "Please run qit connect first",
        })
      );

      const result = await authTools.get_auth_status.handler();

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Not authenticated");
    });

    it("should return error for unknown failures", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({
          success: false,
          stderr: "Network timeout error",
        })
      );

      const result = await authTools.get_auth_status.handler();

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Unable to determine authentication status");
      expect(result.content).toContain("Network timeout error");
    });

    it("should count extension lines correctly excluding header and separator", async () => {
      const outputWithHeaders = `| ID | Slug | Type |
|-----|------|------|
| 1 | plugin-a | plugin |
| 2 | plugin-b | plugin |`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: outputWithHeaders })
      );

      const result = await authTools.get_auth_status.handler();

      expect(result.content).toContain("2 extension(s)");
    });
  });
});
