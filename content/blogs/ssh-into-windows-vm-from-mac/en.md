---
title: How to SSH into a Windows VM from a Mac (OpenSSH Server on Windows 11)
seoTitle: How to SSH into a Windows VM from a Mac (OpenSSH Server)
description: Install OpenSSH Server on a Windows 11 VM, fix the stuck install and admin key gotchas, then SSH from your Mac to restart your MCP server and read logs.
category: Remote access
publishedAt: 2026-11-17
updatedAt: 2026-11-18
order: 10
readTime: 9 min
primaryKeyword: ssh into windows from mac
keywords: [ssh into windows from mac, openssh server windows 11, administrators_authorized_keys, ssh windows vm, scp windows mac, sshd service not found]
related: [windows-mcp-server-for-mac-utm-vm, utm-mcp-server-windows-test-automation, ssh-into-linux-vm-from-mac, rdp-from-mac-to-linux]
subclipBlurb: Subclip is an AI video editor that can connect MCP servers, useful when you want to turn a recorded remote debugging session into a short walkthrough.
rankizzBlurb: Rankizz tracks whether your published guides rank and get cited by AI search, via its web app, REST API and MCP server.
---

This guide gets you from a Mac Terminal into a Windows 11 VM over SSH, with key login, so you can restart the Windows MCP server and read its logs without opening the VM window. You need a Windows 11 VM the Mac can reach (mine is a UTM VM on the default `192.168.x.x` Shared Network) and an Administrator PowerShell inside it. I will say plainly where I stopped: on my VM the OpenSSH Server install hung, and my notes do not show it finishing. So the install section gives the documented steps, then a troubleshooting section for that exact stall. The commands come from Microsoft's OpenSSH docs.

## Quick answer

1. In Administrator PowerShell on Windows: `Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0`
2. `Start-Service sshd` then `Set-Service -Name sshd -StartupType 'Automatic'`
3. Check the firewall rule `OpenSSH-Server-In-TCP` exists (setup normally creates it).
4. On the Mac: `ssh <windows-user>@<vm-ip>`, accept the host key, enter the password.
5. Switch to key login. For an administrator account, put the public key in `C:\ProgramData\ssh\administrators_authorized_keys` and lock down its permissions with `icacls`.
6. Add a `~/.ssh/config` entry so you can type `ssh winvm`.

## Environment

| Item | Value |
|---|---|
| Host | MacBook, macOS, built-in OpenSSH client |
| Guest | Windows 11 ARM64 in UTM, Shared Network (a `192.168.x.x` address) |
| Windows OpenSSH | Feature on Demand `OpenSSH.Server~~~~0.0.1.0` |
| MCP server | windows-mcp, scheduled task `windows-mcp-server` |

## Step 1: Check what is installed

First check whether OpenSSH Server is already there. In an elevated PowerShell:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

My VM showed this: the client installed, the server missing.

```text
Name  : OpenSSH.Client~~~~0.0.1.0
State : Installed

Name  : OpenSSH.Server~~~~0.0.1.0
State : NotPresent
```

## Step 2: Install OpenSSH Server

Install the server as a Windows capability. Microsoft's docs give this command:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

Expected output per the docs:

```text
Path          :
Online        : True
RestartNeeded : False
```

On my VM this command sat on a progress bar for a long time. The capability downloads through Windows Update, so it can stall. The GUI route is **Settings, then System, then Optional features, then View features, then OpenSSH Server, then Add** (Microsoft's docs use the search term "Optional Features" on Windows 11). If yours stalls, go to Troubleshooting. Do not continue until the check in step 1 shows `Installed`.

## Step 3: Start sshd and open the firewall

Starting the service before the capability is installed fails. I ran `Start-Service sshd` too early and got this, which only means the install had not finished:

```text
Cannot find any service with service name 'sshd'
```

Once installed, run the commands from Microsoft's docs:

```powershell
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

if (!(Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
}
```

The docs say installing the server creates that rule for port 22 automatically. The `if` block just covers the case where it is missing.

## Step 4: Connect from the Mac with a password

Test with the password first so you know the service works. Use your Windows account name and the VM IP (`ipconfig` in Windows shows it):

```bash
ssh <windows-user>@<vm-ip>
```

You will be asked to trust the host key, then for your password. Per the docs the default shell is the Windows command prompt, so you will see something like `<user>@<pc-name> C:\Users\<user>>`. If you use a Microsoft account, the user name can differ from your email, so check `whoami` in Windows.

## Step 5: Make PowerShell the default shell

Set PowerShell as the default SSH shell if you want commands like `Get-Content` to work directly. The docs say to set the string value `DefaultShell` under `HKLM:\SOFTWARE\OpenSSH`, from an elevated PowerShell:

```powershell
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force
```

This applies to the server only. New sessions pick it up.

## Step 6: Set up key login

Keys avoid typing the password and let scripts connect. On the Mac, create a key if you do not have one:

```bash
ssh-keygen -t ed25519
```

Where the public key goes depends on the account type. A standard user uses `C:\Users\<user>\.ssh\authorized_keys`. A member of the Administrators group does not. Microsoft's docs say the file for administrators is `C:\ProgramData\ssh\administrators_authorized_keys`, and a key placed in the per-user file is ignored for them. This is the usual reason key login silently falls back to a password.

Copy the key over, from the Mac:

```bash
scp ~/.ssh/id_ed25519.pub <windows-user>@<vm-ip>:C:/Users/<windows-user>/mykey.pub
```

Then in an Administrator PowerShell on Windows, append it and fix the permissions. These are the commands from the docs, adapted to a local file:

```powershell
Add-Content -Force -Path "$env:ProgramData\ssh\administrators_authorized_keys" -Value (Get-Content "$env:USERPROFILE\mykey.pub")
icacls.exe "$env:ProgramData\ssh\administrators_authorized_keys" /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F"
Remove-Item "$env:USERPROFILE\mykey.pub"
```

The docs say that file must only have entries for `SYSTEM` and `Administrators`, with `SYSTEM` at full control. On a non-English Windows, group names differ, so the docs suggest the SID form `*S-1-5-32-544` for Administrators. I have not run this key setup on my VM, because my install did not finish.

## Step 7: Add an SSH config entry

A config entry shortens everything. On the Mac, edit `~/.ssh/config`:

```text
Host winvm
    HostName <vm-ip>
    User <windows-user>
    IdentityFile ~/.ssh/id_ed25519
```

Now `ssh winvm` works, and so does `scp file.txt winvm:C:/Users/<windows-user>/`. If the VM IP changes between boots, update `HostName` here.

## Step 8: Use SSH to manage the MCP server

This is why I wanted SSH: restart the Windows MCP server and read its logs from the Mac. With the PowerShell default shell, these run directly. The task name and log paths are the ones the `windows-mcp install` command created on my VM.

```bash
ssh winvm 'Get-ScheduledTask -TaskName "windows-mcp-server"'
ssh winvm 'Stop-ScheduledTask -TaskName "windows-mcp-server"; Start-ScheduledTask -TaskName "windows-mcp-server"'
ssh winvm 'Get-Content "$env:USERPROFILE\.windows-mcp\server.log" -Tail 50'
ssh winvm 'Get-Content "$env:USERPROFILE\.windows-mcp\server.error.log" -Tail 50'
```

Then confirm from the Mac: `curl -v http://<vm-ip>:8000/mcp` should return `400 Bad Request: Missing session ID`. The full server setup is in [the Windows MCP server guide](/blogs/windows-mcp-server-for-mac-utm-vm). One caution from the docs: a session opened with key authentication has no user credentials, so it cannot authenticate outward as you. That is fine for these commands. A task can behave differently from an interactive session, so check the result with `curl`.

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| `Add-WindowsCapability` sits on a progress bar | The Feature on Demand downloads via Windows Update, which stalls or is slow | Wait several minutes. Try the Optional features screen instead. Check connectivity with `Test-NetConnection windowsupdate.microsoft.com -Port 443`. If it keeps failing, reset the update services or use the portable build below. |
| `Cannot find any service with service name 'sshd'` | The server capability is not installed yet | Re-run the step 1 check. Start the service only when it shows `Installed`. |
| `Connection refused` from the Mac | `sshd` is not running | `Start-Service sshd` on Windows. |
| `ssh` hangs and times out | Firewall rule missing, or wrong IP | Check the `OpenSSH-Server-In-TCP` rule, and check the IP with `ipconfig`. |
| Asked for a password although a key is set up (admin account) | Key is in the user file, or the `icacls` permissions are wrong | Use `C:\ProgramData\ssh\administrators_authorized_keys` and run the `icacls` command. |
| Commands print `'Get-Content' is not recognized` | The default shell is still `cmd.exe` | Set `DefaultShell` as in step 5. |

The last four rows come from Microsoft's docs and general experience, not from errors I saw in my own session.

If the Feature on Demand never installs, there is another route: Microsoft maintains a portable build of OpenSSH, [Win32-OpenSSH](https://github.com/PowerShell/Win32-OpenSSH/releases). The release page lists `OpenSSH-ARM64.zip` and `OpenSSH-Win64.zip` plus MSI installers. I have not installed it. Check the project wiki for how to register the service before using it.

## Security

SSH gives full shell access to the VM, which is more than the MCP server gives. Keep port 22 on the UTM Shared Network and do not forward it through your router. Use key login and, once keys work, consider turning off password login in `C:\ProgramData\ssh\sshd_config` (restart `sshd` after editing). Use a throwaway Windows user, not your daily account. Take a snapshot before you change anything. To turn it off, run `Stop-Service sshd`, `Set-Service -Name sshd -StartupType 'Disabled'`, and disable the firewall rule with `Disable-NetFirewallRule -Name 'OpenSSH-Server-In-TCP'`. Remember the MCP server from the other guide is a separate port, 8000, and if you started it with `--allow-insecure-remote` it has no authentication at all.

## Test it with an agent

If your agent can run shell commands on the Mac, you can hand it the SSH config entry. Paste this:

```text
Using only the shell and the SSH host alias "winvm":
1. Run: ssh winvm 'Get-ScheduledTask -TaskName "windows-mcp-server"' and report its State.
2. Run: ssh winvm 'Get-Content "$env:USERPROFILE\.windows-mcp\server.error.log" -Tail 20' and summarise any errors.
3. If the task is not Running, run Start-ScheduledTask for it over SSH, wait 10 seconds,
   then run: curl -s -o /dev/null -w "%{http_code}" http://<vm-ip>:8000/mcp
   and report whether the code is 400.
Do not change any other setting on the VM.
```

## FAQ

### How do I enable SSH on Windows 11?

Install the OpenSSH Server optional feature, then start the `sshd` service and set it to start automatically. In PowerShell that is `Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0` followed by `Start-Service sshd`.

### Why does key login still ask for a password on Windows?

If your account is an administrator, Windows reads `C:\ProgramData\ssh\administrators_authorized_keys`, not the file in your user folder. That file also needs permissions limited to `Administrators` and `SYSTEM`, set with `icacls`.

### Why can't I find the sshd service?

The OpenSSH Server capability is not installed. Check with `Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'`. The server must show `Installed`.

### Can I use scp to copy files to Windows from a Mac?

Yes. `scp file.txt winvm:C:/Users/<user>/` copies a file once SSH works. Use forward slashes in the Windows path.

### Should I expose SSH on Windows to the internet?

No. Keep it on a host-only or shared VM network. Never forward port 22 to a throwaway test VM.

## Next steps

With SSH working, you can restart and debug the MCP server from the Mac. The server setup is in [How to set up a Windows MCP server on a Mac](/blogs/windows-mcp-server-for-mac-utm-vm), and the test workflow is in [the UTM test automation guide](/blogs/utm-mcp-server-windows-test-automation). For a Linux guest, see [SSH into a Linux VM](/blogs/ssh-into-linux-vm-from-mac) and [RDP from a Mac to Linux](/blogs/rdp-from-mac-to-linux).
