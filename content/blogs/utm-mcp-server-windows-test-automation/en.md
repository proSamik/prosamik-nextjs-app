---
title: How to Use a UTM MCP Server for Windows App Test Automation
description: Use UTM as the test rig for an agent-driven Windows MCP server: pick the network mode, find the IP, reset with snapshots, script UTM from the Mac.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 1
readTime: 10 min
primaryKeyword: utm mcp server
keywords: [utm mcp server, utm windows test automation, utmctl, utm snapshots, utm shared network, windows 11 arm utm]
related: [windows-mcp-server-for-mac-utm-vm, virtual-machine-mcp-server-windows-test-automation, utm-mcp-server-linux-test-automation, utm-mcp-server-macos-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, which helps when you want a short clip of a UTM test run instead of a wall of screenshots.
rankizzBlurb: Rankizz tracks whether your published guides rank and get cited by AI search, via its web app, REST API and MCP server.
---

This guide shows how to turn a UTM Windows VM into a repeatable test rig for an agent: choose the right network mode, find the guest IP reliably, reset the VM to a clean state before every run, and control UTM itself from the Mac command line. It assumes the Windows MCP server already runs in the VM. If it does not, do [the install walkthrough](/blogs/windows-mcp-server-for-mac-utm-vm) first. Everything here is about UTM, not about the server.

I ran the Windows 11 ARM guest, Shared Network, and the MCP server parts myself. The `utmctl` and AppleScript parts below come from the UTM docs and I have not run those exact commands. I say so where it matters.

## Quick answer

1. Use Shared Network unless you have a reason not to. The Mac reaches the guest at an address like `192.168.x.x`.
2. Take a snapshot of the clean, logged-in VM with the Windows MCP server already running.
3. Before each test run, restore that snapshot, start the VM, find its IP, and check `curl http://<ip>:8000/mcp` returns `400 Bad Request: Missing session ID`.
4. Point the agent at `http://<ip>:8000/mcp` and run the test prompt.
5. Run Windows 11 ARM on Apple Silicon. Emulated x86 Windows is much slower.
6. Make UTM start with your Mac login and let Windows sign in automatically so the VM is ready without you.

## What this was tested on

| Item | Value |
|---|---|
| Host | MacBook (macOS), Apple Silicon |
| Hypervisor | UTM, Shared Network |
| Guest | Windows 11 ARM64, Shared Network (a `192.168.x.x` address) |
| MCP server | windows-mcp 0.8.9, streamable HTTP on port 8000 |

## Choose a UTM network mode

Shared Network is the right default, because it gives the Mac and the guest a direct route to each other. The UTM docs describe four modes:

| Mode | What it does | Use it when |
|---|---|---|
| Shared Network | Host routes traffic; guest and host can reach each other with no setup. Recommended by UTM for new VMs. | Agent on the Mac, server in the VM. This is what I used. |
| Host Only | Like Shared, but the guest cannot reach the internet. | You want the strictest isolation and the app needs no internet. |
| Bridged | Layer 2 bridge to a chosen interface, so the guest gets an address on your LAN. | You want other machines to reach the VM. The docs flag Wi-Fi as needing extra work. |
| Emulated VLAN | Private user-space network per VM; traffic appears to come from the UTM process. | You do not need inbound access from the Mac. It is the wrong fit here. |

For an unauthenticated MCP server, Shared or Host Only keeps the port off your LAN. Bridged puts it on your LAN. Host Only has one catch: Windows cannot download the app or updates, and the docs say Host Only has no DHCP on a separate host network, so you may have to set the IP yourself. I have not tried Host Only.

## Find the guest IP without opening the VM window

The IP can change between boots, so discover it every run. Inside Windows, `ipconfig` shows it. From the Mac, `utmctl ip-address` lists a VM's addresses per the UTM docs:

```bash
/Applications/UTM.app/Contents/MacOS/utmctl list
/Applications/UTM.app/Contents/MacOS/utmctl ip-address "Windows 11"
```

I did not run these. The docs say `exec` needs the guest agent, and the Windows guide says the SPICE guest tools carry the network drivers, so install the guest tools first. If `ip-address` returns nothing on your setup, fall back to `arp -a` on the Mac and look for a `192.168.x.x` entry, or give the VM a stable address.

Then verify the server is up before the agent starts. This is a gate, not a nicety, since a test that cannot reach the server tells you nothing about the app:

```bash
IP=<vm-ip>
curl -s -o /dev/null -w "%{http_code}\n" http://$IP:8000/mcp
```

On my setup a plain GET returned `400`. A `400` here means reachable. Anything else, or a timeout, means stop and fix the rig.

## Reset the test state with snapshots

A snapshot is how you make every run start from the same Windows. Take it once, when Windows is logged in, the MCP server is running and your app is installed but untouched. UTM can snapshot from the VM's menu. The docs also list a `snapshot` command in `utmctl` with `create`, `list`, `restore`, `overwrite`, `rename`, `delete` and `scan`, and give these examples for a VM called "Ubuntu":

```bash
utmctl snapshot create "Ubuntu" --name "Before update"
utmctl snapshot list "Ubuntu" --json
utmctl snapshot restore "Ubuntu" --snapshot "Before update"
```

Swap in your VM name. I have not run these on Windows, and the snapshot subcommands depend on your UTM version, so run `utmctl help snapshot` first. The docs warn that `delete` has no confirmation prompt.

A per-run loop then looks like this:

```bash
UTMCTL=/Applications/UTM.app/Contents/MacOS/utmctl
$UTMCTL stop "Windows 11"
$UTMCTL snapshot restore "Windows 11" --snapshot "clean-with-mcp"
$UTMCTL start "Windows 11"
# wait for Windows to boot and the MCP server to answer
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://$IP:8000/mcp)" = "400" ]; do sleep 5; done
```

Restoring a snapshot taken while the VM was running may bring back the running state, and then the server is already up. Whether yours resumes or cold boots depends on how you took it, so test it once. Because the scheduled task from the install guide starts at login, a cold boot only works if Windows signs in on its own.

## Control UTM from the host

`utmctl` is a command-line wrapper around UTM's AppleScript interface, per the docs. The commands I read in the docs are `list`, `status`, `start` (with `--disposable` to discard changes), `suspend`, `stop`, `ip-address`, `exec` and `snapshot`. VMs are identified by name or UUID. The docs also say not every feature is available through automation.

`start --disposable` is worth knowing about. It runs the VM without saving changes, which is another way to get a clean state. I have not tested it with Windows.

## Choose ARM64 or x86 on Apple Silicon

Use the ARM64 Windows 11 image. The UTM Windows guide says arm64 is for Apple Silicon and amd64 is for Intel. Emulating x86 on Apple Silicon works, but the guide notes the default is one core because several emulated cores run on one real core, and forcing more can cause odd crashes. Everything in this post, and the server install, was done on ARM64.

The limit is the app. A native ARM64 build of your app runs best. Windows 11 ARM can run many x86 apps through its own emulation, but I have not tested which ones, so test your app early. If it needs an x86-only driver, an ARM VM is the wrong rig.

## Make the VM test-ready at login

Two parts have to start by themselves: the VM, and the server inside it.

- Inside Windows, the `windows-mcp-server` scheduled task from the install guide starts the server at login. That needs Windows to sign in on its own. I have not set up auto sign-in. It is a Windows setting, and it stores credentials, so use a throwaway account.
- On the Mac, add UTM to Login Items, and start the VM with `utmctl start "Windows 11"` from a launch agent or a login script. I have not built this. It is straightforward with the commands above, but test it.

Do not use this on a laptop you carry around, since the VM takes memory all day.

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| `curl` to the guest IP hangs after restore | Guest still booting, or the server task has not started | Poll with the `until` loop and a timeout. |
| `curl` hangs and the VM is up | Port 8000 blocked | Add the inbound firewall rule from the install guide. |
| Guest IP is different today | DHCP lease changed | Look it up every run (`ipconfig`, `utmctl ip-address`). |
| `utmctl ip-address` or `exec` returns nothing | Guest agent or SPICE tools missing | Install the SPICE guest tools in Windows. |
| `Microsoft Visual C++ 14.0 or greater is required` on first server run | No prebuilt ARM64 package | Use `--python 3.12 --no-build-package cryptography`, see the install guide. |
| Other devices on the LAN can reach port 8000 | Bridged mode | Switch to Shared or Host Only. |

## Security

Shared Network keeps the unauthenticated MCP port reachable only from your Mac and the guest. That is the main reason to use it. Bridged mode exposes the port to your whole LAN, and the server started with `--allow-insecure-remote` has no authentication. Always restore a snapshot after a run that installed or changed anything. Use a throwaway Windows user and keep secrets out of the VM. Never port-forward port 8000. Stop it with `Stop-ScheduledTask -TaskName "windows-mcp-server"` inside Windows, or `utmctl stop` from the Mac.

## Test it with an agent

Run this after the reset loop, with the server connected as `windows-vm`:

```text
You are testing a Windows app on a clean VM through the windows-vm MCP server.
1. Take a screenshot and confirm the desktop is visible and no other apps are open.
2. Launch Notepad, type "utm test run", take a screenshot, and close it without saving.
3. Output a table: step, expected result, actual result, PASS or FAIL.
Do not use the PowerShell or Registry tools. If any step fails, stop and report the error text.
```

For a failure you want to show someone, a short screen recording beats ten screenshots. [Subclip](subclip:inline-test-recording) can connect MCP servers inside its AI video editor, which makes cutting that recording to the failing step quick.

## FAQ

### Does UTM have an MCP server?

Not that I found. In this setup the MCP server runs inside Windows, and UTM is the VM host you control with `utmctl` or AppleScript. "UTM MCP server" here means a Windows MCP server running in a UTM VM.

### Which UTM network mode should I use for MCP?

Shared Network. The Mac and the guest reach each other with no setup, and the port stays off your LAN. Use Bridged only if other machines must reach the VM.

### Can I reset the VM between test runs?

Yes, with a snapshot. Take one when the VM is clean and the server is running, then restore it before each run. The UTM docs list `utmctl snapshot restore`, though I have not run it on Windows.

### Is Windows 11 ARM or x86 better on Apple Silicon?

ARM64. UTM's own guide says arm64 is for Apple Silicon, and x86 emulation defaults to a single core. My install and tests used ARM64.

### Can UTM start the VM automatically?

I have not set this up. The docs show `utmctl start`, so a login script or launch agent running it is the likely route. Windows also needs automatic sign-in for the server's login task to run.

## Next steps

If you run more than one hypervisor, or want this in CI, read [How to set up a virtual machine MCP server for Windows test automation](/blogs/virtual-machine-mcp-server-windows-test-automation). The Linux and macOS versions of this rig are [Linux in UTM](/blogs/utm-mcp-server-linux-test-automation) and [macOS in UTM](/blogs/utm-mcp-server-macos-test-automation). The Windows install is in [the pillar guide](/blogs/windows-mcp-server-for-mac-utm-vm).
