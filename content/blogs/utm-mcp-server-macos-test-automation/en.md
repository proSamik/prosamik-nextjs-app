---
title: How to Use a UTM MCP Server for macOS App Test Automation
seoTitle: How to Use a UTM MCP Server for macOS Test Automation
description: Run a macOS guest in UTM, enable SSH, install a macOS MCP server inside it, grant the permissions once by hand, and drive app tests from your host agent.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 2
readTime: 11 min
primaryKeyword: utm mcp server
keywords: [utm macos vm, macos virtual machine on mac, utm macos guest, macos mcp in vm, apple virtualization framework, utm ssh macos]
related: [macos-mcp-server-computer-use, virtual-machine-mcp-server-macos-test-automation, utm-mcp-server-windows-test-automation, utm-mcp-server-linux-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers and has a macOS app, which helps when you want to turn a recorded agent test run into a short failing-step clip.
rankizzBlurb: Rankizz helps you track whether a technical guide ranks for keywords like "utm macos vm" and shows how AI search cites it, via web app, REST API and MCP.
---

This guide shows you how to run macOS inside UTM on an Apple Silicon Mac, install a macOS MCP server in that guest, and have an agent on your host test an app inside it. The agent clicks inside a disposable macOS, not on your real desktop.

I have not run this exact setup yet. The UTM, Apple and MCP server details are from upstream docs, checked on 2026-11-17. I did test the Windows version of this workflow (macOS host, UTM, Windows 11 ARM64 guest), and the host-to-guest wiring is the same idea. That story is in [UTM MCP server for Windows test automation](/blogs/utm-mcp-server-windows-test-automation).

## Quick answer

1. Create a macOS VM in UTM (Virtualization, macOS 12+) and let it download the latest IPSW.
2. Finish setup, create a throwaway user, and enable **Remote Login** in System Settings > General > Sharing.
3. Find the guest IP (Shared Network, usually `192.168.x.x`) and SSH in from the host.
4. Install `uv` in the guest and run `uvx macos-mcp serve`.
5. In the guest's own GUI, grant **Accessibility** and **Screen Recording** to the app that launches the server. This step cannot be skipped or done over SSH.
6. Snapshot the VM, register the server in your host agent, and run a test prompt.

## What you need

| Item | Requirement |
|---|---|
| Host | Apple Silicon Mac. UTM docs: macOS guests need an Apple Silicon host on macOS 12 or higher |
| Hypervisor | UTM, using the Apple Virtualization backend (macOS guests are not emulated) |
| Guest | macOS, downloaded by UTM as an IPSW |
| Disk | Plan for tens of GB. A Tart macOS base image is about 25 GB, a useful comparison |
| MCP server in guest | `macos-mcp` (CursorTouch). Needs Python 3.11+ and uv |
| Host client | Claude Code or Cursor |

Check limits before you commit:

- **Two VMs at once.** Apple's licence allows up to two additional macOS copies per Mac for development and testing. An Apple DTS engineer states on the developer forums that the Virtualization framework enforces a hard cap of two macOS VMs, and a third fails to start. I did not check the current licence text myself.
- **UTM feature gates.** Per the UTM macOS guest docs: clipboard sharing needs macOS 15+, dynamic display resolution 14+, save states 14+, and snapshots and disposable mode macOS 27+. On an older host, plan on clones instead.
- **Not verified:** GPU passthrough (assume none; the guest uses Apple's paravirtualized graphics) and iCloud sign-in behaviour in guests. Test with a local account and skip Apple ID.

## Create the macOS VM in UTM

Create it with the Virtualization option, not Emulate. In UTM, choose Create a New Virtual Machine, then Virtualization, then macOS 12+. If neither option appears, UTM says your system does not support macOS guests.

If you do not pick an IPSW, UTM downloads the latest compatible macOS automatically, and the docs recommend that. You can supply an IPSW from a third-party site, but UTM does not vouch for those files.

Set memory and CPU, boot the VM, and walk through macOS setup. You should end up at a desktop. Create a throwaway user (for example `testuser`) and skip the Apple ID.

## Enable Remote Login and find the IP

Remote Login is macOS's SSH server. Turn it on in the guest, then SSH from the host so you can run commands without clicking.

In the guest: System Settings > General > Sharing > Remote Login, turn it on, and allow your test user.

Find the address in the guest terminal:

```bash
ipconfig getifaddr en0
```

On the Shared Network UTM uses, guests typically land in `192.168.x.x`. Then, from the host:

```bash
ssh testuser@<vm-ip>
```

You should get a shell prompt after accepting the host key. Copy your key so the agent does not need a password:

```bash
ssh-copy-id testuser@<vm-ip>
```

For comparison, the Windows and Linux equivalents are in [SSH into a Windows VM from Mac](/blogs/ssh-into-windows-vm-from-mac) and [SSH into a Linux VM from Mac](/blogs/ssh-into-linux-vm-from-mac).

## Install a macOS MCP server in the guest

Install uv and run the server over stdio first to confirm it starts. These commands come from the `macos-mcp` README.

```bash
# inside the guest, over SSH
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx macos-mcp serve
```

You should see the process start and wait. To make it reachable from the host, serve it over streamable HTTP on the guest's loopback:

```bash
uvx macos-mcp serve --transport streamable-http --host localhost --port 8000
```

Keep it on `localhost` and reach it through an SSH tunnel from the host, rather than exposing port 8000 to the network:

```bash
ssh -N -L 8000:localhost:8000 testuser@<vm-ip>
```

Then, on the host, check the endpoint. With Windows-MCP, `curl -v http://<ip>:8000/mcp` returned `400 Bad Request: Missing session ID`, which proved the endpoint was reachable. I expect a similar 4xx on a streamable HTTP MCP endpoint, but I have not seen `macos-mcp`'s exact response.

```bash
curl -v http://localhost:8000/mcp
```

## Grant Accessibility and Screen Recording once, in the GUI

This is the real gotcha. macOS will not let a script grant these two permissions, so you grant them once through the guest's graphical desktop.

Open the VM window in UTM (or screen-share into it), then go to System Settings > Privacy & Security and enable:

- **Accessibility** for the app that launches the server (Terminal if you start it from there, plus Python and uv per the upstream README).
- **Screen Recording** for the same app.

Restart the terminal after granting. Per upstream, starting `macos-mcp` v0.3.10 or later prompts for Accessibility consent, so the prompt appears in the guest GUI, not in your SSH session.

Why it is a pain for headless use: TCC grants live in a protected database. Enterprise tools can pre-approve some permissions through a management profile, but sources I found say Screen Recording generally cannot be silently granted this way and needs user approval. A plain VM without device management has no such path. I did not find a supported command-line way to grant either permission, so plan on one manual pass per VM image. `tccutil reset` only clears grants, it does not add them.

Once granted, snapshot or clone the VM so you never repeat it. The next post covers [golden images across hypervisors](/blogs/virtual-machine-mcp-server-macos-test-automation).

## Snapshot or clone the VM

Take a snapshot after the permissions are granted and the guest is idle. UTM's macOS guest docs list snapshots and disposable mode as supported only from macOS 27, so on earlier hosts clone the VM from UTM's VM menu instead. Use the clone for runs and keep the original as your golden copy.

## Drive a macOS app test from the host agent

Register the tunnelled endpoint in your host client, named for what it controls. Mine for Windows is `windows-vm`; here use `macos-vm`.

```bash
claude mcp add --transport http macos-vm http://localhost:8000/mcp
```

The `--transport http` flag is Claude Code's standard way to add an HTTP MCP server; the URL is the tunnel from above. Then give the agent a scoped test:

```text
Use only the macos-vm MCP server. Do not touch my host machine.
1. Take a screenshot and list open windows.
2. Open MyApp from /Applications.
3. Create a project named "UTM macOS test", enter sample data and save it.
4. Confirm the success message appears. Take a screenshot as evidence.
5. Report PASS or FAIL per step, with the screenshot description.
Stop and report if you hit a password or system dialog.
```

You should see the app open inside the VM window while your host stays untouched. If you want the run on video, [Subclip](subclip:inline-test-recording) is an AI video editor that can connect MCP servers and has a macOS app, so a recording of the UTM window can become a short clip of the failing step.

## Troubleshooting

| Error or symptom | Cause | Fix |
|---|---|---|
| No "Virtualization" or "macOS 12+" option in UTM | Host is not Apple Silicon or too old | UTM docs: use an Apple Silicon Mac on macOS 12+ |
| Third macOS VM will not start | Two-VM cap in the Virtualization framework | Stop another macOS VM first |
| `ssh: connect to host ... port 22: Connection refused` | Remote Login is off | Enable it in Sharing in the guest |
| `Permission denied (publickey,...)` | User not allowed, or key not copied | Allow the user under Remote Login, run `ssh-copy-id` |
| Screenshot blank | Screen Recording not granted in guest | Grant in the guest GUI, restart the terminal |
| Clicks do nothing | Accessibility not granted | Grant it for Terminal, Python and uv |
| Permission check fails spuriously | Parent process already has access | `MACOS_MCP_SKIP_PERMISSION_CHECK=1` (README) |
| `curl: (7) Failed to connect to localhost port 8000` | Tunnel or server not running | Start the server, then the `ssh -L` tunnel |
| Snapshots missing | UTM supports them from macOS 27 only | Clone the VM instead |

## Security

The VM is the safety boundary, so keep it that way. An agent with Accessibility and Screen Recording controls everything in that guest.

- Snapshot or clone before every run, and discard afterwards.
- Use a throwaway local user. Do not sign in with your Apple ID or add real accounts.
- Never expose the MCP port. Bind to `localhost` in the guest and use an SSH tunnel.
- Do not mount host folders or share the clipboard if the test does not need them.
- Keep Remote Login limited to the test user, with key auth.
- Tell the agent to stop at password or authentication dialogs. These servers cannot drive them anyway.

## FAQ

### Can I run a macOS VM in UTM on Apple Silicon?
Yes. Pick Virtualization and macOS 12+ in the new VM wizard. UTM can download the latest IPSW for you. The host must be Apple Silicon.

### How many macOS VMs can I run at once?
Two. Apple's licence allows two additional copies per Mac for development and testing, and the Virtualization framework enforces a hard cap of two, per an Apple DTS engineer on the developer forums.

### Can I grant Accessibility and Screen Recording over SSH?
No supported way that I found. Grant them once in the guest's GUI under Privacy & Security, then snapshot or clone the VM so you keep the grants.

### Does UTM support snapshots for macOS guests?
Per UTM's docs, snapshots and disposable mode for macOS guests need macOS 27 or later. Earlier versions can clone a VM instead.

### Should I expose the MCP port on the VM's network?
No. Serve on `localhost` in the guest and tunnel with `ssh -L`. Anyone who can reach the port can control the VM.

## Next steps

Try the same flow for other guests: [Windows](/blogs/utm-mcp-server-windows-test-automation) and [Linux](/blogs/utm-mcp-server-linux-test-automation). For the host side, see [how to set up a macOS MCP server](/blogs/macos-mcp-server-computer-use). When you publish your own write-up, [Rankizz](rankizz:inline-guide-tracking) tracks whether it ranks for "utm macos vm" and gets cited by AI search.
