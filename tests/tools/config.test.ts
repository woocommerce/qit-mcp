import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configTools } from "../../src/tools/config.js";
import * as executor from "../../src/cli/executor.js";

vi.mock("../../src/cli/executor.js", async () => {
  const actual = await vi.importActual("../../src/cli/executor.js");
  return {
    ...actual,
    executeAndFormat: vi.fn(),
    buildArgs: actual.buildArgs,
  };
});

describe("configTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("manage_config", () => {
    describe("backend operations", () => {
      it("should add backend with name and URL", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Backend added",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "add_backend",
          name: "staging",
          url: "https://staging.qit.woo.com",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("backend:add");
        expect(args).toContain("staging");
        expect(args).toContain("--url");
        expect(args).toContain("https://staging.qit.woo.com");
      });

      it("should remove backend by name", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Backend removed",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "remove_backend",
          name: "staging",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("backend:remove");
        expect(args).toContain("staging");
      });

      it("should switch to backend", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Switched to staging",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "switch_backend",
          name: "staging",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("backend:switch");
        expect(args).toContain("staging");
      });

      it("should show current backend", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Current backend: production",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "current_backend",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("backend:current");
      });
    });

    describe("partner operations", () => {
      it("should add partner", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Partner added",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "add_partner",
          name: "my-company",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("partner:add");
        expect(args).toContain("my-company");
      });

      it("should remove partner", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Partner removed",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "remove_partner",
          name: "old-partner",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("partner:remove");
        expect(args).toContain("old-partner");
      });
    });

    describe("tunnel operations", () => {
      it("should setup tunnel", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Tunnel setup complete",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "setup_tunnel",
          tunnel_method: "cloudflare",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("tunnel:setup");
        expect(args).toContain("cloudflare");
      });

      it("should set default tunnel", async () => {
        vi.mocked(executor.executeAndFormat).mockResolvedValue({
          content: "Default tunnel set",
          isError: false,
        });

        await configTools.manage_config.handler({
          action: "set_default_tunnel",
          tunnel_method: "ngrok",
        });

        const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
        expect(args).toContain("tunnel:set-default");
        expect(args).toContain("ngrok");
      });
    });

    it("should return error for unknown action", async () => {
      const result = await configTools.manage_config.handler({
        action: "unknown_action" as "add_backend",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("Unknown action");
    });
  });
});
