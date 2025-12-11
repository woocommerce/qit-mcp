import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { packagesTools } from "../../src/tools/packages.js";
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

describe("packagesTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("manage_package", () => {
    describe("publish action", () => {
      it("should publish package from current directory", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package published",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "publish",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:publish");
      });

      it("should publish package from specified path", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package published",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "publish",
          path: "/path/to/package",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:publish");
        expect(args).toContain("/path/to/package");
      });
    });

    describe("download action", () => {
      it("should download package by name", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package downloaded",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "download",
          package_name: "qit/e2e-tests:1.0.0",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:download");
        expect(args).toContain("qit/e2e-tests:1.0.0");
      });

      it("should download to specific output path", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package downloaded",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "download",
          package_name: "qit/e2e-tests:1.0.0",
          path: "/output/dir",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:download");
        expect(args).toContain("qit/e2e-tests:1.0.0");
        expect(args).toContain("--output");
        expect(args).toContain("/output/dir");
      });
    });

    describe("scaffold action", () => {
      it("should scaffold e2e package", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package scaffolded",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "scaffold",
          package_name: "my-org/my-tests",
          type: "e2e",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:scaffold");
        expect(args).toContain("my-org/my-tests");
        expect(args).toContain("--type");
        expect(args).toContain("e2e");
      });

      it("should scaffold utility package with output path", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package scaffolded",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "scaffold",
          package_name: "my-org/setup-utils",
          type: "utility",
          path: "/output/path",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:scaffold");
        expect(args).toContain("my-org/setup-utils");
        expect(args).toContain("--type");
        expect(args).toContain("utility");
        expect(args).toContain("--output");
        expect(args).toContain("/output/path");
      });
    });

    describe("delete action", () => {
      it("should delete package by name", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package deleted",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "delete",
          package_name: "qit/old-tests:1.0.0",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:delete");
        expect(args).toContain("qit/old-tests:1.0.0");
      });
    });

    describe("show action", () => {
      it("should show package details", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Package details...",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "show",
          package_name: "qit/e2e-tests:1.0.0",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("package:show");
        expect(args).toContain("qit/e2e-tests:1.0.0");
      });

      it("should include json flag when requested", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "{}",
          isError: false,
        });

        await packagesTools.manage_package.handler({
          action: "show",
          package_name: "qit/e2e-tests:1.0.0",
          json: true,
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("--json");
      });
    });

    it("should return error for unknown action", async () => {
      const result = await packagesTools.manage_package.handler({
        action: "unknown" as "publish",
        package_name: "test",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Unknown action");
    });
  });

  describe("list_packages", () => {
    it("should list packages with default limit of 20", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.packagesList })
      );

      const result = await packagesTools.list_packages.handler({});

      expect(executor.executeQitCommand).toHaveBeenCalledWith(["package:list"]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Packages");
    });

    it("should filter by type", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.packagesList })
      );

      await packagesTools.list_packages.handler({ type: "e2e" });

      expect(executor.executeQitCommand).toHaveBeenCalledWith([
        "package:list",
        "--type",
        "e2e",
      ]);
    });

    it("should filter by search term", async () => {
      const packagesOutput = `| Package ID               | Namespace    | Version | Size   | Visibility |
|--------------------------|--------------|---------|--------|------------|
| test-pkg/e2e-tests       | test-pkg     | 1.0.0   | 2.1 MB | 🌐 Public  |
| other-ns/utility         | other-ns     | 2.3.1   | 512 KB | 🔒 Private |
| test-pkg/setup           | test-pkg     | 1.1.0   | 1.0 MB | 🌐 Public  |`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: packagesOutput })
      );

      const result = await packagesTools.list_packages.handler({
        search: "test-pkg",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('matching "test-pkg"');
      expect(result.content).toContain("test-pkg/e2e-tests");
      expect(result.content).toContain("test-pkg/setup");
      expect(result.content).not.toContain("other-ns/utility");
    });

    it("should apply custom limit", async () => {
      const manyPackages = `| Package ID               | Namespace    | Version | Size   | Visibility |
|--------------------------|--------------|---------|--------|------------|
| pkg1/test                | pkg1         | 1.0.0   | 1 MB   | 🌐 Public  |
| pkg2/test                | pkg2         | 1.0.0   | 1 MB   | 🌐 Public  |
| pkg3/test                | pkg3         | 1.0.0   | 1 MB   | 🌐 Public  |
| pkg4/test                | pkg4         | 1.0.0   | 1 MB   | 🌐 Public  |
| pkg5/test                | pkg5         | 1.0.0   | 1 MB   | 🌐 Public  |`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: manyPackages })
      );

      const result = await packagesTools.list_packages.handler({ limit: 2 });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("showing 2 of 5");
      expect(result.content).toContain("... and 3 more");
    });

    it("should return message when no packages found", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: "No packages found" })
      );

      const result = await packagesTools.list_packages.handler({
        search: "nonexistent",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("No packages found");
    });

    it("should strip visibility emoji from output", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.packagesList })
      );

      const result = await packagesTools.list_packages.handler({});

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Public");
      expect(result.content).toContain("Private");
      expect(result.content).not.toContain("🌐");
      expect(result.content).not.toContain("🔒");
    });

    it("should handle CLI failure", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: false, stderr: "Not authenticated" })
      );

      const result = await packagesTools.list_packages.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Not authenticated");
    });

    it("should filter out PHP deprecation warnings", async () => {
      const outputWithWarnings = `PHP Deprecated: Some warning
Deprecated: Another warning
${sampleOutputs.packagesList}`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: outputWithWarnings })
      );

      const result = await packagesTools.list_packages.handler({});

      expect(result.isError).toBe(false);
      expect(result.content).not.toContain("Deprecated");
    });
  });
});
