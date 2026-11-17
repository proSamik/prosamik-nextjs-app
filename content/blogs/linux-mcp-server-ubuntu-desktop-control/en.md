---
title: How to Set Up a Linux MCP Server to Control an Ubuntu Desktop
seoTitle: How to Set Up a Linux MCP Server for an Ubuntu Desktop
description: Install a Linux desktop-control MCP server on Ubuntu, compare the real options, pick X11 over Wayland, and reach it from a Mac agent over an SSH tunnel.
category: MCP servers
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 5
readTime: 11 min
primaryKeyword: linux mcp server
keywords: [linux mcp, ubuntu mcp server, mcp server for linux desktop, computer use linux, linux computer use mcp, xdotool mcp]
related: [utm-mcp-server-linux-test-automation, ssh-into-linux-vm-from-mac, windows-mcp-server-for-mac-utm-vm, macos-mcp-server-computer-use]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, so you can cut a clear clip of an agent driving your Linux desktop for a bug report or demo.
rankizzBlurb: Rankizz tracks keyword rankings and AI-search citations through a web app, REST API and MCP, which is how you check whether a guide like this gets found.
---

By the end of this guide you will have an MCP server running on an Ubuntu desktop that lets an AI agent take screenshots, read the accessibility tree, click, type and focus windows. You will also know how to reach it safely from a Mac. It is for anyone who already drives Windows or macOS with an agent and wants the Linux version.

One note on honesty. This is a researched setup guide. The commands come from upstream READMEs and docs, checked on 2026-11-17. I have not run this exact Linux setup yet. I did run the Windows version (a Windows 11 ARM64 guest in UTM, `windows-mcp` over HTTP on port 8000), and the Linux shape is the same: agent on the Mac, MCP server inside the machine you want to control. Where I could not verify something upstream, I say so.

## Quick answer

The shortest documented path is `computer-use-linux` on an Ubuntu X11 session, listening on localhost and reached through an SSH tunnel.

1. Log in to Ubuntu 24.04 with "Ubuntu on Xorg" (or use XFCE).
2. `sudo apt install -y xdotool wmctrl x11-utils nodejs npm`
3. `sudo npm install -g @agent-sh/computer-use-linux`
4. Create a token file and run `computer-use-linux mcp --listen 127.0.0.1:5200` inside the desktop session.
5. From the Mac: `ssh -N -L 5200:127.0.0.1:5200 user@UBUNTU_IP`
6. Add `http://127.0.0.1:5200/mcp` to your MCP client with a bearer token.

## What a Linux desktop-control MCP server is

A desktop-control MCP server gives an agent the same inputs a person has: screen, mouse, keyboard and windows. It is different from a shell or SSH MCP server, which runs commands but cannot see or click a GUI app. For testing a Linux GUI application, you need the first kind. For installing packages and reading logs, the second kind is enough, and you can use both.

Most Linux servers are built on three layers. AT-SPI gives a structured tree of buttons and fields. X11 tools such as `xdotool` and `wmctrl` inject input and manage windows. A screenshot path captures pixels.

## The real options

I checked each of these against its upstream page. The transport column matters, because your agent is on a different machine.

| Server | Linux support | Transport | Notes |
|---|---|---|---|
| [computer-use-linux](https://github.com/agent-sh/computer-use-linux) (agent-sh) | GNOME, KDE, Hyprland, niri, COSMIC, i3, Sway, generic X11 | stdio by default; HTTP with `--listen` | Rust, MIT, on npm and crates.io. X11 works but is not the primary target |
| [Hybrid Computer Use](https://github.com/microsoft/Hybrid-Computer-Use) (Microsoft) | Linux X11 via AT-SPI2, X11, XTest; also macOS and Windows | stdio only (documented) | MIT. You build the Linux binary from Go source. Its README warns to use a disposable VM |
| gui-user (Yaskawa-Global) | X11 via AT-SPI2 and xdotool | not checked | Listed on Glama; unverified by me |
| desktop-mcp | The PyPI package of that name appears to be Windows-only | n/a | I could not confirm a Linux build, so I left it out |

If you saw `desktop-mcp` or `linux-computer-use` in other roundups, treat them as unverified. I did not find upstream pages I could confirm for a Linux desktop.

## Choose X11 first, not Wayland

X11 is the easy first path because `xdotool`, `wmctrl` and XTest can click and type without asking permission. On Wayland, an app is not allowed to inject input into other windows by default. `computer-use-linux` handles this through `/dev/uinput`, the RemoteDesktop portal or a GNOME Shell extension, which means more setup and a logout.

There is a catch. Ubuntu 25.10 and later removed the GNOME Xorg session, so there is no "Ubuntu on Xorg" entry at login. Ubuntu 22.04 and 24.04 are not affected. If you are on a newer release, install Xubuntu or add XFCE (`sudo apt install xfce4`) and pick that session.

## Step 1: Get an X11 desktop session

You need a logged-in graphical session, not just a shell. On Ubuntu 24.04, log out, click your name, click the gear icon and choose "Ubuntu on Xorg". Confirm it:

```bash
echo $XDG_SESSION_TYPE
echo $DISPLAY
```

You should see `x11` and something like `:0`. If you see `wayland`, you are on the wrong session.

On a headless box there is no session yet. See [the virtual machine MCP server guide](/blogs/virtual-machine-mcp-server-linux-test-automation) for XFCE with xrdp or a virtual display.

## Step 2: Install the server and X11 helpers

Install the helpers the upstream README lists for X11 (`xdotool` for input, `wmctrl` and `xprop` for windows). `xprop` ships in `x11-utils`.

```bash
sudo apt update
sudo apt install -y xdotool wmctrl x11-utils nodejs npm
sudo npm install -g @agent-sh/computer-use-linux
computer-use-linux --help
```

You should see a subcommand list including `mcp`, `doctor` and `setup`. Prebuilt binaries need glibc 2.28 or newer, which Ubuntu 22.04 and 24.04 have. Whether a prebuilt ARM64 binary exists for every release is unverified. If the npm install cannot find one, `cargo install computer-use-linux` builds from source.

An earlier chat answer also suggested `scrot`, `imagemagick` and `zenity`. The README I read does not list them as required, so I left them out of the base install.

## Step 3: Run the readiness check

Run this inside the desktop session, as the same user that is logged in:

```bash
computer-use-linux setup
computer-use-linux doctor | jq .readiness
```

Upstream says `can_register_mcp_tools`, `can_build_accessibility_tree`, `can_send_development_input` and `can_query_windows` should be `true` and `blockers` should be empty. The `doctor` command does not take a screenshot, so a screenshot route can show as `unverified` until the agent first captures one.

## Step 4: Start the server so a Mac can reach it

`computer-use-linux` is stdio by default. For a remote agent, start its HTTP mode on loopback with a token:

```bash
openssl rand -hex 32 > ~/.cul-token && chmod 600 ~/.cul-token
COMPUTER_USE_LINUX_MCP_TOKEN_FILE=$HOME/.cul-token computer-use-linux mcp --listen 127.0.0.1:5200
```

Per the README, the endpoint is `/mcp`, clients send `Authorization: Bearer <token>`, and a missing or wrong token returns 401. A non-loopback bind such as `0.0.0.0` also needs `--allowed-host NAME` for every client hostname. HTTP mode refuses to start if `COMPUTER_USE_LINUX_ENABLE_SHELL=1` is set. The port is plain HTTP, so keep it on loopback and tunnel it.

Start it from a terminal in the desktop session. The server needs the session's D-Bus and AT-SPI, which a bare SSH login does not have.

## Step 5: Reach it from the Mac

Three routes exist. I list them in the order I would try them.

1. **SSH tunnel to the HTTP server (documented parts only).** Keep the bind on `127.0.0.1` and forward the port. See [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac).
2. **Direct HTTP on a private network.** Bind to the VM address with `--allowed-host` and a token. This mirrors my Windows setup, where the Mac reached `http://<vm-ip>:8000/mcp`.
3. **stdio over SSH or a bridge.** For stdio-only servers such as Hybrid Computer Use, a launch like `ssh user@host computer-use-linux mcp` or a bridge such as `supergateway` or `mcp-proxy` is possible. Upstream `supergateway` documents `npx -y supergateway --stdio "<cmd>" --outputTransport streamableHttp --port 8000` with the endpoint at `/mcp`. `mcp-proxy` documents `mcp-proxy --port=8080 -- <cmd>` and binds to `127.0.0.1` by default. I could not verify that either one works with a desktop-control server. The SSH stdio launch is unverified too, and it must also carry `DISPLAY`, `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR`.

For route 1, open the tunnel on the Mac:

```bash
ssh -N -L 5200:127.0.0.1:5200 user@UBUNTU_IP
```

Then check it. A raw request without a token should be rejected:

```bash
curl -i http://127.0.0.1:5200/mcp
```

Per the README you should see `401`. On Windows, the same check returned `400 Bad Request: Missing session ID`. Either way, a fast HTTP error means the Mac reached the server.

## Step 6: Connect your Mac agent

With Claude Code, add the server over HTTP with the token header:

```bash
claude mcp add --transport http linux-vm http://127.0.0.1:5200/mcp --header "Authorization: Bearer $(ssh user@UBUNTU_IP cat .cul-token)"
```

Other clients take the same two values, a URL and a bearer header. I named the entry `linux-vm`, matching my `windows-vm` entry.

## Test it with an agent

Paste this into the agent. Run it only on a snapshot of a throwaway machine.

```text
Using the linux-vm MCP server:
1. Call get_app_state and take a screenshot.
2. List open windows.
3. Open the text editor, type "Linux MCP test", and save it as mcp-test.txt on the Desktop.
4. Check the window title shows the file name.
5. Take a final screenshot and report pass or fail with the evidence.
```

The server also exposes `list_windows`, `click`, `type_text`, `press_key` and `perform_action`. Note that `get_app_state` should come first in every turn, as the server's own instructions say.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401` from curl | No bearer token | Expected. Send `Authorization: Bearer <token>` from the client |
| `403` from the server | Host not allowed, or an `Origin` header present | Add `--allowed-host NAME`; browser clients are unsupported |
| `404 Session not found` | Idle session expired after an hour | Reinitialize the MCP session |
| `doctor` shows blockers | No AT-SPI or D-Bus, or wrong session | Run `computer-use-linux setup`, start from the desktop session |
| Server refuses to start in HTTP mode | `COMPUTER_USE_LINUX_ENABLE_SHELL=1` is set | Unset it, or use stdio |
| `can_query_windows` false on GNOME Wayland | Shell extension missing | Run `computer-use-linux setup-window-targeting`, log out and in, or switch to Xorg |
| Element click is refused | Stale `snapshot_id` | Call `get_app_state` again and use the new ID |

## Security

A desktop-control server can click, type, read files visible on screen and, if enabled, run shell commands. Treat the machine as disposable.

- Use a throwaway Ubuntu user and a snapshot or clone you can roll back to.
- Keep no SSH keys, browser sessions or API tokens on it.
- Leave `run_shell` off. It runs with the full permissions of the server user.
- Bind to `127.0.0.1`, use the bearer token and tunnel in. Never expose the port to the internet or a router.
- Microsoft's Hybrid Computer Use README says untrusted tasks belong on a dedicated desktop or disposable VM.

To record a run for a bug report, [Subclip](subclip:inline-agent-run-clip) is an AI video editor that can connect MCP servers, which is handy for turning a screen recording of the agent into a short clip.

## FAQ

### Is there an MCP server for Linux?
Yes. `computer-use-linux` and Microsoft's Hybrid Computer Use both control a Linux desktop. Shell and SSH MCP servers also exist, but they cannot see or click a GUI.

### Does a Linux MCP server work on Wayland?
`computer-use-linux` supports several Wayland desktops, but input goes through `/dev/uinput`, a portal or a GNOME Shell extension. X11 needs less setup, so start there.

### Can a Mac agent use an MCP server that only supports stdio?
Yes, in principle, by launching it over SSH or wrapping it with a stdio-to-HTTP bridge. I did not verify that path for a desktop-control server. `computer-use-linux` avoids the problem with its own `--listen` HTTP mode.

### Which should I pick, computer-use-linux or Hybrid Computer Use?
Pick `computer-use-linux` if you want a package install and a remote HTTP mode. Pick Hybrid Computer Use if you want one MCP server across Linux, macOS and Windows and are fine building from source for local stdio.

### Do I need a VM?
No. A dedicated Ubuntu machine works, as long as it has a graphical session. A VM just makes snapshots easier.

## Next steps

If your Linux machine is a UTM guest, follow [the UTM guide](/blogs/utm-mcp-server-linux-test-automation). For a hypervisor-agnostic test setup, read [the virtual machine guide](/blogs/virtual-machine-mcp-server-linux-test-automation). The Windows equivalent is [Windows MCP server for Mac](/blogs/windows-mcp-server-for-mac-utm-vm), and the macOS one is [macOS MCP server computer use](/blogs/macos-mcp-server-computer-use).

If you publish a guide like this, [Rankizz](rankizz:inline-guide-tracking) can track whether it ranks and gets cited by AI search.
