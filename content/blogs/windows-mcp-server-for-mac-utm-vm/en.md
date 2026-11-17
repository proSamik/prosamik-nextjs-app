---
title: How to Set Up a Windows MCP Server on a Mac (UTM Windows 11 VM)
seoTitle: How to Set Up a Windows MCP Server on a Mac (UTM VM)
description: Turn a Windows 11 ARM VM in UTM into a Windows MCP server that your Mac agent controls over HTTP. Exact commands, the build errors I hit, and fixes.
category: MCP servers
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 4
readTime: 11 min
primaryKeyword: windows mcp
keywords: [windows mcp, windows mcp server, mcp server for windows, utm windows vm, windows-mcp mac, uvx windows-mcp]
related: [utm-mcp-server-windows-test-automation, ssh-into-windows-vm-from-mac, macos-mcp-server-computer-use, linux-mcp-server-ubuntu-desktop-control]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, so you can turn a recorded agent test run on your Windows VM into a short clip of the failing step.
rankizzBlurb: Rankizz tracks whether the guides you publish rank and get cited by AI search, through its web app, REST API and MCP server.
---

By the end of this guide, an agent on your Mac (I use Claude Code) will be able to take screenshots of a Windows 11 VM running in UTM, click, type and launch apps in it, and the server will start on its own whenever Windows logs in. You need a Mac, UTM with Windows 11 already installed, and about twenty minutes. The path below is the one I ran, including the two build errors that cost me most of the time.

A Windows MCP server is a program that runs inside Windows and exposes desktop actions as MCP tools. The agent never touches Windows directly. It calls tools such as `Screenshot`, `Click` and `Type` over the network, and the server performs them. The server I used is [Windows-MCP](https://github.com/CursorTouch/Windows-MCP), an open-source project.

## Quick answer

On the Windows VM, in this order:

1. Set the UTM network mode to Shared Network and start Windows.
2. Install uv: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`, then open a new PowerShell.
3. Run the server: `uvx --python 3.12 --no-build-package cryptography windows-mcp serve --transport streamable-http --host 0.0.0.0 --port 8000 --allow-insecure-remote`
4. Allow port 8000 through the firewall (Administrator PowerShell).
5. Find the VM's IP with `ipconfig`, then run `curl -v http://<ip>:8000/mcp` on the Mac. A `400 Bad Request: Missing session ID` response means it works.
6. Add `http://<ip>:8000/mcp` to your Mac agent as an HTTP MCP server.
7. Run `windows-mcp install` to start it at login.

Read the Security section before step 3. That server has no authentication.

## What I ran this on

| Item | Value |
|---|---|
| Host | MacBook, macOS |
| Hypervisor | UTM, network mode Shared Network |
| Guest | Windows 11 ARM64 |
| Guest IP | An address in the `192.168.x.x` range (find yours with `ipconfig`) |
| uv | 0.13.9, installed with the official PowerShell installer |
| windows-mcp | 0.8.9 (depends on fastmcp) |
| Mac agent | Claude Code, server entry named `windows-vm` |

Upstream says Windows-MCP needs Python 3.14 or newer. I ran it on Python 3.12 through uv and it worked, so treat that requirement as a default rather than a hard floor on ARM64. Your results on x86 Windows may differ.

## Step 1: Set UTM to Shared Network

Shared Network is the mode to use. The UTM docs say the host routes the traffic and the guest shares a network with the Mac, so each can reach the other without extra setup. Open the VM's settings in UTM, go to Network, choose Shared Network, then start Windows. Mine was already on it, so I did not change anything. The other modes and when to pick them are in [the UTM test automation post](/blogs/utm-mcp-server-windows-test-automation).

## Step 2: Install uv on Windows

`pip` was not installed on my VM, so `pip install uv` failed with `The term 'pip' is not recognized`. You do not need it. Run the official installer in PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

I saw this output:

```text
downloading uv 0.13.9 (aarch64-pc-windows-msvc)
installing to C:\Users\<user>\.local\bin
  uv.exe
  uvx.exe
  uvw.exe
everything's installed!
```

Open a new PowerShell window afterwards. If you cannot, put uv on the PATH for the current window:

```powershell
$env:Path = "C:\Users\<user>\.local\bin;$env:Path"
uv --version
```

## Step 3: Start the server (and work around the ARM64 build errors)

The plain command from the README, `uvx windows-mcp serve`, did not work on my VM. uv picked Python 3.15, found no prebuilt Windows ARM64 package for `pyyaml`, and tried to compile it:

```text
Microsoft Visual C++ 14.0 or greater is required
```

Pinning Python 3.12 fixed `pyyaml` but then `cryptography` 50.0.2 failed. It needs Rust and the MSVC linker, which a fresh Windows install does not have (`link.exe` missing). I tried installing Visual Studio Build Tools with winget. That installed only the launcher, not the C++ workload, so the linker was still missing. I stopped there. What worked was telling uv not to build `cryptography` at all and to use a prebuilt package:

```powershell
uvx --python 3.12 --no-build-package cryptography windows-mcp serve --transport streamable-http --host 0.0.0.0 --port 8000 --allow-insecure-remote
```

Leave that window open. `--host 0.0.0.0` makes the server listen on every interface, which the Mac needs. `--allow-insecure-remote` is the flag my version required to bind a non-local address without authentication. It is not in the upstream README, which documents `--auth-key` instead. See Security.

## Step 4: Open port 8000 in Windows Firewall

If the Mac cannot connect, allow the port. In an Administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Windows MCP 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

## Step 5: Check it from the Mac

Get the guest IP from `ipconfig` in Windows (the IPv4 line). On UTM Shared Network mine was in the `192.168.x.x` range. Then on the Mac:

```bash
curl -v http://<vm-ip>:8000/mcp
```

Expected output (trimmed):

```text
* Connected to <vm-ip> (<vm-ip>) port 8000
> GET /mcp HTTP/1.1
< HTTP/1.1 400 Bad Request
{"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Bad Request: Missing session ID"}}
```

That error is good news. A plain GET is not a valid MCP request, so the server rejects it, which proves the Mac reached it. If `curl` hangs instead, the server is not running or the firewall is blocking it. See Troubleshooting.

## Step 6: Connect your Mac agent

Add the VM as an HTTP MCP server. In Claude Code, per the Claude Code docs:

```bash
claude mcp add --transport http windows-vm http://<vm-ip>:8000/mcp
```

Or in `.mcp.json`:

```json
{
  "mcpServers": {
    "windows-vm": {
      "type": "http",
      "url": "http://<vm-ip>:8000/mcp"
    }
  }
}
```

Other clients use a different key for the transport, but the URL is the part that matters. Run `/mcp` in Claude Code to see whether the server is connected.

### What tools the agent gets

The upstream README lists 21 tools, including `Click`, `Type`, `Scroll`, `Shortcut`, `Screenshot`, `Snapshot`, `App`, `PowerShell`, `FileSystem`, `Clipboard`, `Process` and `Registry`. `Snapshot` returns a description of the UI the agent can act on. `PowerShell` and `Registry` are the dangerous ones. The README says you can restrict the list with `--exclude-tools`. I have not run that flag myself.

## Step 7: Start it at login

I did not want a PowerShell window open forever. Windows-MCP has an `install` command that creates a per-user scheduled task named `windows-mcp-server`. I ran:

```powershell
uvx --python 3.12 --no-build-package cryptography windows-mcp install --transport streamable-http --host 0.0.0.0 --port 8000
```

My first attempt included `--allow-insecure-remote`, and `install` rejected that flag, so leave it off. It worked without it and the curl check returned the same 400 response. It created:

- the scheduled task `windows-mcp-server`
- a wrapper at `C:\Users\<user>\.windows-mcp\start-server.cmd`
- logs at `server.log` and `server.error.log` in the same folder

Check and manage it:

```powershell
Get-ScheduledTask -TaskName "windows-mcp-server"
Get-NetTCPConnection -LocalPort 8000 -State Listen
Get-Content "$env:USERPROFILE\.windows-mcp\server.log" -Tail 50
Stop-ScheduledTask -TaskName "windows-mcp-server"
Start-ScheduledTask -TaskName "windows-mcp-server"
```

To remove it, run the same `uvx ... windows-mcp uninstall`. A task that starts at login only runs after someone logs in, so for an unattended test VM you also need Windows to sign in automatically. I have not set that up.

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| `pip : The term 'pip' is not recognized` | Python and pip are not installed | Skip pip. Use the uv PowerShell installer. |
| `uv` not found right after install | The installer changed PATH but the open shell did not reload | Open a new PowerShell, or set `$env:Path` as shown above. |
| `Microsoft Visual C++ 14.0 or greater is required` while building `pyyaml` | uv picked Python 3.15 with no prebuilt ARM64 package | Add `--python 3.12`. |
| Build fails on `cryptography` 50.0.2, maturin, `link.exe` missing | No Rust or MSVC toolchain on Windows | Add `--no-build-package cryptography`. |
| `curl` from the Mac hangs | Server not running, or port 8000 blocked | Check the server window, then add the firewall rule. |
| `400 Bad Request: Missing session ID` | Not an error. A plain GET is not a valid MCP call | Connect with an MCP client instead. |
| `install` rejects `--allow-insecure-remote` | The flag only applies to `serve` in my version | Remove it from the `install` command. |

## Security

`--allow-insecure-remote` means anyone who can reach port 8000 can control the VM with no password. That includes clicking, typing, reading the screen and, if the tool is enabled, running PowerShell. Treat it like leaving a remote desktop open.

What I do, and what I recommend:

- Keep the VM on UTM Shared Network. Do not forward port 8000 through a router or a tunnel.
- Use a throwaway Windows user with no personal accounts, browser sessions or secrets.
- Take a UTM snapshot before any agent run so you can roll back.
- Upstream documents `--auth-key` (a bearer token), `--ip-allowlist`, `--tools` and `--exclude-tools`. These come from the README. I have not run them, so test them before you rely on them. Note the README documents no auth flag for `install`.
- To stop it: `Stop-ScheduledTask -TaskName "windows-mcp-server"`, or run `windows-mcp uninstall`, and close the firewall rule with `Remove-NetFirewallRule -DisplayName "Windows MCP 8000"`.

## Test it with an agent

Paste this into your Mac agent once the server is connected. Use the real app name and a snapshot you can roll back to.

```text
Using the windows-vm MCP server:
1. Take a screenshot of the desktop and list the apps you can see.
2. Open Notepad, type "mcp test 1", and take a screenshot.
3. Close Notepad without saving.
4. Report PASS if the screenshot in step 2 showed the text, otherwise FAIL
   with the exact error. Do not run PowerShell or touch the registry.
```

If a run fails, a screen recording of the failing step saves a lot of explaining. [Subclip](subclip:inline-test-recording) is an AI video editor that can connect MCP servers, so you can cut that clip down without leaving your agent workflow.

## FAQ

### What is a Windows MCP server?

It is a program running on Windows that exposes desktop actions, such as screenshots, clicks, typing and launching apps, as MCP tools. An agent on another machine calls them over stdio or HTTP.

### Can I run it on a Mac without a VM?

No. It controls the Windows desktop it runs on, so it needs Windows. On Apple Silicon that means a VM such as UTM, or a separate Windows machine.

### Do I need to install Python?

I did not. uv downloaded Python 3.12 on demand when I passed `--python 3.12`. I never installed Python or pip myself.

### Why did the server fail to build on my ARM64 VM?

Some dependencies, `pyyaml` and `cryptography` in my case, had no prebuilt Windows ARM64 package for the Python version uv chose, so uv tried to compile them without a C++ toolchain. Pin Python 3.12 and use `--no-build-package cryptography`.

### Is `--allow-insecure-remote` safe?

Only on an isolated network with a disposable VM. It removes authentication. Use `--auth-key` if you need more than that, and verify it works first.

## Next steps

UTM gives you networking modes, snapshots and command-line control that matter once you run tests on a schedule. That is covered in [How to use a UTM MCP server for Windows test automation](/blogs/utm-mcp-server-windows-test-automation). To restart the server or read its logs without opening the VM window, set up [SSH into the Windows VM](/blogs/ssh-into-windows-vm-from-mac). Doing the same for other guests: [macOS](/blogs/macos-mcp-server-computer-use) and [Linux](/blogs/linux-mcp-server-ubuntu-desktop-control).
