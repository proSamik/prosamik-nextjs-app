---
title: How to Use RDP from a Mac to Control Linux
seoTitle: How to Use RDP from a Mac to Control a Linux Desktop
description: Set up xrdp with XFCE on Ubuntu, connect from macOS with Windows App, fix the black screen, and know when GNOME Remote Desktop or VNC fits better.
category: Remote access
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 12
readTime: 10 min
primaryKeyword: remote desktop mac to linux
keywords: [rdp from mac to linux, xrdp ubuntu, windows app mac linux, xrdp xfce, xrdp black screen, gnome remote desktop]
related: [vnc-vs-rdp, ssh-into-linux-vm-from-mac, linux-mcp-server-ubuntu-desktop-control, virtual-machine-mcp-server-linux-test-automation]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, so a recording of a remote Linux desktop session can be edited into a short demo or bug clip.
rankizzBlurb: Rankizz tracks keyword rankings and AI-search citations through a web app, REST API and MCP, which helps you see if a remote-access guide gets found.
---

This guide shows you how to see and use an Ubuntu desktop from your Mac over RDP: install `xrdp` and XFCE on Ubuntu, connect with Microsoft's Windows App, and fix the usual black screen. It is also the easiest way to give a headless Ubuntu box a desktop that an agent can control through an MCP server.

The commands come from Ubuntu and xrdp docs and community write-ups, checked 2026-11-17. I have not run this exact setup on Linux myself. Items I could not verify are labelled.

## Quick answer

1. On Ubuntu: `sudo apt install -y xfce4 xfce4-goodies xrdp`
2. `echo "xfce4-session" > ~/.xsession`
3. `sudo adduser xrdp ssl-cert && sudo systemctl enable --now xrdp && sudo systemctl restart xrdp`
4. Open port 3389 only if `ufw` is active: `sudo ufw allow 3389/tcp`
5. On the Mac, open Windows App, choose Add PC, enter the Ubuntu IP, and sign in with the Ubuntu username and password.
6. Make sure that user is not also logged in at the physical or console screen.

## What you need

You need an Ubuntu machine with a user that has a password, its IP address (`ip -br addr`), and a Mac on the same network. A UTM guest on Shared Network typically sits at `192.168.x.x`. SSH access ([SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac)) makes the setup easier, because you can paste commands from your Mac terminal.

RDP is a good fit when you want a native-feeling window with clipboard and dynamic resolution. If you need to see the existing local session instead, read the VNC section below.

## Step 1: Install xrdp and a lightweight desktop

xrdp is an open-source RDP server for Linux. It starts a new X11 desktop session for each login, which is why a light desktop such as XFCE is the reliable choice. XFCE with xrdp is also the pattern Microsoft's Ubuntu remote-desktop guidance uses.

```bash
sudo apt update
sudo apt install -y xfce4 xfce4-goodies xrdp
```

Pick `lightdm` or `gdm3` if the installer asks. It does not matter for xrdp, which does not use the login manager for remote sessions.

## Step 2: Tell xrdp to start XFCE

```bash
echo "xfce4-session" > ~/.xsession
```

Run this as the user who will log in remotely, not as root. xrdp's default `startwm.sh` looks for `~/.xsession` first. If you want GNOME instead, use an Xorg-based session. GNOME on xrdp is the most common source of black screens and extra dialogs, so I would only try it after XFCE works.

## Step 3: Fix the certificate permission and start the service

xrdp reads a TLS key under `/etc/ssl/private`. Adding the `xrdp` user to the `ssl-cert` group is the standard fix, as in most Ubuntu xrdp guides.

```bash
sudo adduser xrdp ssl-cert
sudo systemctl enable --now xrdp
sudo systemctl restart xrdp
systemctl status xrdp --no-pager
```

You should see `active (running)`. The server listens on TCP 3389.

## Step 4: Open the firewall if it is on

```bash
sudo ufw status
sudo ufw allow 3389/tcp
```

If `ufw` says `inactive`, skip the second command. If you can, restrict the rule to your Mac's address with `sudo ufw allow from <mac-ip> to any port 3389 proto tcp`. On UTM's Shared Network the Mac is the host side of the virtual network, but I have not checked its address. Look up the real one (for example with `ipconfig getifaddr` on the Mac) before you use it.

## Step 5: Connect with Windows App on the Mac

Microsoft's Windows App is the macOS app that replaced Microsoft Remote Desktop. Microsoft's overview page lists Windows App for macOS as able to connect to a remote PC, and says you can use it for remote PCs without signing in. Microsoft documents it for Windows devices. Connecting to xrdp on Linux is a standard RDP use that Microsoft does not document, so treat it as community-confirmed rather than officially supported.

1. Install Windows App from the Mac App Store.
2. Click `+`, then Add PC.
3. Enter the Ubuntu IP in PC name (the `<vm-ip>` you found with `ip -br addr`).
4. Save, then double-click the entry.
5. Accept the certificate warning on first connect.
6. In the xrdp login screen, choose `Xorg`, then enter the Ubuntu username and password.

You should see the XFCE desktop. The first login can take several seconds.

## Step 6: Fix clipboard and resolution

Clipboard and dynamic resolution are handled by the RDP channels. In Windows App, check the device settings for clipboard redirection and a resolution option such as dynamic resolution. Microsoft's overview lists custom display resolutions and dynamic resolution among Windows App features. If the clipboard stops working, log out and in again, since the clipboard helper runs per session.

## Use GNOME Remote Desktop instead (Ubuntu 24.04 and later)

Newer Ubuntu includes `gnome-remote-desktop`, which can share your existing desktop or provide a remote login. The upstream settings path for GNOME 46 is Settings, System, Remote Desktop. The Remote Login option runs as a system service and works over RDP only.

Headless remote login is still rough. A Launchpad bug on gnome-remote-desktop reports a headless RDP failure with Windows `mstsc` ending in a black screen (LP #2141992), and another reports a blank screen on 24.04 (LP #2089611). A package update, `gnome-remote-desktop 46.3-0ubuntu1.2` in January 2026, was reported to backport persistent headless sessions. I did not test any of this. For a server, xrdp with XFCE is the more predictable path today.

## When to prefer VNC

Choose VNC when you need to see exactly what is on the physical screen, or when the target runs Wayland and you cannot change it. RDP gives each user a separate session by default with xrdp, while VNC usually mirrors the one desktop. I compared them in [VNC vs RDP](/blogs/vnc-vs-rdp).

## Test it with an agent

Once you can log in, the same session can host a desktop-control MCP server. Start it from a terminal inside the xrdp session, because that is where the display lives ([Linux MCP server setup](/blogs/linux-mcp-server-ubuntu-desktop-control)). Then ask the agent:

```text
Using the linux-vm MCP server:
1. Call get_app_state and take a screenshot.
2. List windows and tell me which desktop environment is running.
3. Open the file manager and create a folder named rdp-test on the Desktop.
4. Take a screenshot and report pass or fail.
```

If you want to record the run for a bug report, [Subclip](subclip:inline-remote-session-clip) is an AI video editor that can connect MCP servers and can edit a screen recording into a short clip.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Black screen after login, then disconnect | Session start fails or the desktop is GNOME | Use XFCE with `~/.xsession`; check `~/.xsession-errors` and `/var/log/xrdp-sesman.log` |
| Black screen only if you are also logged in locally | The same user is already logged in on the console | Log out of the local session, or use a different user |
| Connection fails or times out | xrdp not running, wrong IP, or `ufw` blocks 3389 | `systemctl status xrdp`; `sudo ufw allow 3389/tcp` |
| Login screen appears but credentials loop | Wrong password, or `~/.xsession` owned by another user | Re-run the `.xsession` step as the right user |
| `Oh no! Something has gone wrong` (GNOME) | GNOME session cannot start in the xrdp environment | Use XFCE; this exact text is commonly reported, I did not reproduce it |
| Repeated "Authentication required to create a color managed device" prompts | polkit colord rule | Commonly reported with xrdp on Ubuntu; a polkit rule fixes it, which I did not verify |
| Certificate or key permission error in the xrdp log | `xrdp` cannot read the TLS key | `sudo adduser xrdp ssl-cert`, then restart xrdp |
| Clipboard does not sync | Session helper stopped | Log out and in; check the clipboard setting in Windows App |

## Security

RDP exposes a full interactive login, and a desktop-control MCP server inside it can click, type and read files. Keep both private.

- Use a throwaway Ubuntu user on a VM with a snapshot you can restore.
- Never forward port 3389 on your router or open it to the internet. RDP is a common attack target.
- If you need it across networks, tunnel it: `ssh -N -L 3390:127.0.0.1:3389 user@IP`, then connect Windows App to `127.0.0.1:3390`.
- Use a strong password, and keep no SSH keys, browser sessions or tokens in the VM.
- Bind any MCP server in the session to `127.0.0.1`.

## FAQ

### How do I remote desktop from a Mac to Linux?
Install `xrdp` on Ubuntu, set up an XFCE session, then connect with Windows App on the Mac using the Ubuntu IP. Log in with the Ubuntu username and password.

### Does Windows App work with xrdp?
Windows App connects to remote PCs over RDP, and xrdp speaks RDP. Microsoft documents it for Windows targets, so Linux use is community-confirmed, not officially documented.

### Why do I get a black screen with xrdp?
The usual causes are a desktop that does not start in xrdp (often GNOME), or the same user already logged in locally. Use XFCE via `~/.xsession` and log out of the console session.

### Should I use XFCE or GNOME for xrdp?
Start with XFCE. It is lighter and more predictable under xrdp. GNOME works for some setups, but it is the source of many reported black-screen cases.

### What port does xrdp use?
TCP 3389. Open it in `ufw` only for trusted addresses, or tunnel it over SSH.

## Next steps

Pair this with [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac) for safe access, and [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control) to let an agent drive the desktop. For a headless test target, see [the virtual machine guide](/blogs/virtual-machine-mcp-server-linux-test-automation), and for the protocol choice, [VNC vs RDP](/blogs/vnc-vs-rdp).

If you publish remote-access guides, [Rankizz](rankizz:inline-guide-tracking) can track their rankings and AI-search citations.
