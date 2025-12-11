import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { utilitiesTools } from "../../src/tools/utilities.js";
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

describe("utilitiesTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("list_extensions", () => {
    it("should list extensions with default limit of 20", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.extensionsList })
      );

      const result = await utilitiesTools.list_extensions.handler({});

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "extensions",
        "--no-interaction",
      ]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Extensions");
    });

    it("should filter extensions by search term", async () => {
      const extensionsOutput = `| ID    | Slug                  | Type   |
|-------|----------------------|--------|
| 12345 | my-plugin            | plugin |
| 67890 | another-plugin       | plugin |
| 11111 | my-theme             | theme  |`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: extensionsOutput })
      );

      const result = await utilitiesTools.list_extensions.handler({
        search: "my-",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('matching "my-"');
      expect(result.content).toContain("my-plugin");
      expect(result.content).toContain("my-theme");
      expect(result.content).not.toContain("another-plugin");
    });

    it("should apply custom limit", async () => {
      const manyExtensions = `| ID    | Slug      | Type   |
|-------|-----------|--------|
| 1     | plugin-1  | plugin |
| 2     | plugin-2  | plugin |
| 3     | plugin-3  | plugin |
| 4     | plugin-4  | plugin |
| 5     | plugin-5  | plugin |`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: manyExtensions })
      );

      const result = await utilitiesTools.list_extensions.handler({ limit: 2 });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("showing 2 of 5");
      expect(result.content).toContain("... and 3 more");
    });

    it("should handle CLI failure", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: false, stderr: "Not authenticated" })
      );

      const result = await utilitiesTools.list_extensions.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Not authenticated");
    });

    it("should parse extension type correctly", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.extensionsList })
      );

      const result = await utilitiesTools.list_extensions.handler({});

      expect(result.content).toContain("(plugin)");
      expect(result.content).toContain("(theme)");
    });
  });

  describe("validate_zip", () => {
    it("should validate zip file at path", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "ZIP file is valid",
        isError: false,
      });

      await utilitiesTools.validate_zip.handler({
        path: "/path/to/plugin.zip",
      });

      expect(executor.executeAndFormat).toHaveBeenCalledWith([
        "woo:validate-zip",
        "/path/to/plugin.zip",
      ]);
    });

    it("should return validation errors", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Error: Invalid plugin header",
        isError: true,
      });

      const result = await utilitiesTools.validate_zip.handler({
        path: "/path/to/invalid.zip",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Invalid plugin header");
    });
  });

  describe("manage_cache", () => {
    describe("get action", () => {
      it("should get cache value by key", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "cached_value_here",
          isError: false,
        });

        await utilitiesTools.manage_cache.handler({
          action: "get",
          key: "my_cache_key",
        });

        expect(executor.executeAndFormat).toHaveBeenCalledWith([
          "cache",
          "get",
          "my_cache_key",
        ]);
      });
    });

    describe("set action", () => {
      it("should set cache value", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Cache set successfully",
          isError: false,
        });

        await utilitiesTools.manage_cache.handler({
          action: "set",
          key: "my_key",
          value: "my_value",
        });

        expect(executor.executeAndFormat).toHaveBeenCalledWith([
          "cache",
          "set",
          "my_key",
          "my_value",
        ]);
      });

      it("should set cache value with expiration", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Cache set successfully",
          isError: false,
        });

        await utilitiesTools.manage_cache.handler({
          action: "set",
          key: "my_key",
          value: "my_value",
          expiration: 3600,
        });

        expect(executor.executeAndFormat).toHaveBeenCalledWith([
          "cache",
          "set",
          "my_key",
          "my_value",
          "3600",
        ]);
      });

      it("should return error when value is missing for set action", async () => {
        const result = await utilitiesTools.manage_cache.handler({
          action: "set",
          key: "my_key",
        });

        expect(executor.executeAndFormat).not.toHaveBeenCalled();
        expect(result.isError).toBe(true);
        expect(result.content).toContain("'value' is required");
      });
    });

    describe("delete action", () => {
      it("should delete cache by key", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Cache deleted",
          isError: false,
        });

        await utilitiesTools.manage_cache.handler({
          action: "delete",
          key: "my_key",
        });

        expect(executor.executeAndFormat).toHaveBeenCalledWith([
          "cache",
          "delete",
          "my_key",
        ]);
      });
    });
  });

  describe("get_qit_dir", () => {
    it("should return QIT configuration directory", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "/home/user/.qit",
        isError: false,
      });

      const result = await utilitiesTools.get_qit_dir.handler();

      expect(executor.executeAndFormat).toHaveBeenCalledWith(["qit:dir"]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain(".qit");
    });
  });

  describe("sync_cache", () => {
    it("should sync local cache with QIT Manager", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Cache synced successfully",
        isError: false,
      });

      const result = await utilitiesTools.sync_cache.handler();

      expect(executor.executeAndFormat).toHaveBeenCalledWith(["sync"]);
      expect(result.isError).toBe(false);
    });

    it("should handle sync failure", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Error: Unable to connect to QIT Manager",
        isError: true,
      });

      const result = await utilitiesTools.sync_cache.handler();

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Unable to connect");
    });
  });
});
