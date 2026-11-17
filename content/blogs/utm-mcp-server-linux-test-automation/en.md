---
title: How to Use a UTM MCP Server for Linux App Test Automation
seoTitle: How to Use a UTM MCP Server for Linux Test Automation
description: Run an Ubuntu ARM64 guest in UTM on Apple Silicon, put a desktop-control MCP server inside it, and let a Mac agent test a Linux GUI app.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 3
readTime: 11 min
primaryKeyword: utm mcp server
keywords: [utm mcp, utm ubuntu vm, utm linux guest, ubuntu on apple silicon, utmctl snapshot, mac linux vm test automation]
related: [linux-mcp-server-ubuntu-desktop-control, ssh-into-linux-vm-from-mac, utm-mcp-server-windows-test-automation, utm-mcp-server-macos-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, so a screen recording of a failing UTM test run can be trimmed into a clip for the bug report.
rankizzBlurb: Rankizz tracks whether your UTM and MCP how-to guides rank and get cited by AI search, with a web app, REST API and MCP.
---

After this guide you can boot an Ubuntu guest in UTM on an Apple Silicon Mac, run a desktop-control MCP server inside it, and have an agent on the Mac open your Linux GUI app, click through a flow and report pass or fail. It is UTM-specific. For the general server install and the list of Linux MCP options, read [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control) first. For other hypervisors, see [the virtual machine guide](/blogs/virtual-machine-mcp-server-linux-test-automation).

This is a researched guide, not a war story. Commands come from UTM's docs and the `computer-use-linux` README, checked 2026-11-17. I have not run this Linux setup yet. I did run the Windows version: a Windows 11 ARM64 guest in UTM on Shared Network (a `192.168.x.x` address), with `windows-mcp` on port 8000. The Linux flow below follows that shape.

## Quick answer

1. Create an Ubuntu 24.04 ARM64 VM in UTM with Shared Network.
2. Install `spice-vdagent`, `openssh-server`, `xdotool`, `wmctrl` and `x11-utils`.
3. Log in with "Ubuntu on Xorg".
4. Install `@agent-sh/computer-use-linux` and start `computer-use-linux mcp --listen 127.0.0.1:5200` with a token.
5. Snapshot the VM with `utmctl`.
6. Tunnel from the Mac with `ssh -N -L 5200:127.0.0.1:5200 user@VM_IP` and point your client at `http://127.0.0.1:5200/mcp`.

## What to decide before you create the VM

On Apple Silicon, use an ARM64 Ubuntu image and virtualise it rather than emulate x86. Emulation works in UTM but is much slower, and a GUI test run is already slow enough. If your app is x86-only, test the ARM64 build first.

UTM has two backends. Here is the trade-off, from UTM's docs and community reports:

| Backend | Good for | Caveats |
|---|---|---|
| QEMU | Display options, SPICE tools, USB, the widest feature set | Slightly more setup |
| Apple Virtualization | Simple setup, close to native speed | Marked experimental by UTM; QEMU-specific device settings do not apply |

I would start with QEMU. UTM's Linux guest page says the SPICE agent enables dynamic resolution on QEMU, and clipboard sharing on both backends. A benchmark I found showed similar Ubuntu boot and CPU performance on both, from a single lab, so treat that as a hint only.

Ubuntu Desktop ARM64 ISOs vary by release. If you cannot find one for your release, a common route is the ARM64 Server ISO plus `sudo apt install xfce4`. I did not verify the current Desktop ARM64 ISO availability per release.

## Step 1: Create the Ubuntu VM

Create the VM in UTM, mount the ARM64 ISO, give it at least 4 GB RAM and 40 GB disk, and finish the installer. Use a throwaway username, such as `testuser`. Under Network, leave the mode on Shared Network.

UTM's network page says Shared Network lets the host route traffic directly so guest and host services can reach each other, and it recommends it for new VMs. It does not state an IP range. In practice the guest lands on `192.168.x.x`, the same range my Windows VM got.

## Step 2: Install guest tools

Inside the guest, install the SPICE agent and the SSH server:

```bash
sudo apt update
sudo apt install -y spice-vdagent qemu-guest-agent openssh-server
```

`spice-vdagent` is what UTM documents for clipboard sharing. `qemu-guest-agent` adds time sync and scripting support, and `utmctl exec` needs a guest agent. Reboot once afterwards. Test the clipboard by copying text on the Mac and pasting it in the guest.

## Step 3: Choose Ubuntu on Xorg at login

Log out, click your username, click the gear icon, and choose "Ubuntu on Xorg". Then confirm:

```bash
echo $XDG_SESSION_TYPE   # expect: x11
echo $DISPLAY            # expect: :0 or similar
```

Ubuntu 25.10 and later removed the GNOME Xorg session, so the gear menu will not offer it. Use Ubuntu 24.04 LTS, or install XFCE and choose that session.

## Step 4: Find the VM IP

From the guest, or from the Mac with `utmctl`:

```bash
ip -br addr
utmctl ip-address "Ubuntu"
```

You should see an address like `192.168.x.x/24`. UTM's docs list `ip-address` but give no output sample, so match it against `ip -br addr`. The address can change after a reboot, so reserve or re-check it.

## Step 5: Install and start the MCP server

```bash
sudo apt install -y xdotool wmctrl x11-utils nodejs npm
sudo npm install -g @agent-sh/computer-use-linux
computer-use-linux setup
computer-use-linux doctor | jq .readiness
```

Start it in a terminal inside the desktop session, with a token file:

```bash
openssl rand -hex 32 > ~/.cul-token && chmod 600 ~/.cul-token
COMPUTER_USE_LINUX_MCP_TOKEN_FILE=$HOME/.cul-token computer-use-linux mcp --listen 127.0.0.1:5200
```

Per the README, the endpoint is `/mcp` and a client without the bearer token gets 401. I bind to loopback and tunnel instead of binding `0.0.0.0`, because the port is plain HTTP. If you do bind to the VM address, the README requires `--allowed-host` for each client name.

## Step 6: Take a snapshot before you test

UTM's scripting docs document these `utmctl` commands:

```bash
utmctl snapshot create "Ubuntu" --name "clean-mcp-ready"
utmctl snapshot list "Ubuntu" --json
utmctl snapshot restore "Ubuntu" --snapshot "clean-mcp-ready"
```

Snapshot after the server works and before the agent touches anything. Restore after each run. If your UTM version lacks `utmctl snapshot`, use the Snapshots feature in the UTM window or clone the VM. Snapshot support differs between backends, which I have not verified, so test one restore before you rely on it.

## Step 7: Connect from the Mac

Open the tunnel from the Mac. SSH setup is in [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac).

```bash
ssh -N -L 5200:127.0.0.1:5200 <user>@<vm-ip>
curl -i http://127.0.0.1:5200/mcp
```

You should see `401`. On my Windows setup, the equivalent proof was `400 Bad Request: Missing session ID`. Then add the client entry, named `linux-vm`:

```bash
claude mcp add --transport http linux-vm http://127.0.0.1:5200/mcp --header "Authorization: Bearer YOUR_TOKEN"
```

## Step 8: Drive a Linux GUI app test

Install your app in the guest first. Then paste this prompt:

```text
Using the linux-vm MCP server, test MyApp:
1. Call get_app_state, then launch MyApp.
2. Wait for its main window with list_windows.
3. Create a new project named "mcp-smoke".
4. Click Save and wait for the success message.
5. Take a screenshot after each step.
6. Report PASS or FAIL per step, with the screenshot taken at the failing step.
Do not open a browser, change settings, or touch files outside the project folder.
```

Run it three times, restoring the snapshot between runs. If results differ, the test is flaky, not the agent.

To keep evidence, [Subclip](subclip:inline-test-run-clip) can connect MCP servers inside its AI editor, and an AI video editor is a reasonable way to cut a failing run into a short clip.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ssh: connect to host <vm-ip> port 22: Connection refused` | `ssh` service not installed or not running | `sudo apt install openssh-server`, then `sudo systemctl enable --now ssh` |
| `ssh: connect to host ... Operation timed out` | Wrong IP or the VM is suspended | Re-run `ip -br addr` in the guest |
| Clipboard does not sync | `spice-vdagent` missing or not running | Install it and reboot |
| Resolution stuck small | Dynamic resolution needs the SPICE agent on QEMU | Install `spice-vdagent`; try a GPU-accelerated display card |
| No "Ubuntu on Xorg" in the gear menu | Ubuntu 25.10+ dropped the GNOME Xorg session | Use 24.04 LTS or XFCE |
| `utmctl exec` fails | No guest agent | Install `qemu-guest-agent` |
| `401` from curl | No bearer token | Expected; the client must send it |
| Desktop renders badly | Vulkan is not supported for the Linux desktop in UTM | Use the VirGL driver, per UTM docs |

## Security

The agent can click, type and read anything on the guest desktop. The VM is the sandbox, so keep it that way.

- Take a snapshot first and restore after every run.
- Use a throwaway user. Keep no SSH keys, browser sessions or tokens in the guest.
- Do not enable `COMPUTER_USE_LINUX_ENABLE_SHELL`. It runs with the server user's full permissions, and HTTP mode refuses to start with it on.
- Keep the server on loopback inside the guest and tunnel in. Never forward the port to your router or LAN.
- Shared folders and clipboard sync blur the boundary. Turn off shared directories you do not need.

## FAQ

### Does UTM have an MCP server?
UTM itself does not ship one. You run a desktop-control MCP server such as `computer-use-linux` inside the Linux guest and connect to it from the Mac. `utmctl` handles start, stop and snapshots from the host.

### Should I use QEMU or Apple Virtualization for Ubuntu?
Start with QEMU for the SPICE tools and display options. Apple Virtualization is simpler and fast, but UTM marks it experimental and QEMU-specific settings do not apply.

### What IP will the Ubuntu VM have?
On Shared Network it is typically `192.168.x.x`. Confirm it with `ip -br addr` in the guest or `utmctl ip-address`.

### Can I run x86 Linux apps on an Apple Silicon Mac?
UTM can emulate x86, but it is slower. Prefer an ARM64 guest and an ARM64 build of your app.

### How do I reset the VM between test runs?
Create a snapshot or clone, then restore it with `utmctl snapshot restore`. Test one restore before you depend on it.

## Next steps

Read [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control) for server options, and [the virtual machine guide](/blogs/virtual-machine-mcp-server-linux-test-automation) for test design. The same flow for Windows is [UTM MCP server for Windows test automation](/blogs/utm-mcp-server-windows-test-automation), and for macOS it is [UTM MCP server for macOS test automation](/blogs/utm-mcp-server-macos-test-automation).

To see whether a guide like this ranks and gets cited in AI answers, [Rankizz](rankizz:inline-guide-tracking) tracks keywords and AI-search citations.
