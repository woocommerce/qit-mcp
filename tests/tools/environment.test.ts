import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { environmentTools } from "../../src/tools/environment.js";
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

describe("environmentTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("start_environment", () => {
    it("should start environment with minimal options", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({});

      const call = vi.mocked(executor.executeAndFormat).mock.calls[0];
      expect(call[0]).toContain("env:up");
    });

    it("should include environment type", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        environment_type: "e2e",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--environment_type");
      expect(args).toContain("e2e");
    });

    it("should include all version flags", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        php_version: "8.3",
        wp_version: "6.5",
        wc_version: "9.0",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--php_version");
      expect(args).toContain("8.3");
      expect(args).toContain("--wordpress_version");
      expect(args).toContain("6.5");
      expect(args).toContain("--woocommerce_version");
      expect(args).toContain("9.0");
    });

    it("should add plugins array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        plugins: ["woocommerce", "jetpack", "/path/to/local-plugin.zip"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args.filter((a: string) => a === "--plugin").length).toBe(3);
      expect(args).toContain("woocommerce");
      expect(args).toContain("jetpack");
      expect(args).toContain("/path/to/local-plugin.zip");
    });

    it("should add themes array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        themes: ["storefront", "twentytwentyfour"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args.filter((a: string) => a === "--theme").length).toBe(2);
      expect(args).toContain("storefront");
      expect(args).toContain("twentytwentyfour");
    });

    it("should add test_packages array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        test_packages: ["woo/e2e-tests:1.0.0"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--test-package");
      expect(args).toContain("woo/e2e-tests:1.0.0");
    });

    it("should add utilities array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        utilities: ["qit/woo-setup:1.0.0"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--utility");
      expect(args).toContain("qit/woo-setup:1.0.0");
    });

    it("should add volumes array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        volumes: ["/host/path:/container/path"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--volume");
      expect(args).toContain("/host/path:/container/path");
    });

    it("should add php_extensions array", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        php_extensions: ["gd", "imagick"],
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args.filter((a: string) => a === "--php_extension").length).toBe(2);
      expect(args).toContain("gd");
      expect(args).toContain("imagick");
    });

    it("should add env_vars as --env flags", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        env_vars: { WP_DEBUG: "true", SCRIPT_DEBUG: "true" },
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args.filter((a: string) => a === "--env").length).toBe(2);
      expect(args).toContain("WP_DEBUG=true");
      expect(args).toContain("SCRIPT_DEBUG=true");
    });

    it("should include object_cache flag", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        object_cache: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--object_cache");
    });

    it("should include tunnel method", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        tunnel: "ngrok",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--tunnel");
      expect(args).toContain("ngrok");
    });

    it("should include config path", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        config: "/path/to/qit.json",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--config");
      expect(args).toContain("/path/to/qit.json");
    });

    it("should include skip flags", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        skip_setup: true,
        skip_activating_plugins: true,
        skip_activating_themes: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--skip-setup");
      expect(args).toContain("--skip_activating_plugins");
      expect(args).toContain("--skip_activating_themes");
    });

    it("should include json flag", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "{}",
        isError: false,
      });

      await environmentTools.start_environment.handler({
        json: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("--json");
    });

    it("should use 10 minute timeout", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment started",
        isError: false,
      });

      await environmentTools.start_environment.handler({});

      const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];
      expect(options?.timeout).toBe(600000);
    });
  });

  describe("stop_environment", () => {
    it("should stop all environments when no ID provided", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "All environments stopped",
        isError: false,
      });

      await environmentTools.stop_environment.handler({});

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toEqual(["env:down"]);
    });

    it("should stop specific environment by ID", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment stopped",
        isError: false,
      });

      await environmentTools.stop_environment.handler({
        env_id: "qitenv123abc",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("env:down");
      expect(args).toContain("qitenv123abc");
    });
  });

  describe("list_environments", () => {
    it("should parse single environment output into compact table", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.envList })
      );

      const result = await environmentTools.list_environments.handler();

      expect(executor.executeQitCommand).toHaveBeenCalledWith(["env:list"]);
      expect(result.isError).toBe(false);
      expect(result.content).toContain("Running environments (1)");
      expect(result.content).toContain("qitenv01ed18d948bfe5cc");
      expect(result.content).toContain("8.2");
      expect(result.content).toContain("8.5.0");
    });

    it("should parse multiple environments", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: sampleOutputs.envListMultiple })
      );

      const result = await environmentTools.list_environments.handler();

      expect(result.isError).toBe(false);
      expect(result.content).toContain("Running environments (2)");
      expect(result.content).toContain("qitenv01ed18d948bfe5cc");
      expect(result.content).toContain("qitenv02abc123def456");
    });

    it("should return 'no running environments' when empty", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: "No environments running" })
      );

      const result = await environmentTools.list_environments.handler();

      expect(result.isError).toBe(false);
      expect(result.content).toBe("No running environments found.");
    });

    it("should filter out PHP deprecation warnings", async () => {
      const outputWithWarnings = `PHP Deprecated: Some warning here
Deprecated: Another warning
${sampleOutputs.envList}`;

      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: true, stdout: outputWithWarnings })
      );

      const result = await environmentTools.list_environments.handler();

      expect(result.isError).toBe(false);
      expect(result.content).not.toContain("Deprecated");
      expect(result.content).toContain("qitenv01ed18d948bfe5cc");
    });

    it("should handle CLI failure", async () => {
      vi.mocked(executor.executeQitCommand).mockResolvedValue(
        mockResult({ success: false, stderr: "Docker not running" })
      );

      const result = await environmentTools.list_environments.handler();

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Docker not running");
    });
  });

  describe("exec_in_environment", () => {
    it("should execute command in most recent environment", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Command output",
        isError: false,
      });

      await environmentTools.exec_in_environment.handler({
        command: "wp plugin list",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("env:exec");
      expect(args).toContain("--");
      expect(args).toContain("wp plugin list");
    });

    it("should execute command in specific environment", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Command output",
        isError: false,
      });

      await environmentTools.exec_in_environment.handler({
        command: "ls -la",
        env_id: "qitenv123",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("env:exec");
      expect(args).toContain("--env");
      expect(args).toContain("qitenv123");
      expect(args).toContain("--");
      expect(args).toContain("ls -la");
    });

    it("should use 5 minute timeout", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Command output",
        isError: false,
      });

      await environmentTools.exec_in_environment.handler({
        command: "wp core update",
      });

      const options = vi.mocked(executor.executeAndFormat).mock.calls[0][1];
      expect(options?.timeout).toBe(300000);
    });
  });

  describe("reset_environment", () => {
    it("should reset most recent environment when no ID provided", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment reset",
        isError: false,
      });

      await environmentTools.reset_environment.handler({});

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toEqual(["env:reset"]);
    });

    it("should reset specific environment by ID", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Environment reset",
        isError: false,
      });

      await environmentTools.reset_environment.handler({
        env_id: "qitenv456",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("env:reset");
      expect(args).toContain("qitenv456");
    });
  });
});
