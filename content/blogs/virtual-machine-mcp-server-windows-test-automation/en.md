---
title: How to Set Up a Virtual Machine MCP Server for Windows Test Automation
seoTitle: How to Run Windows Tests with a Virtual Machine MCP Server
description: A hypervisor-agnostic way to let an agent test Windows apps: architecture, test-case design, golden images, what runs where, and the limits of GUI agents.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 7
readTime: 11 min
primaryKeyword: virtual machine mcp server
keywords: [virtual machine mcp server, windows vm test automation, ai agent gui testing, golden image, parallels vs utm vs vmware fusion, hyper-v mcp]
related: [windows-mcp-server-for-mac-utm-vm, utm-mcp-server-windows-test-automation, virtual-machine-mcp-server-linux-test-automation, virtual-machine-mcp-server-macos-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, so a failing agent test can become a short clip you attach to the bug report.
rankizzBlurb: Rankizz tracks whether your published guides rank and get cited by AI search, via its web app, REST API and MCP server.
---

This guide is about designing the test setup, not installing one tool. You will end up with a layout that works on any hypervisor: the agent runs on a host, talks MCP over HTTP to a server inside a Windows VM, restores a known-good image before every run, and produces a pass/fail report with screenshots as evidence. The one install I actually ran was Windows-MCP in UTM on a Mac. For that, see [the install guide](/blogs/windows-mcp-server-for-mac-utm-vm). UTM-specific controls are in [the UTM post](/blogs/utm-mcp-server-windows-test-automation). Here I stay at the level that carries over to Parallels, VMware Fusion, Hyper-V or a cloud VM.

## Quick answer

1. Pick a hypervisor that gives you a CLI for start, stop and snapshot, and a network the host can reach.
2. Build one golden Windows image: OS, app under test, MCP server set to start at login, a throwaway user, snapshot taken.
3. Run the agent on the host, not in the VM. It connects to `http://<vm-ip>:<port>/mcp`.
4. For every run: restore the golden image, boot, wait until the server answers, run a deterministic prompt, save the report and screenshots, stop.
5. Treat a failure as a result that needs a human look, not as a verdict. Re-run once before you believe it.

## The architecture

The agent host calls MCP over streamable HTTP, and the server in the VM does the clicking.

```text
agent host (Mac, CI runner)
   |  MCP over streamable HTTP  (http://<vm-ip>:8000/mcp)
   v
Windows VM (golden image, restored each run)
   |  Windows-MCP server: Screenshot, Click, Type, App ...
   v
app under test
```

Why the agent stays on the host: it holds your credentials, your repo and your model access. The VM should hold none of that. The VM holds the app and a desktop. The agent never needs to log in to the VM except through the MCP tools.

I ran exactly this with a MacBook host, UTM, and a Windows 11 ARM guest on UTM's Shared Network (a `192.168.x.x` address). The server was `windows-mcp 0.8.9` on port 8000, and a GET to `/mcp` returned `400 Bad Request: Missing session ID`, which is how I knew the path from host to VM worked. Anything below about other hypervisors comes from general knowledge and vendor docs, not from my runs.

## Pick a hypervisor

Choose by what you need to automate and where the host runs, not by brand.

| Option | Good for | Watch out for |
|---|---|---|
| UTM (Mac) | Free, Windows 11 ARM on Apple Silicon, `utmctl` for scripting | x86 Windows is emulated and slow. I ran UTM. |
| Parallels Desktop (Mac) | Polished, good Windows support, has a command-line tool | Paid. I have not used it for this. |
| VMware Fusion (Mac) | Familiar VM workflow, command-line tooling | Licensing. I have not used it for this. |
| Hyper-V (Windows host) | Windows host or CI runner, checkpoints | Needs a Windows host. Not tested by me. |
| Cloud Windows VM | Repeatable, no local resources, runs in CI | Costs money while running, and the network needs real locking down. Not tested by me. |

Whatever you choose, check four things in its docs before committing: can I start and stop from a script, can I snapshot and restore from a script, can the host reach a port in the guest, and does it run the Windows architecture my app needs. If the answer to any of those is "only from the GUI", the rig will not run unattended.

## Design the golden image

A golden image is a snapshot you never test inside. Every run starts from a copy of it, so build it carefully and keep it small.

- A fresh Windows with the app under test installed but never launched, unless the test is about a first launch.
- The Windows MCP server set to start at login. On my VM I did this with `windows-mcp install`, which creates a scheduled task named `windows-mcp-server`.
- Automatic sign-in for a throwaway local user, otherwise a login task never fires after a cold boot.
- Updates paused, so a Windows update cannot start mid-test.
- No personal accounts, no browser sign-ins, no secrets.

Then snapshot or export it, and name it with a date. When the app or the server version changes, build a new image rather than patching the old one.

## What to run in the VM and what to run on the host

Put only the things that must see the Windows desktop inside the VM.

| In the VM | On the host |
|---|---|
| The app under test | The agent and the model credentials |
| The MCP server | The test prompts and expected results |
| Test input files the app opens | The report, screenshots and logs |
| Nothing else | Hypervisor control (start, stop, restore) |

The server can also run PowerShell and edit the registry in the VM. Windows-MCP lists tools like `PowerShell`, `FileSystem` and `Registry`. For UI tests you rarely need them, and upstream documents `--exclude-tools` to switch tools off. I have not run that flag, so test it before you rely on it. Fewer tools also means fewer ways for the agent to wander.

## Write test cases an agent can run

A good agent test is a script with checks, not a goal. Vague goals produce different runs each time.

- Give numbered steps. "Click Save" beats "save the file".
- State the expected result for each step in words the screen can confirm: the title bar text, a message, a file name.
- Ask for a screenshot after every step that matters, and for the final state.
- Tell it what it must not do: no PowerShell, no installing software, no clicking outside the app.
- Require a structured result: a table of step, expected, actual, PASS or FAIL.
- Tell it to stop at the first failure and report the error text.

Screenshots are the evidence. A PASS from an agent without a screenshot is a claim. A PASS with a screenshot of the success message is something a person can check in five seconds.

## The run loop

The loop is the same on every hypervisor. Only the three hypervisor lines change.

```bash
# 1. restore golden image and boot (hypervisor-specific)
restore_golden && start_vm

# 2. wait for the server, with a timeout
IP=<vm-ip>
for i in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://$IP:8000/mcp)" = "400" ] && break
  sleep 5
done

# 3. run the agent against the MCP server, save the report
run_agent_test tests/save-file.md > reports/save-file.md

# 4. stop (hypervisor-specific)
stop_vm
```

The `400` check is the readiness gate. It is what my server returned for a plain GET when it was healthy. If your server version answers differently, use whatever your build returns. The hypervisor lines are yours to fill in. Parallels, VMware Fusion and Hyper-V each ship a command-line tool or cmdlets for snapshots, but I have not run them, so read their docs for the exact commands. For UTM the docs list `utmctl snapshot restore`, covered in [the UTM post](/blogs/utm-mcp-server-windows-test-automation).

## Limits and flakiness

An agent driving a GUI is slower and less certain than a unit test, so budget for it.

- It can misread the screen or click the wrong thing, so run important checks twice before you trust a failure.
- A modal dialog, a toast, or an update prompt can derail a run. The golden image should suppress the ones you can.
- Screen resolution and scaling change what the agent sees. Keep the VM display fixed.
- Timing varies. Use waits for a state ("wait until the Save dialog appears") instead of fixed sleeps. Windows-MCP lists `Wait` and `WaitFor` tools.
- It will not find a bug it was not told to look for. This is not exploratory QA.
- Cost and time grow with every screenshot, so keep each case short.

I have not measured how flaky this is on any app, and I will not invent a number. Measure your own: run the same case ten times and count.

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| Readiness loop never sees `400` | VM still booting, server task not started, or port blocked | Check the task `windows-mcp-server`, the firewall rule, and automatic sign-in. |
| `Microsoft Visual C++ 14.0 or greater is required` building `pyyaml` | ARM64 Windows with no prebuilt package | Use `uvx --python 3.12 --no-build-package cryptography ...`. |
| Same test passes, then fails | Flaky UI timing or a popup | Use wait-for-state steps, re-run once, fix the image. |
| Agent edits files it should not | Tools too broad | Exclude `PowerShell` and `Registry`, restore the golden image. |
| Run leaves the app in a bad state | You skipped the restore | Always restore before a run, never after a run only. |

## Security

The MCP port is a remote control for the whole VM. I started my server with `--allow-insecure-remote`, which means no authentication, so the isolation of the network is the only protection. In a CI or cloud setup, do not expose that port to the internet. Put the VM on a private network that only the agent host reaches, use a throwaway user, restore the golden image after every run, and keep secrets out of it. Upstream documents `--auth-key`, an IP allowlist and TLS options, which I have not run. For anything shared, read the Windows-MCP README and test them before trusting them. To stop the server, stop the scheduled task or run `windows-mcp uninstall`.

## Test it with an agent

Save this as `tests/save-file.md` and adapt the app name. It is written for a restored golden image.

```text
You are running test case SAVE-01 on a clean Windows VM, using only the windows-vm MCP tools.
Do not use PowerShell, FileSystem or Registry tools. Stop at the first failure.

1. Take a screenshot. Expected: desktop visible, no app windows open.
2. Launch Notepad. Expected: an empty untitled window.
3. Type "save-01". Expected: the text appears in the window.
4. Press Ctrl+S, type the file name "save-01.txt", press Enter. Expected: title bar shows save-01.txt.
5. Take a screenshot as evidence.

Finish with a table of step, expected, actual, PASS or FAIL, and the screenshot you took in step 5.
```

When a case fails, the evidence can be a recording. [Subclip](subclip:inline-failing-step-clip) is an AI video editor that can connect MCP servers, so you can trim a recorded run down to the failing step.

## FAQ

### What is a virtual machine MCP server?

It is an MCP server running inside a VM, so an agent outside the VM can control the guest OS desktop with tools. The VM contains the app, and the agent stays on the host.

### Which hypervisor is best for this?

The one that lets you start, stop and restore from a script and reach a port in the guest. I used UTM on a Mac. Parallels, VMware Fusion, Hyper-V and cloud VMs fit the same design, but I have not tested them for this.

### Should the agent run inside the VM?

No. Keep the agent on the host so credentials stay out of the VM, and connect it to the VM's MCP server over HTTP.

### Can I run this in CI?

The design supports it: restore image, boot, wait, run, report. I have only run it by hand on a Mac. A CI runner needs a VM it can control and a private network to it.

### How reliable are agent GUI tests?

Less than scripted tests. Treat a failure as something to confirm, re-run important cases, and keep evidence. I have no numbers, so measure on your own app.

## Next steps

Build the rig once on a single hypervisor. The Windows install is in [How to set up a Windows MCP server on a Mac](/blogs/windows-mcp-server-for-mac-utm-vm), and the UTM details are in [the UTM post](/blogs/utm-mcp-server-windows-test-automation). If your app also ships on other platforms, the same design applies to [Linux VMs](/blogs/virtual-machine-mcp-server-linux-test-automation) and [macOS VMs](/blogs/virtual-machine-mcp-server-macos-test-automation).
