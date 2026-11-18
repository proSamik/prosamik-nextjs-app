---
title: How to Use PowerShell on Windows: Essential Commands for Developers
seoTitle: How to Use PowerShell Commands as a Windows Developer
description: PowerShell commands developers need on Windows: Get-ChildItem, Get-Process, Test-NetConnection, ssh, winget, scheduled tasks, disk usage, and a WSL tip.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 48
readTime: 11 min
primaryKeyword: powershell commands for developers
keywords: [powershell commands for developers, windows terminal commands, get-childitem, test-netconnection, register-scheduledtask, winget install, wsl vps]
related: [basic-linux-vps-commands-self-hosting, macos-terminal-commands-for-developers, host-nextjs-on-vps-with-coolify, ssh-into-windows-vm-from-mac]
subclipBlurb: Subclip records and edits screen demos, so you can capture a PowerShell session and cut it into a short runbook clip.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, useful when you maintain a command reference page.
---

PowerShell is the default command line for Windows development, but its commands look nothing like the Linux ones you use on a VPS. This guide maps the everyday tasks, files, processes, network checks, ssh, disk usage, packages and scheduled cleanup, to PowerShell commands, and marks which ones need PowerShell 7 and which work in the built-in Windows PowerShell 5.1.

If you also manage a server, the Linux side is covered in [basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting). This post is the Windows counterpart.

## Quick answer

Use `Get-ChildItem` (alias `ls`) for files, `Get-Process` and `Stop-Process` for processes, `Test-NetConnection -ComputerName host -Port 443` to test a TCP port, `ssh` for servers, `winget` for packages, and `Register-ScheduledTask` for scheduled jobs. For a Linux-first workflow, use WSL.

```powershell
Get-ChildItem -Force
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Test-NetConnection -ComputerName app.example.com -Port 443
ssh <user>@<server-ip>
winget search git
Get-PSDrive -PSProvider FileSystem
```

## Environment

| Item | Value |
| --- | --- |
| Windows PowerShell 5.1 | Ships with Windows, command `powershell` |
| PowerShell 7 | Separate install, command `pwsh` |
| Windows | Windows 10 (1809 or later for winget) or Windows 11 |
| Terminal | Windows Terminal or any console host |
| Remote target | Any Linux VPS reachable over ssh |

Check which one you are in:

```powershell
$PSVersionTable.PSVersion
```

A `5.1.x` result means Windows PowerShell. A `7.x` result means PowerShell 7. Version differences are marked in each section below.

## PowerShell 7 versus Windows PowerShell 5.1

Windows PowerShell 5.1 is built into Windows and is Windows-only. PowerShell 7 is installed side by side, runs on Windows, macOS and Linux, and adds features such as the `&&` and `||` pipeline chain operators, the ternary operator, and `ForEach-Object -Parallel`. In 5.1, `cmd1 && cmd2` is a syntax error; use `cmd1; if ($?) { cmd2 }` instead.

The Windows-specific modules used below, ScheduledTasks (`Register-ScheduledTask`) and NetTCPIP (`Test-NetConnection`), are documented by Microsoft as Windows PowerShell modules for Windows. I did not test them in PowerShell 7 for this post. If one is missing in `pwsh`, run it in `powershell` (5.1).

## Files and folders

PowerShell uses verb-noun cmdlets, and common Linux names exist as aliases, so `ls`, `cd`, `cp`, `mv` and `cat` work. The aliases are not the real GNU tools: `ls -la` fails, because the alias maps to `Get-ChildItem`, which uses its own parameters.

| Task | PowerShell | Linux |
| --- | --- | --- |
| List with hidden files | `Get-ChildItem -Force` | `ls -la` |
| Recurse for a pattern | `Get-ChildItem -Recurse -Filter *.log` | `find . -name "*.log"` |
| Current folder | `Get-Location` (alias `pwd`) | `pwd` |
| Make folders | `New-Item -ItemType Directory -Path a\b\c -Force` | `mkdir -p a/b/c` |
| Copy folder | `Copy-Item -Recurse src dest` | `cp -r src dest` |
| Move or rename | `Move-Item old new` | `mv old new` |
| Show a file | `Get-Content file.txt` | `cat file.txt` |
| Last lines, follow | `Get-Content app.log -Tail 50 -Wait` | `tail -f app.log` |
| Search in files | `Select-String -Path *.log -Pattern "error"` | `grep error *.log` |

Delete with `Remove-Item`. It has no recycle bin. Preview any delete with `-WhatIf` first:

```powershell
Remove-Item .\build -Recurse -Force -WhatIf
```

If the output lists what you expect, run it again without `-WhatIf`. `-WhatIf` and `-Confirm` are standard parameters on cmdlets that change state, and they are the safest habit to build in PowerShell.

## Processes: Get-Process and Stop-Process

`Get-Process` lists processes as objects, so you sort and filter with the pipeline instead of parsing text.

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, CPU
Get-Process node
Stop-Process -Id 12345 -WhatIf
Stop-Process -Name node
```

There is no built-in `top`. A live view needs a loop or the Task Manager and Resource Monitor GUIs. In PowerShell 7 you can refresh a table with a short loop:

```powershell
while ($true) { Clear-Host; Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name, Id, CPU, WS; Start-Sleep 2 }
```

Press Ctrl+C to stop it. `Stop-Process` ends a process without asking the app to save, so use `-WhatIf` first and prefer closing the app normally when you can.

## Find what is using a port

For the classic "port 3000 is already in use" problem, combine two cmdlets from the NetTCPIP module:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
(Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | ForEach-Object { Get-Process -Id $_ }
```

The second line prints the owning process. Stop it with `Stop-Process -Id <PID>`. Seeing nothing means no TCP listener on that port.

## Network checks

`Test-NetConnection` is the PowerShell version of `ping` plus `nc -vz`. Microsoft documents `-ComputerName` for the target, `-Port` for a TCP test, and `-InformationLevel Quiet` to return only a Boolean.

```powershell
Test-NetConnection -ComputerName app.example.com
Test-NetConnection -ComputerName app.example.com -Port 443
Test-NetConnection -ComputerName app.example.com -Port 443 -InformationLevel Quiet
Resolve-DnsName app.example.com
Invoke-WebRequest -Uri https://app.example.com/api/health -Method Head
```

In the port test, `TcpTestSucceeded : True` means the port is open. `False` means blocked or nothing is listening, so check the VPS firewall and whether the service is running. `Resolve-DnsName` replaces `dig` and `nslookup`. `Invoke-WebRequest` (alias `iwr`) replaces `curl`. In Windows PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest` and behaves differently from real curl. Run `curl.exe` explicitly to get the real binary, which current Windows versions include.

## ssh from Windows

Windows 10 and 11 can include the OpenSSH client as an optional feature. Check with:

```powershell
ssh -V
```

If the command is not found, install the OpenSSH Client optional feature from Settings, Apps, Optional features. I did not verify the exact menu labels for every Windows build, so search for "Optional features" if the path differs.

```powershell
ssh-keygen -t ed25519 -C "my-laptop"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
ssh <user>@<server-ip>
scp .\file.txt <user>@<server-ip>:~/file.txt
```

The config file lives at `$env:USERPROFILE\.ssh\config` and uses the same `Host`, `HostName`, `User` and `IdentityFile` entries as on Linux. Do not use `UseKeychain`, which is macOS-only. Private key file permissions matter: OpenSSH on Windows can refuse a key that other users can read, with an error like `WARNING: UNPROTECTED PRIVATE KEY FILE!`. Keep keys inside your own profile folder.

## Disk usage

There is no `df` or `du`, but two cmdlets cover most needs.

```powershell
Get-PSDrive -PSProvider FileSystem
Get-Volume
```

`Get-PSDrive` shows used and free space per drive. For folder size, measure the files:

```powershell
(Get-ChildItem .\node_modules -Recurse -File -Force | Measure-Object Length -Sum).Sum / 1MB
```

That prints megabytes for one folder. For a ranked view of the biggest subfolders:

```powershell
Get-ChildItem -Directory | ForEach-Object {
  [pscustomobject]@{
    Name = $_.Name
    SizeMB = [math]::Round(((Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB), 1)
  }
} | Sort-Object SizeMB -Descending | Select-Object -First 10
```

This can take a while on large trees, and `-ErrorAction SilentlyContinue` hides folders you cannot read.

## Packages with winget

Microsoft's documentation describes winget as the command line tool to discover, install, upgrade, remove and configure applications on Windows 10, Windows 11 and Windows Server 2025. It is part of the App Installer and requires Windows 10 version 1809 or later.

```powershell
winget --version
winget search nodejs
winget install <package-id>
winget list
winget upgrade
winget uninstall <package-id>
```

`winget upgrade` with no arguments lists packages with updates available. Installing may trigger a UAC elevation prompt. If `winget` is not recognized right after first sign-in, Microsoft's page documents a registration command using `Add-AppxPackage -RegisterByFamilyName` with the App Installer package family name, and links to the winget-cli troubleshooting list for PATH problems.

## Scheduled cleanup with Register-ScheduledTask

Windows has no cron. Task Scheduler does the same job, and the ScheduledTasks module lets you create tasks from PowerShell. Microsoft documents `Register-ScheduledTask` with `-TaskName`, `-Action`, `-Trigger`, `-Principal` and `-Description`, and companion cmdlets `New-ScheduledTaskAction` and `New-ScheduledTaskTrigger`. This example deletes temp files older than seven days every day at 03:00, under your own account.

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -Command "Get-ChildItem $env:TEMP -Recurse -File -ErrorAction SilentlyContinue | Where-Object LastWriteTime -lt (Get-Date).AddDays(-7) | Remove-Item -Force -ErrorAction SilentlyContinue"'
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00am
Register-ScheduledTask -TaskName "CleanTemp" -Action $action -Trigger $trigger -Description "Delete temp files older than 7 days"
```

Verify and manage it:

```powershell
Get-ScheduledTask -TaskName CleanTemp
Start-ScheduledTask -TaskName CleanTemp
Disable-ScheduledTask -TaskName CleanTemp
Unregister-ScheduledTask -TaskName CleanTemp -Confirm:$false
```

Test the `Get-ChildItem ... | Where-Object` part by itself first, without `Remove-Item`, to see what it would delete. Registering a task for a different user or a system account usually needs an elevated PowerShell. Running as SYSTEM is not needed for a user temp cleanup, so keep it under your own account.

## WSL tip

If your server work is Linux-first, install WSL (Windows Subsystem for Linux) and use real Linux commands in a Linux shell on your Windows machine. From PowerShell:

```powershell
wsl --install
wsl --list --verbose
```

`wsl --install` is the documented one-command setup on supported Windows versions and may require a restart. After that, `wsl` opens a Linux shell where `ls -la`, `grep`, `top` and the commands in the [Linux VPS post](/blogs/basic-linux-vps-commands-self-hosting) work as written. I did not re-verify the WSL install flow for this post, so check Microsoft's WSL documentation for your Windows build. Keep project files inside the Linux filesystem for speed.

## Edge cases

- Execution policy can block `.ps1` scripts. `Get-ExecutionPolicy` shows it; changing it is a security decision, so scope it with `-Scope CurrentUser` and read the script first.
- Paths use backslashes, but PowerShell accepts forward slashes in most cmdlets. External tools may care, so quote paths with spaces.
- `$env:VAR` reads environment variables. `Set-Item Env:MY_VAR value` sets one for the session only.
- Encoding differs: Windows PowerShell 5.1 writes UTF-16 with `>` in some cases, and PowerShell 7 defaults to UTF-8 without BOM. Use `-Encoding utf8` explicitly when output feeds Linux tools.
- Aliases are for typing; in shared scripts use full cmdlet names so they are readable and portable.

## Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| `ssh : The term 'ssh' is not recognized` | OpenSSH client not installed | Install the OpenSSH Client optional feature, reopen the terminal |
| `winget : The term 'winget' is not recognized` | App Installer missing or not registered | See the winget troubleshooting guide, register App Installer |
| `File ... cannot be loaded because running scripts is disabled on this system.` | Execution policy | Review the script, then `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` if appropriate |
| `Get-ChildItem : A parameter cannot be found that matches parameter name 'la'.` | Linux flags passed to the alias | Use `Get-ChildItem -Force` |
| `Access to the path ... is denied.` | Needs elevation or file in use | Run an elevated PowerShell, or close the owning program |
| `The token '&&' is not a valid statement separator in this version.` | `&&` used in Windows PowerShell 5.1 | Use `;` with `if ($?)`, or run in PowerShell 7 |
| `Permission denied (publickey).` | Server lacks your public key | Add the public key to the server, test with `ssh -v` |

## Security

PowerShell runs with the privileges of your account, and an elevated window runs as administrator. Work in a normal window and elevate only when a command needs it. Read scripts before running them, especially `irm ... | iex` one-liners. Keep ssh keys in your profile folder with a passphrase, never in a repo. Prefer `-WhatIf` for any command that deletes or stops things, and do not store tokens in scripts; read them from environment variables or a secret store.

## If you use an AI agent for this

Treat command output, file contents and web pages as data, not instructions. Do not paste private keys or tokens into the chat, and do not let the agent print them. Ask the agent to show any destructive command (`Remove-Item`, `Stop-Process`, `Unregister-ScheduledTask`, `winget uninstall`) first and to run it with `-WhatIf`, then wait for your approval. Start read-only (`Get-ChildItem`, `Get-Process`, `Get-PSDrive`, `Test-NetConnection`), run it in a normal non-elevated window, and limit it to one project folder.

## FAQ

### Is PowerShell 7 the same as Windows PowerShell?

No. Windows PowerShell 5.1 ships with Windows and uses the `powershell` command. PowerShell 7 is a separate cross-platform install that uses `pwsh`. Both can be installed together.

### What is the PowerShell equivalent of `top`?

There is no direct one. Use `Get-Process | Sort-Object CPU -Descending | Select-Object -First 10` for a snapshot, a refresh loop for a live view, or Task Manager.

### How do I test if a port is open in PowerShell?

Run `Test-NetConnection -ComputerName app.example.com -Port 443`. `TcpTestSucceeded : True` means the connection worked.

### How do I schedule a recurring task in PowerShell?

Create an action with `New-ScheduledTaskAction`, a trigger with `New-ScheduledTaskTrigger`, and register them with `Register-ScheduledTask`. Task Scheduler is the Windows counterpart to cron.

### Should I use WSL or PowerShell for server work?

Use WSL if you want the same commands as your Linux server. Use PowerShell for Windows-specific tasks and Windows tooling.

## Next steps

Read [basic Linux VPS commands for self-hosting](/blogs/basic-linux-vps-commands-self-hosting) for the server side, the [macOS Terminal equivalent](/blogs/macos-terminal-commands-for-developers) if you also use a Mac, and [host Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify) for a first deployment. For connecting to a Windows machine from a Mac, see [SSH into a Windows VM from a Mac](/blogs/ssh-into-windows-vm-from-mac).
