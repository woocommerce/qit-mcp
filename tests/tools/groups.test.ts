import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { groupsTools } from "../../src/tools/groups.js";
import * as executor from "../../src/cli/executor.js";

vi.mock("../../src/cli/executor.js", async () => {
  const actual = await vi.importActual("../../src/cli/executor.js");
  return {
    ...actual,
    executeAndFormat: vi.fn(),
    buildArgs: actual.buildArgs,
  };
});

describe("groupsTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get_group_status", () => {
    it("should fetch status for a test group", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Group status: all tests passed",
        isError: false,
      });

      await groupsTools.get_group_status.handler({
        group: "nightly-tests",
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("group:fetch");
      expect(args).toContain("nightly-tests");
    });

    it("should include json flag when requested", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: '{"status": "success"}',
        isError: false,
      });

      await groupsTools.get_group_status.handler({
        group: "ci-tests",
        json: true,
      });

      const args = vi.mocked(executor.executeAndFormat).mock.calls[0][0];
      expect(args).toContain("group:fetch");
      expect(args).toContain("ci-tests");
      expect(args).toContain("--json");
    });

    it("should handle group not found error", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: "Error: Group 'unknown-group' not found",
        isError: true,
      });

      const result = await groupsTools.get_group_status.handler({
        group: "unknown-group",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain("not found");
    });

    it("should return group status with test results", async () => {
      vi.mocked(executor.executeAndFormat).mockResolvedValue({
        content: `Group: release-tests
Status: completed
Tests: 5/5 passed
Last run: 2024-01-15 10:30:00`,
        isError: false,
      });

      const result = await groupsTools.get_group_status.handler({
        group: "release-tests",
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain("release-tests");
      expect(result.content).toContain("5/5 passed");
    });
  });
});
