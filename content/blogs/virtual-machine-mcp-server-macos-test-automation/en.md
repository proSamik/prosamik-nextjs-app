---
title: How to Set Up a Virtual Machine MCP Server for macOS Test Automation
seoTitle: How to Run macOS Tests with a Virtual Machine MCP Server
description: Compare UTM, Tart, Parallels, VMware Fusion and Lume for macOS guests, then build a repeatable golden image and test loop for an agent with an MCP server.
category: VM test automation
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 8
readTime: 12 min
primaryKeyword: virtual machine mcp server
keywords: [tart macos vm, macos vm golden image, lume macos vm, parallels macos vm mcp, macos ci virtual machine, ai agent test automation macos]
related: [utm-mcp-server-macos-test-automation, macos-mcp-server-computer-use, virtual-machine-mcp-server-windows-test-automation, virtual-machine-mcp-server-linux-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers and has a macOS app, handy for cutting recorded agent runs into evidence clips when a test fails.
rankizzBlurb: Rankizz tracks keywords and AI-search citations for guides like this one, with a web app, a REST API and an MCP server.
---

This guide shows you how to build a repeatable macOS test setup for AI agents: pick a hypervisor, prepare a golden image with a macOS MCP server, clone a fresh VM per run, and collect evidence. It is the CI-minded companion to the hands-on [UTM walkthrough](/blogs/utm-mcp-server-macos-test-automation), which covers one VM and one human.

I have not run this setup yet. Commands and product facts come from upstream docs, checked on 2026-11-17. Where a source was silent or conflicting, I say so.

## Quick answer

1. Pick a hypervisor that supports macOS guests on Apple Silicon. Tart is the most script-friendly; UTM is the easiest GUI.
2. Build one golden VM: macOS, a throwaway user, SSH on, a macOS MCP server installed.
3. Grant Accessibility and Screen Recording once in the guest GUI, then save that VM as the golden image.
4. For every run, clone the golden image, boot it, get its IP, and connect your agent over an SSH tunnel.
5. Run a scoped test prompt, save screenshots as evidence, then delete the clone.

## Know the constraints for every macOS guest

These limits apply whichever hypervisor you choose, because they come from Apple, not the tool.

- **Apple Silicon host.** The UTM docs state macOS guests need an Apple Silicon host. Tart also lists Apple Silicon as a requirement (macOS 13 or later).
- **Two concurrent macOS VMs per Mac.** An Apple DTS engineer says on the developer forums that the Virtualization framework has a hard cap of two, and a third guest fails to start. That limits parallel agent runs per machine to two. Verify against the current licence if you scale.
- **Licence purpose.** The macOS licence permits virtual copies for software development, testing during development, macOS Server and personal use. I did not read the current text myself, and sources note commercial use is a grey area. Read Apple's licence for your macOS version.
- **Permissions are manual.** See the section on golden images below.

## Choose a hypervisor

For macOS guests, the practical choice is between four tools, plus one to avoid. Here is what I could confirm.

| Tool | macOS guest on Apple Silicon | Automation surface | Cost and licence notes |
|---|---|---|---|
| UTM | Yes, via Apple Virtualization (needs Apple Silicon host, macOS 12+) | GUI first. Snapshots and disposable mode for macOS guests need macOS 27+ | Not verified here, check the UTM site |
| Tart (cirruslabs/tart) | Yes. OCI images from registries | `tart clone`, `tart run`, `tart ip`; install with `brew install openai/tools/tart` | Licence changed. Older Fair Source terms had a 100-core limit; a newer licence is reported but I could not confirm it. Read the LICENSE in the repo |
| Parallels Desktop | Yes | `prlctl` command line needs Pro or Business edition | Paid subscription |
| VMware Fusion | Weak. Broadcom's KB says VMware will not commit to supporting new macOS releases as a guest | Not recommended for macOS guests | Free for personal use reported, not verified |
| Lume (trycua/cua) | Yes, built on Apple's Virtualization.Framework | CLI to create, run and SSH into macOS VMs | MIT for Lume per the repo README |

Pick by workflow:

- **Local, occasional, with a GUI:** UTM.
- **Repeatable, scripted, CI-like:** Tart or Lume.
- **You already pay for Parallels and want `prlctl`:** Parallels Pro.
- **Fusion:** only if you need a different guest type. Do not plan on macOS guests there.

## Design the architecture

The agent stays on the host. The macOS MCP server runs in the guest. They talk over an SSH tunnel.

```text
Host Mac
├── agent (Claude Code / Cursor)
├── hypervisor (Tart / UTM / Lume)
└── ssh -L 8000:localhost:8000 admin@<guest-ip>
        │
        ▼
Guest macOS (fresh clone)
├── macos-mcp serve --host localhost --port 8000
└── app under test
```

Keep the server bound to `localhost` inside the guest. The tunnel is the only path in. This is the same pattern as the Windows version in [virtual machine MCP server for Windows](/blogs/virtual-machine-mcp-server-windows-test-automation), except there the server was reachable on the VM's address, which is why locking it down matters.

## Build the golden image

The golden image is a macOS VM with everything installed and permissions already granted, so each run starts from a known state.

With Tart, the documented steps are:

```bash
brew install openai/tools/tart
tart clone ghcr.io/cirruslabs/macos-tahoe-base:latest golden
tart run golden
```

The README example image is about 25 GB. Tart's docs say all its images use the user `admin` with password `admin` for GUI and SSH login. Change that on any image you keep, because those credentials are public.

Inside the guest, enable Remote Login (System Settings > General > Sharing), then install the server:

```bash
ssh admin@$(tart ip golden)
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx macos-mcp serve
```

`tart ip` returns the guest's address when it is running and accepting SSH, and `ssh admin@$(tart ip tahoe-base)` is the pattern from Tart's quick start.

### What you can and cannot pre-grant

Accessibility and Screen Recording have to be approved in the guest GUI once. Do that in the VM window or through Screen Sharing: open System Settings > Privacy & Security and enable both for the app that launches the MCP server.

What I could verify:

- macOS stores these grants under TCC and ties them to an app's signature and identity.
- MDM privacy profiles (PPPC) can pre-approve some services such as Accessibility. Screen Recording, per sources I found, only allows "standard user approval", so it is not silently grantable.
- I found no supported command-line grant for either permission. `tccutil` only resets.
- Editing the TCC database by script is reported for camera and microphone, not Screen Recording, and I would not build on it.

So the sane pattern is: grant manually once, then save the VM. Every clone inherits the grants. If you change the launching app (a different terminal or a re-signed binary), the grant may no longer apply and you need a new golden image.

Headless gotcha from Tart's FAQ: since macOS 15, a VM will not start without an unlocked login keychain. Their two workarounds are to log in through the GUI once (via Screen Sharing), or to create and unlock the keychain from the terminal with `security` commands.

## Run one clone per test

Clone, boot, tunnel, test, delete. This is the loop to script.

```bash
tart clone golden run-001
tart run run-001 &
sleep 30
IP=$(tart ip run-001)
ssh -N -f -L 8000:localhost:8000 admin@$IP
```

Then start the server in the guest and register it with your agent:

```bash
ssh admin@$IP 'uvx macos-mcp serve --transport streamable-http --host localhost --port 8000' &
claude mcp add --transport http macos-vm http://localhost:8000/mcp
```

Tart's docs do not describe a headless flag in the pages I fetched, so check `tart run --help` for graphics options before running this on a server with no display. The fixed `sleep` is a placeholder; poll `tart ip` instead.

When the run ends:

```bash
tart stop run-001
tart delete run-001
```

You should see the clone gone and the golden image untouched. Tart's docs did not cover `stop` and `delete` in the pages I read, so confirm with `tart --help`.

## Design tests an agent can run

A good agent test is short, scoped and has an unambiguous pass condition. Long open-ended tests are where flakiness lives.

- One goal per test: "create a project and see the success banner", not "explore the app".
- Name the server in the prompt, so the agent does not touch the host.
- State the pass signal in words the UI shows ("a banner reading Project saved").
- Require a screenshot at each assertion, not just at the end.
- Tell the agent to stop on password or authentication dialogs. These MCP servers cannot drive them.

```text
Use only the macos-vm MCP server.
1. Take a screenshot and list windows.
2. Launch MyApp, create a project named "run-001", and save it.
3. Verify the text "Project saved" is visible. Screenshot it.
4. Report PASS or FAIL per step with what you saw.
If a system dialog blocks you, stop and say which one.
```

## Capture evidence

Treat screenshots and the agent's step log as your test artifacts, and store them outside the VM before you delete it. Copy files out with `scp` or write them to a host directory the agent controls.

If you want video, record the VM window on the host. [Subclip](subclip:inline-test-recording) is an AI video editor that can connect MCP servers and has a macOS app, so a recorded run can be trimmed down to the failing step.

## Reduce flakiness

Most flaky agent tests come from timing and state, not from the model.

- Always start from a fresh clone, never a reused one.
- Wait for text, not fixed delays. Ask the agent to confirm an element exists before acting.
- Pin the macOS version and the app build in the golden image.
- Fix the display resolution, since coordinate-based clicks depend on it.
- Disable screen saver and sleep in the guest.
- Re-run a failure once on a fresh clone before calling it a regression.

## Troubleshooting

| Error or symptom | Cause | Fix |
|---|---|---|
| A third macOS VM fails to start | Virtualization framework two-VM cap | Run at most two clones at a time |
| `tart ip` returns nothing | VM not booted or Remote Login off | Wait for boot, enable Remote Login in the guest |
| `Permission denied` on SSH | Wrong user or password | Tart images use `admin` / `admin`; use keys on your own images |
| VM will not start headless on macOS 15+ | No unlocked login keychain | Log in once via GUI or unlock the keychain with `security` (Tart FAQ) |
| Screenshot blank or clicks ignored in a clone | Permissions not granted before saving the image | Grant in the guest GUI, then re-save the golden image |
| Permissions vanish after updating the server | Launching app or signature changed | Re-grant and rebuild the image |
| `permission_denied` from a server | OS permission missing | Restore the permission and restart the server |
| Fusion guest will not support the new macOS | Broadcom does not commit to new macOS guests | Use UTM, Tart, Parallels or Lume |

## Security

The clone is disposable, but the golden image and the host are not, so protect them.

- Never put your Apple ID, real accounts, or secrets in the golden image.
- Change the default `admin` password on any image you keep.
- Bind the MCP server to `localhost` in the guest and use an SSH tunnel. Never expose the port.
- Do not share host folders or the clipboard unless a test needs them.
- Limit Remote Login to one user with key auth.
- Delete clones after each run so no test data lingers.
- Keep the agent's server list narrow, so a prompt cannot reach your host.

## FAQ

### Which hypervisor should I use for macOS test automation?
Tart or Lume for scripted, repeatable runs, UTM for a GUI-driven setup, Parallels if you already have the Pro edition for `prlctl`. VMware Fusion is a poor choice for macOS guests.

### Can I pre-grant Accessibility and Screen Recording in a golden image?
You can grant them once by hand in the guest GUI and save the image, so clones inherit them. I found no supported command-line grant, and MDM profiles cannot silently grant Screen Recording.

### How many macOS VMs can run in parallel on one Mac?
Two. The Virtualization framework refuses a third, per an Apple DTS engineer on the developer forums.

### Do I need a different golden image per macOS version?
Yes. Build one per macOS version and app build you test against, and re-grant permissions in each.

### Can the same setup test Windows and Linux apps?
The structure is the same, with a different MCP server per guest. See the [Windows](/blogs/virtual-machine-mcp-server-windows-test-automation) and [Linux](/blogs/virtual-machine-mcp-server-linux-test-automation) versions.

## Next steps

Start with one VM in [UTM](/blogs/utm-mcp-server-macos-test-automation), then promote it to a golden image. For the server itself, see [how to set up a macOS MCP server](/blogs/macos-mcp-server-computer-use). When your own write-up goes live, [Rankizz](rankizz:inline-guide-tracking) can track whether it ranks and gets cited by AI search.
