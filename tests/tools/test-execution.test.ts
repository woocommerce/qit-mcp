import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testExecutionTools } from "../../src/tools/test-execution.js";
import * as executor from "../../src/cli/executor.js";

vi.mock("../../src/cli/executor.js", async () => {
  const actual = await vi.importActual("../../src/cli/executor.js");
  return {
    ...actual,
    executeAndFormat: vi.fn(),
    buildArgs: actual.buildArgs,
  };
});

describe("testExecutionTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("run_test", () => {
    describe("local tests (activation, e2e, performance)", () => {
      it("should run activation test with all version flags", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
          php_version: "8.2",
          wp_version: "6.5",
          wc_version: "8.5",
        });

        const call = vi.mocked(executor.executeAndFormat).mock.calls[0];
        const args = call[0];

        expect(args).toContain("run:activation");
        expect(args).toContain("my-plugin");
        expect(args).toContain("--php_version");
        expect(args).toContain("8.2");
        expect(args).toContain("--wordpress_version");
        expect(args).toContain("6.5");
        expect(args).toContain("--woocommerce_version");
        expect(args).toContain("8.5");
      });

      it("should include local-only flags for e2e tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "e2e",
          plugin: "my-plugin",
          object_cache: true,
          tunnel: "cloudflare",
          ui: true,
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--object_cache");
        expect(args).toContain("--tunnel");
        expect(args).toContain("cloudflare");
        expect(args).toContain("--ui");
      });

      it("should add additional plugins and themes for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
          additional_plugins: ["woocommerce", "jetpack:12.0"],
          additional_themes: ["storefront"],
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--plugin");
        expect(args).toContain("woocommerce");
        expect(args).toContain("jetpack:12.0");
        expect(args).toContain("--theme");
        expect(args).toContain("storefront");
      });

      it("should add volumes for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "e2e",
          plugin: "my-plugin",
          volumes: ["/host/path:/container/path", "/another:/mount"],
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--volume");
        expect(args).toContain("/host/path:/container/path");
        expect(args).toContain("/another:/mount");
      });

      it("should add env_vars for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "performance",
          plugin: "my-plugin",
          env_vars: { DEBUG: "true", API_KEY: "secret" },
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--env");
        expect(args).toContain("DEBUG=true");
        expect(args).toContain("API_KEY=secret");
      });

      it("should add test_packages for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "e2e",
          plugin: "my-plugin",
          test_packages: ["custom/e2e-tests:1.0.0"],
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--test-package");
        expect(args).toContain("custom/e2e-tests:1.0.0");
      });

      it("should default to sync mode for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        // Should NOT have --async flag
        expect(args).not.toContain("--async");
      });

      it("should use longer timeout for local tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "e2e",
          plugin: "my-plugin",
        });

        const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];

        expect(options?.timeout).toBe(1800000); // 30 minutes
      });
    });

    describe("managed tests (security, malware, phpstan, etc.)", () => {
      it("should NOT include version flags for security tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "security",
          plugin: "my-plugin",
          php_version: "8.2", // Should be ignored
          wp_version: "6.5", // Should be ignored
          wc_version: "8.5", // Should be ignored
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("run:security");
        expect(args).not.toContain("--php_version");
        expect(args).not.toContain("--wordpress_version");
        expect(args).not.toContain("--woocommerce_version");
      });

      it("should NOT include version flags for malware tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "malware",
          plugin: "my-plugin",
          php_version: "8.2",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).not.toContain("--php_version");
      });

      it("should include WP/Woo but NOT PHP version for phpstan tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "phpstan",
          plugin: "my-plugin",
          php_version: "8.2", // Should be ignored
          wp_version: "6.5",
          wc_version: "8.5",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).not.toContain("--php_version");
        expect(args).toContain("--wordpress_version");
        expect(args).toContain("--woocommerce_version");
      });

      it("should include WP/Woo but NOT PHP version for phpcompatibility tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "phpcompatibility",
          plugin: "my-plugin",
          wp_version: "6.5",
          wc_version: "8.5",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).not.toContain("--php_version");
        expect(args).toContain("--wordpress_version");
        expect(args).toContain("--woocommerce_version");
      });

      it("should default to async mode for managed tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "security",
          plugin: "my-plugin",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--async");
        expect(args).toContain("--print-report-url");
      });

      it("should use shorter timeout for async managed tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "security",
          plugin: "my-plugin",
        });

        const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];

        expect(options?.timeout).toBe(120000); // 2 minutes
      });

      it("should NOT include local-only flags for managed tests", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test enqueued",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "security",
          plugin: "my-plugin",
          object_cache: true, // Should be ignored
          tunnel: "cloudflare", // Should be ignored
          additional_plugins: ["woocommerce"], // Should be ignored
          volumes: ["/path:/path"], // Should be ignored
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).not.toContain("--object_cache");
        expect(args).not.toContain("--tunnel");
        expect(args).not.toContain("--plugin");
        expect(args).not.toContain("--volume");
      });
    });

    describe("common options", () => {
      it("should include zip option when provided", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
          zip: "/path/to/plugin.zip",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--zip");
        expect(args).toContain("/path/to/plugin.zip");
      });

      it("should include config option when provided", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "e2e",
          plugin: "my-plugin",
          config: "/path/to/qit.json",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--config");
        expect(args).toContain("/path/to/qit.json");
      });

      it("should include json flag when requested", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "{}",
          isError: false,
        });

        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
          json: true,
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--json");
      });

      it("should respect explicit async flag override", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Test completed",
          isError: false,
        });

        // Force async on a local test
        await testExecutionTools.run_test.handler({
          type: "activation",
          plugin: "my-plugin",
          async: true,
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

        expect(args).toContain("--async");
      });
    });
  });

  describe("run_test_group", () => {
    it("should run test group with group name", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group tests completed",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "full-suite",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

      expect(args).toContain("run:group");
      expect(args).toContain("full-suite");
    });

    it("should include config option", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group tests completed",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "ci-tests",
        config: "/custom/qit.json",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

      expect(args).toContain("--config");
      expect(args).toContain("/custom/qit.json");
    });

    it("should include wait flag", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group tests completed",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "ci-tests",
        wait: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

      expect(args).toContain("--wait");
    });

    it("should include json flag", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "{}",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "ci-tests",
        json: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];

      expect(args).toContain("--json");
    });

    it("should use longer timeout when wait is true", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group tests completed",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "ci-tests",
        wait: true,
      });

      const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];

      expect(options?.timeout).toBe(1800000); // 30 minutes
    });

    it("should use shorter timeout when wait is not set", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group tests enqueued",
        isError: false,
      });

      await testExecutionTools.run_test_group.handler({
        group: "ci-tests",
      });

      const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];

      expect(options?.timeout).toBe(300000); // 5 minutes
    });
  });
});
