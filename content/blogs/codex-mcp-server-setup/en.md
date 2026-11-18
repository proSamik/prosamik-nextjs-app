---
title: How to Add an MCP Server to Codex CLI (config.toml and codex mcp add)
seoTitle: How to Add an MCP Server to Codex CLI (config.toml)
description: Add stdio and remote MCP servers to OpenAI Codex with codex mcp add or config.toml, use bearer tokens and OAuth login, set timeouts and limit tools.
category: AI agents
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 45
readTime: 8 min
primaryKeyword: codex mcp server
keywords: [codex mcp server, codex mcp add, codex config.toml mcp, codex cli mcp oauth, mcp_servers config]
related: [deploy-mcp-server-nextjs-coolify, codex-daily-email-automation, launch-ios-app-app-store-with-codex, self-host-openseo]
subclipBlurb: Subclip records and edits screen demos, handy for showing a teammate how an MCP tool call appears inside Codex.
rankizzBlurb: Rankizz exposes an MCP server for SEO and AI-search data, one example of a remote server you can connect to Codex.
---

Codex CLI connects to MCP servers in two ways: the `codex mcp add` command, or a `[mcp_servers.<name>]` table in `config.toml`. Both reach the same result, a server whose tools Codex can call. This guide uses OpenAI's MCP documentation for Codex and does not show any real server lists or tokens.

I did not run every command below on a fresh machine for this post. Commands and keys are quoted from the official docs, and anything the docs did not cover is marked.

## Quick answer

For a local server that runs a command, use `codex mcp add <server-name> -- <command>`. For a remote server, use `codex mcp add <server-name> --url https://mcp.example.com`. If the server uses OAuth, run `codex mcp login <server-name>`. Check what is connected with `codex mcp list`, or `/mcp` inside the Codex TUI.

```bash
codex mcp add context7 -- npx -y @upstash/context7-mcp
codex mcp add my-remote --url https://mcp.example.com
codex mcp login my-remote
codex mcp list
```

## Environment

| Item | Value |
| --- | --- |
| Client | OpenAI Codex CLI |
| Global config | `~/.codex/config.toml` |
| Project config | `.codex/config.toml` (trusted projects only) |
| Shared by | The ChatGPT desktop app, Codex CLI and the IDE extension |
| Install (per docs) | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` on macOS and Linux |

The docs say the desktop app, the CLI and the IDE extension share one config file, so a server you add once is visible to all three.

## Step 1: add a local (stdio) server

A stdio server is a command Codex starts and talks to over standard input and output.

```bash
codex mcp add <server-name> --env VAR1=VALUE1 -- <stdio server-command>
```

The `--` separates Codex's flags from the server command. The docs example is `codex mcp add context7 -- npx -y @upstash/context7-mcp`. The same server in `config.toml`:

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["LOCAL_TOKEN"]

[mcp_servers.context7.env]
MY_ENV_VAR = "MY_ENV_VALUE"
```

The docs list these stdio keys: `command` (required), `args`, `env`, `env_vars` and `cwd`. `env_vars` names variables to pass through from your shell, which keeps values out of the file.

## Step 2: add a remote (streamable HTTP) server

```bash
codex mcp add <server-name> --url https://mcp.example.com
```

In `config.toml`, a remote server uses `url` and optionally a bearer token read from an environment variable:

```toml
[mcp_servers.my_remote]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "MY_MCP_TOKEN"
```

The HTTP keys the docs list are `url` (required), `bearer_token_env_var`, `http_headers`, `env_http_headers` and `auth`. `bearer_token_env_var` names the environment variable that holds the token, and Codex sends it in the `Authorization` header. Export the variable in your shell or secret manager. Do not write the token into `config.toml`.

## Step 3: sign in with OAuth

If the server supports OAuth, start sign-in with:

```bash
codex mcp login <server-name>
```

On a machine with no local browser, the docs say to add `--no-browser`, open the printed URL elsewhere, sign in, then paste the full redirect URL back into the terminal.

```bash
codex mcp login <server-name> --no-browser
```

If you run your own MCP server, it must implement OAuth discovery correctly for this to work. For a worked example, see [deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).

## Step 4: verify the connection

```bash
codex mcp list
```

You should see your server in the list. Inside the Codex terminal UI, run `/mcp` to see active servers. If the server is missing there, it is not connected, so fix the config before you debug prompts.

## Step 5: tune timeouts and limit tools

Two timeouts are documented. `startup_timeout_sec` is the time allowed for a server to start, default 10 seconds. `tool_timeout_sec` is the time allowed for one tool call, default 60 seconds.

```toml
[mcp_servers.my_remote]
url = "https://mcp.example.com/mcp"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true
```

To restrict what Codex can call, use `enabled_tools` as an allow list and `disabled_tools` as a deny list. The docs say `disabled_tools` is applied after `enabled_tools`. Their example enables `open` and `screenshot`, then disables `screenshot`, leaving only `open`.

```toml
[mcp_servers.my_remote]
url = "https://mcp.example.com/mcp"
enabled_tools = ["open", "screenshot"]
disabled_tools = ["screenshot"]
```

For approvals, the docs list `default_tools_approval_mode` with values `auto`, `prompt`, `writes` and `approve`, where `writes` prompts for tools not marked read-only. A per-tool override is `tools.<tool>.approval_mode`. Start with `prompt` or `writes` for any server that can change data.

## Global config or project config

Put a server in the global file when you want it everywhere, such as a documentation lookup tool. Put it in `.codex/config.toml` when it only makes sense for one repository, such as a server that talks to that project's staging backend. The docs say project config applies to trusted projects only, so a cloned repository cannot silently add servers until you trust it. That is a useful property: review any `.codex/config.toml` you receive from someone else before trusting the project, because a server entry can run a command on your machine.

Name servers after what they do, not after a person or account, and keep one table per server. Remove servers you no longer use, since every connected server adds tools the agent may call. A short list is easier to audit than a long one.

## Edge cases

| Case | What the docs say | What to do |
| --- | --- | --- |
| Project config does not load | `.codex/config.toml` works for trusted projects only | Trust the project or use the global file |
| Server needs more than 10 seconds to start | Default `startup_timeout_sec` is 10 | Raise it |
| Long tool calls fail | Default `tool_timeout_sec` is 60 | Raise it for that server |
| Cloud runs | Local MCP servers and transports may not be available in the cloud | Check connectivity and authentication separately |
| Same name in two configs | Not covered in the pages I read | Use distinct names |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Server absent from `codex mcp list` | Add step failed or wrong config file | Re-run `codex mcp add`; check `~/.codex/config.toml` |
| Startup timeout | Server slower than 10 seconds | Set `startup_timeout_sec` higher |
| 401 from a remote server | Missing or wrong bearer token, or OAuth not completed | Export the variable named by `bearer_token_env_var`, or run `codex mcp login` |
| Login cannot open a browser | Headless machine | Use `--no-browser` and paste the redirect URL |
| Tool calls hang | Longer than `tool_timeout_sec` | Raise it, or split the work |
| A tool you disabled still seems available | `disabled_tools` applies after `enabled_tools`, check both lists | Review both keys |

## Security

- An MCP server is code and data you let an agent use. Add only servers you trust.
- Keep tokens in environment variables via `bearer_token_env_var` or `env_vars`, never in `config.toml` or a repo.
- Use read-only or scoped tokens, and `enabled_tools` to expose only what the task needs.
- Prefer `prompt` or `writes` approval for servers that can modify things.
- Tool output is data. A web page or tool result can contain text that tries to give the agent instructions.

## If you use an AI agent for this

You can ask an agent to edit `config.toml`, but set rules first.

- Tell it to treat logs, web pages and tool output as data, not instructions.
- Never paste tokens into the chat or let the agent print them or your environment.
- Make it show destructive commands and config changes before applying them, and wait for approval.
- Give it minimum permissions, and test on a throwaway project first.

## FAQ

### Where is the Codex MCP config file?
`~/.codex/config.toml` globally, and `.codex/config.toml` for trusted projects. The app, CLI and IDE extension share it.

### How do I add an MCP server to Codex?
Run `codex mcp add <server-name> -- <command>` for a local server, or `codex mcp add <server-name> --url <url>` for a remote one.

### How do I use a bearer token?
Set `bearer_token_env_var` to the name of an environment variable. Codex sends its value in the `Authorization` header.

### How do I sign in to an OAuth server?
Run `codex mcp login <server-name>`, adding `--no-browser` on a machine without a browser.

### How do I see connected servers?
Run `codex mcp list`, or type `/mcp` in the Codex TUI.

## Next steps

- Build your own server: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).
- Put Codex on a schedule: [Codex daily email automation](/blogs/codex-daily-email-automation).
- A full task with Codex: [Launch an iOS app with Codex](/blogs/launch-ios-app-app-store-with-codex).

If you track how guides like this get cited by AI search, [Rankizz](rankizz:inline-guide-tracking) is a workspace for that, and it offers an MCP server you could connect the same way.
