---
title: How to Set Up a Virtual Machine MCP Server for Linux Test Automation
description: Pick a hypervisor or a dedicated Ubuntu box, give it a desktop, and design agent-driven Linux GUI tests with evidence, golden images and flake control.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-17
readTime: 12 min
primaryKeyword: virtual machine mcp server
keywords: [vm mcp server, linux test automation agent, xvfb mcp, headless ubuntu desktop, golden image vm testing, dedicated ubuntu machine mcp]
related: [utm-mcp-server-linux-test-automation, linux-mcp-server-ubuntu-desktop-control, virtual-machine-mcp-server-windows-test-automation, virtual-machine-mcp-server-macos-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, which helps turn test-run recordings into short clips you can attach to failing CI notes.
rankizzBlurb: Rankizz researches keywords and tracks rankings and AI-search citations through a web app, REST API and MCP, so you can see whether your test-automation guides get found.
---

This guide shows you how to set up a Linux machine, virtual or physical, that an AI agent can test through a desktop-control MCP server, and how to design tests that give you the same answer twice. It is hypervisor-agnostic. For UTM-specific steps, read [the UTM guide](/blogs/utm-mcp-server-linux-test-automation). For installing the server itself, read [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control).

This is a researched guide, checked against upstream docs on 2026-11-17. I have not run this Linux setup yet. I did run the Windows analogue (a UTM Windows 11 ARM64 guest at `192.168.64.13`, `windows-mcp` on port 8000), and the architecture below is the same.

## Quick answer

1. Pick a target: a VM on your Mac, or a dedicated Ubuntu box.
2. Make sure it has an X11 desktop session. On a headless box, add XFCE with xrdp or a virtual display.
3. Install a desktop-control MCP server (`computer-use-linux`) bound to loopback with a token.
4. Reach it from the Mac through an SSH tunnel.
5. Snapshot or image a clean state, run the agent test, collect screenshots, restore.

## How the pieces fit

The agent stays on the Mac. The MCP server runs on the Linux machine, inside the graphical session it controls. The agent talks to it over HTTP, usually through a tunnel.

```text
Mac (agent, MCP client)
   |  SSH tunnel, 127.0.0.1:5200
Linux target (VM or dedicated box)
   |  computer-use-linux mcp --listen 127.0.0.1:5200
X11 desktop session + your app
```

Nothing in this layout cares what the target is. That is why one setup covers VMs, a spare desktop and a cloud instance.

## Choose the target

The target decides your reset story, not your agent. I checked what each option offers for snapshots and networking from their docs where I could. Parallels, VMware Fusion and VirtualBox details below are general knowledge, not tested by me.

| Target | Reset | Network to the Mac | Notes |
|---|---|---|---|
| UTM (free) | `utmctl snapshot`, clone | Shared Network, `192.168.64.x` | Documented in [the UTM guide](/blogs/utm-mcp-server-linux-test-automation) |
| Parallels, VMware Fusion | Built-in snapshots | NAT or host-only | Paid; check ARM64 Ubuntu support for your version |
| VirtualBox | Snapshots | NAT, host-only | ARM64 Mac host support is relatively new; verify |
| Dedicated Ubuntu box | Disk image or reinstall | Same LAN, plain SSH | Real hardware, real kernel, no snapshots |
| Cloud Ubuntu instance | Image or snapshot | Public IP, so SSH tunnel only | Never open the MCP port |

I have a dedicated Ubuntu machine with a Linux kernel as well as the Mac. That is a good fit for a real-hardware test, but a reset costs more, so prefer a VM for destructive tests.

## Step 1: Give the machine a desktop

A desktop-control server needs a running graphical session. Check it:

```bash
echo $XDG_CURRENT_DESKTOP
echo $DISPLAY
```

If both are empty, you are on a headless server. You have two options.

**Option A: XFCE plus xrdp.** This gives a real desktop you can also watch with RDP. XFCE is a light X11 desktop, and Microsoft's own Ubuntu remote-desktop guidance uses this pattern.

```bash
sudo apt update
sudo apt install -y xfce4 xfce4-goodies xrdp
echo "xfce4-session" > ~/.xsession
sudo systemctl enable --now xrdp
```

Connect once from the Mac with the steps in [RDP from a Mac to Linux](/blogs/rdp-from-mac-to-linux), then start the MCP server from a terminal inside that session. A session created by xrdp is its own X display, so the server must run in that session, not in SSH.

**Option B: a virtual display.** For CI with no one watching, `Xvfb` or `Xvnc` creates a display with no monitor. For example, `Xvfb :99 -screen 0 1280x800x24 &` then `export DISPLAY=:99`. A bare Xvfb has no window manager, no D-Bus session and no AT-SPI. The accessibility tree that `computer-use-linux` relies on needs those, so start a window manager and a session bus (`dbus-run-session`) too. I have not tested this combination, and I could not verify upstream support for it, so treat it as an experiment.

## Step 2: Install the server and bind it safely

```bash
sudo apt install -y xdotool wmctrl x11-utils nodejs npm
sudo npm install -g @agent-sh/computer-use-linux
openssl rand -hex 32 > ~/.cul-token && chmod 600 ~/.cul-token
COMPUTER_USE_LINUX_MCP_TOKEN_FILE=$HOME/.cul-token computer-use-linux mcp --listen 127.0.0.1:5200
```

Per the upstream README, the endpoint is `/mcp`, requests need `Authorization: Bearer <token>`, and a non-loopback bind needs `--allowed-host`. Run `computer-use-linux doctor | jq .readiness` first and fix any blockers.

If you use a stdio-only server instead, such as Microsoft's Hybrid Computer Use, you need a launch or bridge step. `supergateway` documents `npx -y supergateway --stdio "<cmd>" --outputTransport streamableHttp --port 8000`. I did not test it with a desktop server.

## Step 3: Reach it from the Mac

```bash
ssh -N -L 5200:127.0.0.1:5200 user@TARGET_IP
```

Then register it under a name that says what it is, like `linux-vm`. SSH basics are in [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac). The same pattern for Windows is in [SSH into a Windows VM from a Mac](/blogs/ssh-into-windows-vm-from-mac).

## Step 4: Build a golden image

A golden image is a clean machine with the OS, the desktop session, the MCP server and your app installed, and nothing else. Every test run starts from it.

- Install the app and its dependencies, then log in once to the X11 session.
- Disable screen lock, screensaver and notifications. A lock screen is the most common reason an agent loses the desktop.
- Pin the resolution, theme and language. Layout changes break coordinate-based clicks.
- Snapshot it, or save a disk image on a dedicated box.
- Re-create the image when the app or OS updates, and note the date.

## Step 5: Design tests an agent can run

Agents are bad at vague goals and good at short, checkable steps. Write tests that way.

- One behaviour per test. "Create a project and save it" is a test; "try the app" is not.
- State the expected evidence for each step: a window title, a file on disk, a dialog text.
- Prefer accessibility-tree actions (`perform_action`, `set_value`) over pixel clicks when the app exposes them. The server provides both.
- Always call `get_app_state` at the start of a turn and use its `snapshot_id` for element actions. Stale IDs are refused.
- Add a pass or fail line per step, and tell the agent to stop on the first failure.

## Step 6: Collect evidence and control flakiness

Ask for a screenshot after each step. The server returns screenshots inline over HTTP, because `screenshot_file_path` is refused in HTTP mode, so the agent client has to save them.

For flakiness, restore the golden image before every run, wait on a window or file instead of sleeping, and run each test three times before you trust a result. If a test passes only sometimes, fix the test: add a wait, a more specific selector or a fixed resolution. Do not tell the agent to retry until it passes.

To keep a failing run, [Subclip](subclip:inline-failing-run-clip) is an AI video editor that can connect MCP servers, so a screen recording can be cut into a clip for the issue.

## Test it with an agent

```text
Using the linux-vm MCP server:
1. Call get_app_state and take a screenshot of the clean desktop.
2. Launch MyApp and wait for its main window.
3. Perform the "create project" flow with the name "golden-run".
4. After each step, take a screenshot and state what you expected to see.
5. Stop at the first mismatch. Report PASS or FAIL for each step.
Do not install software or change system settings.
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot open display` | `DISPLAY` unset or wrong session | Start the server from a terminal inside the desktop session |
| xrdp login shows a black screen | Session start script fails | See [RDP from a Mac to Linux](/blogs/rdp-from-mac-to-linux) |
| `doctor` reports no AT-SPI | Bare Xvfb or no session bus | Run a window manager and `dbus-run-session`, or use XFCE |
| `404 Session not found` | Session idle over an hour | Initialize the MCP session again |
| `403` from the server | Missing `--allowed-host`, or an `Origin` header | Add the host name or keep loopback and tunnel |
| Agent loses the desktop mid-run | Screen lock or screensaver | Disable both in the golden image |
| Different result each run | No reset between runs | Restore the golden image first |

## Security

The server can click, type, read the screen and, if enabled, run shell commands. Assume anything on the machine is exposed to the agent.

- Run tests on a throwaway user in a VM or a box you can wipe. Take a snapshot or image first.
- Keep no SSH keys, browser sessions, cloud credentials or tokens on the target.
- Leave `COMPUTER_USE_LINUX_ENABLE_SHELL` unset.
- Bind to `127.0.0.1`, require the bearer token and tunnel in over SSH. Never expose port 5200 or any MCP port to the internet, and never on a cloud instance's public address.
- Microsoft's Hybrid Computer Use README says to run untrusted tasks on a dedicated desktop or disposable VM.

## FAQ

### Do I need a VM for a Linux MCP server?
No. A dedicated Ubuntu machine works if it has a graphical session. A VM mainly gives you snapshots for resetting.

### Can I use a headless Ubuntu server?
Only after you add a desktop. Install XFCE and xrdp, or a virtual display with a window manager and session bus, so there is something to control.

### Which hypervisor is best for this?
Any that gives you snapshots and a private network to the Mac. UTM is free and documented here, but the MCP setup is the same on Parallels, VMware Fusion or VirtualBox.

### How do I make agent tests repeatable?
Start every run from a golden image, pin the resolution and theme, wait on conditions instead of timers, and run each test several times.

### Can this run in CI?
In principle, with a virtual display and a runner you control. I have not tested it, and the Xvfb path is unverified.

## Next steps

Do a single manual run on the UTM guide, then automate. See [the UTM guide](/blogs/utm-mcp-server-linux-test-automation), [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control), and the Windows and macOS equivalents: [virtual machine MCP server for Windows](/blogs/virtual-machine-mcp-server-windows-test-automation) and [for macOS](/blogs/virtual-machine-mcp-server-macos-test-automation).

If you publish your own test-automation write-ups, [Rankizz](rankizz:inline-guide-tracking) can track rankings and AI-search citations for them.
