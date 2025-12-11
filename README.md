# QIT MCP Server

An MCP (Model Context Protocol) server that wraps the [QIT CLI](https://github.com/woocommerce/qit-cli), enabling natural language interaction and agent-based workflows for WordPress/WooCommerce plugin testing.

## Features

- **Natural Language Testing**: Run QIT tests using conversational commands
- **Agent Integration**: Enable AI agents to run tests as part of automated workflows
- **Full CLI Coverage**: Access all essential QIT CLI functionality through MCP tools
- **Smart CLI Detection**: Automatically finds QIT CLI in PATH, local vendor, or custom location

## Prerequisites

- Node.js 18+
- [QIT CLI](https://github.com/woocommerce/qit-cli) installed and accessible

## Installation

```bash
git clone https://github.com/woocommerce/qit-mcp
cd qit-mcp
npm install
npm run build
```

## Configuration

### Claude Code

Add to your Claude Code MCP settings (`~/.claude.json`):

```json
{
  "mcpServers": {
    "qit": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/qit-mcp/dist/index.js"],
      "env": {
        "QIT_CLI_PATH": "/path/to/qit-cli/qit"
      }
    }
  }
}
```

## QIT CLI Detection

The MCP server automatically detects QIT CLI in this order:

1. `QIT_CLI_PATH` environment variable
2. `qit` in system PATH
3. `./vendor/bin/qit` (local Composer installation)

## Available Tools

### Authentication (2 tools)

| Tool | Description |
|------|-------------|
| `authenticate` | Connect to WooCommerce.com Partner Developer account |
| `get_auth_status` | Check current authentication status |

### Test Execution (2 tools)

| Tool | Description |
|------|-------------|
| `run_test` | Run any test type (security, e2e, phpstan, activation, etc.) |
| `run_test_group` | Run a predefined test group from qit.json |

### Test Results (4 tools)

| Tool | Description |
|------|-------------|
| `get_test_result` | Get test result(s) by ID |
| `list_tests` | List test runs with filters |
| `get_test_report` | Get detailed test report |
| `open_test_result` | Open result in browser |

### Groups (1 tool)

| Tool | Description |
|------|-------------|
| `get_group_status` | Fetch status of a registered test group |

### Environment (5 tools)

| Tool | Description |
|------|-------------|
| `start_environment` | Start a local test environment |
| `stop_environment` | Stop a running environment |
| `list_environments` | List running environments |
| `exec_in_environment` | Execute command in environment container |
| `reset_environment` | Reset environment database |

### Packages (2 tools)

| Tool | Description |
|------|-------------|
| `manage_package` | Manage test packages (publish, download, scaffold, delete, show) |
| `list_packages` | List available test packages with filtering |

### Configuration (1 tool)

| Tool | Description |
|------|-------------|
| `manage_config` | Manage backends, partners, and tunneling configuration |

### Utilities (5 tools)

| Tool | Description |
|------|-------------|
| `list_extensions` | List extensions you can test |
| `validate_zip` | Validate a plugin ZIP file |
| `manage_cache` | Manipulate QIT cache |
| `get_qit_dir` | Get QIT config directory path |
| `sync_cache` | Re-sync with QIT Manager |

## Usage Examples

### Natural Language (via Claude Code)

```
"Run security tests on my-plugin"
→ run_test(type="security", plugin="my-plugin")

"Start a test environment with PHP 8.2"
→ start_environment(php_version="8.2")

"Show me my recent failed tests"
→ list_tests(status="failed")

"What plugins can I test?"
→ list_extensions()
```

### Programmatic Usage

The MCP server communicates via stdio using the Model Context Protocol. See the [MCP documentation](https://modelcontextprotocol.io/) for integration details.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT

## Links

- [QIT CLI](https://github.com/woocommerce/qit-cli)
- [QIT Documentation](https://qit.woo.com/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
