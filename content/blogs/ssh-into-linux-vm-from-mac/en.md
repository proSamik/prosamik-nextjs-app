---
title: How to SSH into a Linux VM from a Mac
description: Install OpenSSH on Ubuntu, find the VM IP, log in from macOS with ed25519 keys, harden sshd, and tunnel to an MCP server bound to localhost.
category: Remote access
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 11
readTime: 8 min
primaryKeyword: ssh into linux from mac
keywords: [ssh into linux vm from mac, ubuntu openssh server, ssh-copy-id mac, ssh tunnel mcp, utm ubuntu ssh, ssh config mac]
related: [linux-mcp-server-ubuntu-desktop-control, utm-mcp-server-linux-test-automation, ssh-into-windows-vm-from-mac, rdp-from-mac-to-linux]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, useful for turning a terminal-and-desktop screen recording of a remote Linux session into a short walkthrough.
rankizzBlurb: Rankizz tracks keyword rankings and AI-search citations via web app, REST API and MCP, so you can see if a how-to like this gets found.
---

This guide gets you from a fresh Ubuntu machine to `ssh linux-vm` working from your Mac with a key, no password, and an SSH tunnel to an MCP server that only listens on localhost. It applies to a UTM guest, any other VM, or a dedicated Ubuntu box.

The commands come from Ubuntu's OpenSSH documentation and standard OpenSSH tools, checked 2026-11-17. I have not run this on a Linux VM myself. I did SSH into my Windows 11 UTM guest; that is covered in [SSH into a Windows VM from a Mac](/blogs/ssh-into-windows-vm-from-mac).

## Quick answer

1. On Ubuntu: `sudo apt install -y openssh-server && sudo systemctl enable --now ssh`
2. Find the IP: `ip -br addr`
3. On the Mac: `ssh-keygen -t ed25519` then `ssh-copy-id user@IP`
4. Log in with `ssh user@IP`
5. Disable password login with a file in `/etc/ssh/sshd_config.d/`
6. Tunnel an MCP server: `ssh -N -L 5200:127.0.0.1:5200 user@IP`

## Step 1: Install the SSH server on Ubuntu

Ubuntu Desktop does not always ship an SSH server. Install it and start it at boot. The service name on Ubuntu is `ssh`, not `sshd`.

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
systemctl status ssh --no-pager
```

You should see `active (running)`. If a login later says `Connection refused`, this step is the usual cause.

## Step 2: Find the VM IP address

```bash
ip -br addr
```

Look for the line with state `UP` and an address such as `192.168.64.x/24`. In UTM with Shared Network, the guest is typically on `192.168.64.x`; my Windows guest was in the same `192.168.64.x` range. You can also run `utmctl ip-address "Ubuntu"` on the Mac, which UTM's docs list, though I could not check its output format. UTM's network page says Shared Network lets the host and guest reach each other directly. A Host Only network blocks internet access, and Bridged puts the VM on your LAN.

## Step 3: SSH in from the Mac

macOS ships with `ssh`. Use the username you created in Ubuntu.

```bash
ssh <user>@<vm-ip>
```

On first connection you will see a fingerprint prompt: `Are you sure you want to continue connecting (yes/no/[fingerprint])?`. Type `yes`. Then enter the password. You should land at the Ubuntu shell prompt.

## Step 4: Switch to key authentication

Keys are safer than passwords and let tools connect without prompts. Ubuntu's docs recommend ed25519.

On the Mac:

```bash
ssh-keygen -t ed25519 -C "mac-to-linux-vm"
ssh-copy-id <user>@<vm-ip>
ssh <user>@<vm-ip>
```

The last command should log you in without asking for the account password. It may ask for the key's passphrase if you set one. If it still asks for a password, check that `~/.ssh/authorized_keys` on the VM is not writable by others: `chmod go-w ~/.ssh/authorized_keys`.

## Step 5: Add a short alias in `~/.ssh/config`

```text
Host linux-vm
    HostName <vm-ip>
    User <user>
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30
```

Now `ssh linux-vm` works. Because UTM guest addresses can change after a reboot, update `HostName` if the connection times out.

## Step 6: Copy files with scp and rsync

```bash
scp ./app-build.tar.gz linux-vm:~/
rsync -avz --progress ./testdata/ linux-vm:~/testdata/
scp linux-vm:~/shots/final.png ./
```

`rsync` only sends changed files, so it is better for repeated test data. Both use the same SSH key.

## Step 7: Open the firewall only if you need to

Ubuntu usually has `ufw` inactive. Check it:

```bash
sudo ufw status
```

If it is `active`, allow SSH before you do anything else, or you can lock yourself out:

```bash
sudo ufw allow OpenSSH
```

With an SSH tunnel you do not open any MCP port at all.

## Step 8: Disable password login after the key works

Only do this after you have confirmed a key login in a second terminal. Ubuntu's docs use a drop-in file, which takes precedence over `sshd_config` because Ubuntu includes `sshd_config.d/*.conf` at the top and OpenSSH uses the first value it reads.

```bash
echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/50-no-password.conf
sudo sshd -t
sudo systemctl restart ssh
```

`sshd -t` prints nothing if the configuration is valid. Keep your current session open until a new login works. Optional extras: `PermitRootLogin no` and an `AllowUsers <user>` line.

## Step 9: Tunnel to an MCP server on localhost

A desktop-control MCP server should listen on `127.0.0.1` inside the VM. A local port forward lets the Mac reach it without opening anything on the network. For example, with `computer-use-linux` running with `--listen 127.0.0.1:5200` ([setup here](/blogs/linux-mcp-server-ubuntu-desktop-control)), run this on the Mac:

```bash
ssh -N -L 5200:127.0.0.1:5200 linux-vm
```

`-N` means no remote command, and `-L` forwards Mac port 5200 to port 5200 on the VM's loopback. Leave it running. In another Mac terminal:

```bash
curl -i http://127.0.0.1:5200/mcp
```

Upstream says a request without the bearer token returns `401`, which shows the tunnel reached the server. Then point your MCP client at `http://127.0.0.1:5200/mcp` with the bearer header. For a one-liner you can add `LocalForward 5200 127.0.0.1:5200` to the `linux-vm` host entry, then `ssh -N linux-vm`.

Using `ssh user@host computer-use-linux mcp` as a stdio launch is also possible in principle. I could not verify that it works for a desktop-control server, because the server needs the desktop session's `DISPLAY` and D-Bus variables.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ssh: connect to host <vm-ip> port 22: Connection refused` | `openssh-server` missing or stopped | `sudo apt install openssh-server`, `sudo systemctl enable --now ssh` |
| `ssh: connect to host ... port 22: Operation timed out` | Wrong IP, VM off, or `ufw` blocking | Recheck `ip -br addr`; `sudo ufw allow OpenSSH` |
| `Unit ssh.service could not be found` | `openssh-server` is not installed | `sudo apt install openssh-server` (the Ubuntu unit is named `ssh`) |
| `Permission denied (publickey)` | Key not installed, or permissions wrong | `ssh-copy-id`; `chmod 700 ~/.ssh`; `chmod 600 ~/.ssh/authorized_keys` |
| `REMOTE HOST IDENTIFICATION HAS CHANGED!` | VM was rebuilt or IP reused | `ssh-keygen -R <vm-ip>`, then reconnect |
| `bind [127.0.0.1]:5200: Address already in use` | Local port taken | Pick another local port, such as `-L 5201:127.0.0.1:5200` |
| Tunnel works but `curl` hangs | MCP server not running | Start it in the desktop session |
| Locked out after hardening | Password auth off, no working key | Use the VM console in UTM to fix the drop-in file |

## Security

SSH gives full shell access, so lock it down. A desktop-control MCP behind it can also click, type and read files.

- Use a throwaway user and a snapshot or clone you can roll back.
- Keep no real SSH keys, cloud credentials or browser sessions in the VM.
- Disable password login once keys work. Add a passphrase to the key.
- Never forward port 22 or the MCP port through a router or to the internet.
- Bind MCP servers to `127.0.0.1` and reach them only through `-L`.
- Do not use `-L 0.0.0.0:...` or `-g`, which expose the forwarded port to your network.

## FAQ

### How do I SSH into a Linux VM from a Mac?
Install `openssh-server` in the VM, find its IP with `ip -br addr`, then run `ssh user@IP` in macOS Terminal. Use `ssh-copy-id` to switch to key login.

### What is the SSH service called on Ubuntu?
It is `ssh` (`ssh.service`), so use `sudo systemctl enable --now ssh`, as Ubuntu's own docs do.

### Why is my UTM VM IP 192.168.64.x?
UTM's Shared Network mode puts the guest on a network the host routes directly, and that range is typical for it. UTM's docs describe the mode but do not state the range.

### Can I reach an MCP server on localhost from my Mac?
Yes, with `ssh -N -L 5200:127.0.0.1:5200 user@IP`. The Mac client then uses `http://127.0.0.1:5200/mcp`.

### Should I leave password login on?
Turn it off once key login works. Test a new session before you restart `ssh`.

## Next steps

Set up the server in [the Linux MCP server guide](/blogs/linux-mcp-server-ubuntu-desktop-control), or follow [the UTM guide](/blogs/utm-mcp-server-linux-test-automation). To see the desktop yourself, use [RDP from a Mac to Linux](/blogs/rdp-from-mac-to-linux).

If you write guides like this one, [Rankizz](rankizz:inline-guide-tracking) can track how they rank and get cited by AI search.
