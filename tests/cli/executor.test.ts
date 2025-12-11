import { describe, it, expect } from "vitest";
import { buildArgs } from "../../src/cli/executor.js";

describe("executor", () => {
  describe("buildArgs", () => {
    it("should build args with just command", () => {
      const args = buildArgs("test:command", [], {});
      expect(args).toEqual(["test:command"]);
    });

    it("should include positional arguments", () => {
      const args = buildArgs("test:command", ["arg1", "arg2"], {});
      expect(args).toEqual(["test:command", "arg1", "arg2"]);
    });

    it("should add boolean flags when true", () => {
      const args = buildArgs("test:command", [], { verbose: true, debug: true });
      expect(args).toContain("--verbose");
      expect(args).toContain("--debug");
    });

    it("should not add boolean flags when false", () => {
      const args = buildArgs("test:command", [], { verbose: false, debug: false });
      expect(args).not.toContain("--verbose");
      expect(args).not.toContain("--debug");
    });

    it("should add string flags with values", () => {
      const args = buildArgs("test:command", [], {
        config: "/path/to/config",
        format: "json",
      });
      expect(args).toContain("--config");
      expect(args).toContain("/path/to/config");
      expect(args).toContain("--format");
      expect(args).toContain("json");
    });

    it("should skip undefined values", () => {
      const args = buildArgs("test:command", [], {
        defined: "value",
        undefined_key: undefined,
      });
      expect(args).toContain("--defined");
      expect(args).toContain("value");
      expect(args).not.toContain("--undefined_key");
    });

    it("should preserve underscores in flag names", () => {
      const args = buildArgs("test:command", [], {
        php_version: "8.2",
        wordpress_version: "6.5",
      });
      expect(args).toContain("--php_version");
      expect(args).toContain("--wordpress_version");
    });

    it("should handle mixed positional and flags", () => {
      const args = buildArgs(
        "run:test",
        ["my-plugin"],
        {
          php_version: "8.2",
          json: true,
        }
      );
      expect(args).toEqual([
        "run:test",
        "my-plugin",
        "--php_version",
        "8.2",
        "--json",
      ]);
    });

    it("should handle empty flags object", () => {
      const args = buildArgs("command", ["arg"], {});
      expect(args).toEqual(["command", "arg"]);
    });

    it("should handle all undefined flags", () => {
      const args = buildArgs("command", [], {
        a: undefined,
        b: undefined,
        c: undefined,
      });
      expect(args).toEqual(["command"]);
    });
  });
});
