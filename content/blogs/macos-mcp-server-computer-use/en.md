---
title: How to Set Up a macOS MCP Server for AI Computer Use
seoTitle: How to Set Up a macOS MCP Server for AI Computer Use
description: Install a macOS MCP server, grant Accessibility and Screen Recording, wire it into Claude Code or Cursor, and learn if you can bundle one in an Electron app.
category: MCP servers
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 6
readTime: 11 min
primaryKeyword: macos mcp
keywords: [mac mcp server, macos computer use mcp, mcp server for mac, macos accessibility api mcp, peekaboo mcp, electron mcp server]
related: [utm-mcp-server-macos-test-automation, virtual-machine-mcp-server-macos-test-automation, windows-mcp-server-for-mac-utm-vm, linux-mcp-server-ubuntu-desktop-control]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers and has a macOS app, so you can cut a screen recording of an agent's run into a clean demo or bug clip.
rankizzBlurb: Rankizz tracks keywords and shows whether a guide like this ranks and gets cited by AI search, through a web app, REST API and MCP.
---

By the end of this guide you will have a macOS MCP server running on your Mac, with the right privacy permissions, connected to Claude Code or Cursor, so an agent can read the screen, click, type and inspect app UI. You will also know where these servers stop working, and whether you can bundle one inside an Electron app.

A note on sourcing. I have not run this exact setup yet. The commands below come from each project's upstream README, checked on 2026-11-17. Where upstream docs were silent I say so.

## Quick answer

A macOS MCP server is a local process that gives an AI agent desktop tools (screenshot, click, type, read the accessibility tree) over the Model Context Protocol. The shortest path:

1. Install `uv` and Python 3.11 or newer.
2. Register the server: `claude mcp add macos-mcp -- uvx macos-mcp serve`.
3. Open System Settings > Privacy & Security and enable **Accessibility** and **Screen Recording** for the app that launches the server (your terminal, Cursor, or VS Code).
4. Restart that app, then ask the agent to take a screenshot and list the open windows.
5. Use a throwaway macOS user or a VM for anything beyond a first test.

Step 2 is built from the upstream stdio command (`uvx macos-mcp serve`). The README gives a Claude Desktop JSON entry, not a Claude Code one.

## What a macOS MCP server does

It exposes a small set of desktop tools to the agent. Most do the same three jobs: look (screenshots and the accessibility tree), act (mouse, keyboard, app and window control) and script (shell or AppleScript).

Two APIs sit underneath. The **Accessibility API** lets a process read UI elements and send input, and macOS gates it behind the Accessibility permission. **Screen capture** is gated behind Screen Recording. Both are enforced by TCC, Apple's Transparency, Consent and Control system, which is why macOS asks for approval the first time a tool runs.

Accessibility-based servers are more reliable than screenshot-only ones. An agent can click a button named "Save" instead of guessing pixel coordinates.

## Choose a macOS MCP server

There is no single standard. These are the real options I could confirm upstream, each different in scope.

| Server | Approach | Install (from upstream) | Notes |
|---|---|---|---|
| Microsoft Hybrid Computer Use (`microsoft/Hybrid-Computer-Use`) | Cross-platform; AXUIElement and ScreenCaptureKit on macOS | Server name `computer-use`, started with `computer-use mcp` | MIT. Exposes two tools, `AX` and `GUI`. Setup guide is `docs/MCP.md`; I could not confirm macOS permission steps from it |
| CursorTouch `MacOS-MCP` | Accessibility API | `uvx macos-mcp serve` | Python 3.11+ and uv. Tools include Snapshot, Click, Type, Scroll, Shortcut, App, Shell. Supports stdio, SSE and streamable HTTP |
| `macos-computer-use-mcp` (PyPI) | Screenshots, input, accessibility tree, OCR, app-specific tools | `pip install macos-computer-use-mcp` | Python 3.12+. 146 tools in v0.2.0. Missing permissions do not stop startup; the tools return errors |
| Peekaboo (`steipete/Peekaboo`) | Screen capture plus Accessibility; also a CLI and Mac app | `brew install openclaw/tap/peekaboo` or the `@steipete/peekaboo` npm package (Node 22+) | MIT. MCP exposes the same toolset as the CLI. Setup is in `docs/MCP.md` |
| AppleScript / osascript servers | Scripting through app Automation | varies | Good for scriptable apps like Notes or Finder. Weak for apps without a scripting dictionary |

Apple's own contribution is the plumbing, not a server: the Accessibility API, ScreenCaptureKit, AppleScript and the permission system. I did not find an official Apple MCP server to recommend.

For app testing, start with an accessibility-first server (`macos-mcp` or Hybrid Computer Use). Use a screenshot-heavy one only when the app exposes poor accessibility data.

## Install the server

Install uv first if you do not have it, then run the server once to confirm it starts.

```bash
brew install uv
uvx macos-mcp serve
```

You should see the process start and wait on stdin. Since v0.3.10 the upstream README says starting the server prompts macOS for Accessibility consent. Press Ctrl+C to stop it.

To run it as a background service that starts at login, upstream documents:

```bash
macos-mcp install
macos-mcp uninstall
```

To serve over HTTP on localhost instead of stdio:

```bash
uvx macos-mcp serve --transport streamable-http --host localhost --port 8000
```

Keep `--host localhost`. Do not bind it to your LAN.

## Grant Accessibility and Screen Recording

Open System Settings > Privacy & Security, then enable two entries for the app that launches the server.

- **Accessibility**: mouse, keyboard and UI inspection.
- **Screen Recording**: screenshots.

macOS attaches the permission to the app that started the process, not to the Python script. If Claude Code runs inside Terminal, grant Terminal. If it runs inside Cursor, grant Cursor. The upstream README also lists Python and uv for Accessibility. Quit and reopen the app after granting; macOS often needs a restart of the process before the new permission applies.

If you are unsure what happened, the reset command is `tccutil reset ScreenCapture` (and `tccutil reset Accessibility`). It only clears prompts so macOS asks again. It cannot grant a permission.

## Connect it to Claude Code or Cursor

Claude Code takes a one-line command. Use `--scope user` to make it available in every project.

```bash
claude mcp add --scope user macos-mcp -- uvx macos-mcp serve
claude mcp list
```

Cursor and Claude Desktop use JSON. The upstream README gives this entry for Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`); Cursor reads the same `mcpServers` shape from its MCP settings file.

```json
{
  "mcpServers": {
    "macos-mcp": {
      "command": "uvx",
      "args": ["macos-mcp", "serve"]
    }
  }
}
```

Restart the client after editing. You should see `macos-mcp` listed as connected.

If you also drive a Windows VM, name each entry for its target, such as `macos-local` and `windows-vm`, so the agent picks the right one. The Windows side is covered in [how to run Windows-MCP in a UTM VM](/blogs/windows-mcp-server-for-mac-utm-vm), and the Linux side in [Linux desktop control with MCP](/blogs/linux-mcp-server-ubuntu-desktop-control).

## Test it with an agent

Start with read-only requests, then one harmless action. Paste this:

```text
Using the macos-mcp server:
1. Take a screenshot and describe what is on screen.
2. List the open apps and windows.
3. Open TextEdit, type "hello from the agent", and read the text back from the UI.
4. Do not save the file and do not touch any other app.
Report what you did and any tool that failed.
```

You should get a screenshot description, a window list, and TextEdit showing your text. If the screenshot comes back empty or the tool errors, go to Troubleshooting.

If you want to review or share the run, [Subclip](subclip:inline-test-recording) is an AI video editor that can connect MCP servers and has a macOS app, which suits trimming a screen recording into a short clip.

## Know what agents can and cannot do

Agents can drive most normal app UI: menus, buttons, text fields, window management, clipboard and scripted apps. They struggle in specific places.

- **Secure input fields.** Password boxes enable secure event input, and macOS blocks synthetic keystrokes there. The `macos-mcp` README is blunt: "Some specialized input fields may not properly receive keystrokes."
- **System authentication dialogs.** The same README says it "Cannot interact with system authentication dialogs." These run in a protected context. A human has to click them.
- **Poorly accessible apps.** Apps with custom-drawn UI expose little to the Accessibility API, so the agent falls back to screenshots and coordinates.
- **Other permissions.** `macos-computer-use-mcp` also lists Automation (AppleScript control of Calendar, Notes, Mail and similar) and Full Disk Access for file tools. Grant only what you need.

## Bundle a macOS MCP server inside an Electron app

Yes, you can ship an MCP server inside an Electron app so it installs on a user's desktop, but build a narrow one for your own app instead of shipping a control-everything server. Here is the model.

1. Your Electron main process spawns a bundled MCP server as a child process. The server speaks stdio, or HTTP on `127.0.0.1` only.
2. The user's MCP client (Claude, Cursor, VS Code) connects to it. For stdio, the client launches the binary; for HTTP, the user adds the local URL.
3. The tools you expose are app-specific, such as `myapp.get_ui_tree`, `myapp.click_element` and `myapp.get_logs`, not "click anywhere on the screen".

Permissions are the tricky part. TCC ties a grant to the app's code signature, bundle identifier and path. If the app is unsigned or its identity changes, macOS treats it as a new app and asks again. Sources I found say child processes usually inherit the responsible process, but the chain can break, and Electron's default helper bundle ID is generic. Those are forum and issue-tracker reports, so test it yourself.

To make this work in practice:

- Sign with a stable Developer ID identity and **notarize** the app. Keep the bundle ID constant across updates.
- Add a first-run screen that explains why you need Accessibility and Screen Recording before macOS shows its prompt.
- If your tools only inspect your own app's UI, you may not need either permission. Prefer in-app hooks (your own renderer, DevTools protocol or an IPC bridge) over OS-level control.
- Never silently bundle a general computer-use server. That hands every connected agent the user's whole Mac.

## Troubleshooting

| Error or symptom | Cause | Fix |
|---|---|---|
| Screenshot is blank or the tool errors | Screen Recording not granted to the launching app | Enable it in Privacy & Security, quit and reopen the app |
| Clicks and typing do nothing | Accessibility not granted | Enable Accessibility for the terminal or editor, and Python/uv per the README, then restart it |
| `permission_denied` (Hybrid Computer Use) | OS permission missing | Upstream says: "Restore the operating-system permission and restart the provider." |
| Permission check fails behind a parent that already has access | Spurious check in `macos-mcp` | Set `MACOS_MCP_SKIP_PERMISSION_CHECK=1` (downgrades it to a warning) |
| Typing works but nothing appears in a field | Secure or specialized input field | Type it yourself, or use a non-secure field for the test |
| Cannot click an authentication prompt | "Cannot interact with system authentication dialogs" | Approve it by hand |
| Server will not start | Python or uv too old | `macos-mcp` needs Python 3.11+, `macos-computer-use-mcp` needs 3.12+ |
| Permission prompts return after updates | The grant was tied to a changed binary path or signature | Use a stable signed app, or re-grant |

## Security

A macOS MCP server is full desktop control. Whatever the agent can see, it can click, so treat it like handing someone your keyboard.

- Use a separate macOS user, or better a VM, for agent runs. See [UTM for macOS test automation](/blogs/utm-mcp-server-macos-test-automation).
- Close password managers, banking tabs and chat apps before you start.
- Grant the minimum permissions. Skip Full Disk Access and Automation unless a tool needs them.
- Disable arbitrary shell or AppleScript tools when you only need UI actions.
- Bind HTTP transports to `localhost`, and never expose the port.
- Stop the server when you are done, and uninstall the launchd service if you installed one.
- Review what the agent plans to do before approving destructive steps.

## FAQ

### What is a macOS MCP server?
It is a local program that exposes Mac desktop actions (screenshots, clicks, typing, accessibility tree, AppleScript) to an AI agent through the Model Context Protocol. The agent calls those tools instead of you.

### Which permissions does a macOS MCP server need?
Accessibility for input and UI inspection, and Screen Recording for screenshots. Some servers also use Automation for AppleScript and Full Disk Access for file tools. Grant them to the app that launches the server.

### Can an agent type into password fields?
Generally no. Secure input fields block synthetic keystrokes, and system authentication dialogs cannot be driven by these servers. A human has to complete them.

### Can I bundle a macOS MCP server inside an Electron app?
Yes. Spawn it as a child process over stdio or localhost HTTP, sign and notarize the app, and expose only tools for your own app. Permission prompts attach to your signed app identity, so keep that identity stable.

### Is a macOS MCP server safe to run on my main Mac?
It is risky. The agent can act as you in any open app. Use a throwaway user or a VM for testing.

## Next steps

Run the same agent against a disposable guest, which is the safer pattern: [UTM for macOS test automation](/blogs/utm-mcp-server-macos-test-automation), and the CI-minded version in [virtual machine MCP servers for macOS](/blogs/virtual-machine-mcp-server-macos-test-automation).

If you publish a guide like this, [Rankizz](rankizz:inline-guide-tracking) can track whether it ranks for terms like "macos mcp" and gets cited by AI search.
