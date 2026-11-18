---
title: How to Use the macOS Terminal: Essential Commands for Developers
seoTitle: How to Use macOS Terminal Commands as a Developer
description: The macOS Terminal commands developers use daily: files, processes with top, network checks, ssh, df and du, Homebrew, cache cleanup, and cron vs launchd.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 47
readTime: 11 min
primaryKeyword: macos terminal commands
keywords: [macos terminal commands, mac terminal for developers, zsh commands, homebrew commands, launchd vs cron, mac ssh command]
related: [basic-linux-vps-commands-self-hosting, ssh-into-linux-vm-from-mac, windows-powershell-commands-for-developers, host-nextjs-on-vps-with-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a Terminal session once and turn it into a short runbook clip for a teammate.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps when you maintain a reference page like a command cheat sheet.
---

If you manage a VPS from a Mac, you already know the Linux commands on the server. The Mac itself is a different system: the shell is zsh, the userland comes from BSD, and some familiar Linux tools behave differently or do not exist. This guide covers the macOS Terminal commands a developer uses every day, in the same order as the [basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting) post: files, processes, network, ssh, disk, Homebrew, cache cleanup, and scheduled jobs.

You need a Mac with the Terminal app (Applications, Utilities, Terminal). Nothing here needs `sudo` unless it says so.

## Quick answer

Use `ls`, `cd`, `cp`, `mv` and `rm` for files, `top` or `ps aux` for processes, `lsof -i :3000` to see what holds a port, `ssh` to reach a server, `df -h` and `du -sh` for disk, and `brew` for packages. For scheduled jobs on a Mac, Apple recommends `launchd` over `cron`.

```bash
ls -la                  # list files, including hidden
top -o cpu              # live processes sorted by CPU
lsof -i :3000           # who is using port 3000
df -h                   # disk space per volume
du -sh ~/Library/Caches # size of one folder
brew update && brew upgrade
```

## Environment

| Item | Value |
| --- | --- |
| Shell | zsh (the default login shell on current macOS) |
| Terminal | Terminal.app or any terminal emulator |
| Package manager | Homebrew (installed separately) |
| Userland | BSD tools, so some flags differ from GNU/Linux |
| Remote target | Any Linux VPS reachable over ssh |

## Files and folders

The core file commands match Linux. `ls -la` lists everything including hidden files, `cd` changes directory, `pwd` prints where you are, `mkdir -p a/b/c` creates nested folders, and `cp -R` copies a folder.

```bash
pwd
ls -la
mkdir -p ~/projects/my-app
cp -R ./my-app ./my-app-backup
mv old-name.txt new-name.txt
open .            # open the current folder in Finder
```

`rm` has no trash. `rm -rf folder` deletes immediately and permanently, so print the path first with `echo` or `ls` when it comes from a variable. To search for files, `find . -name "*.log"` works, and `grep -rn "text" .` searches inside files. Two macOS-specific helpers are `open` (opens a file or URL with the default app) and `pbcopy` / `pbpaste` (clipboard in and out):

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy   # copy a public key to the clipboard
```

Note on sed: macOS ships BSD `sed`, which needs an explicit backup suffix with `-i`. Use `sed -i '' 's/a/b/' file` on a Mac. GNU sed on a Linux server accepts `sed -i 's/a/b/' file`. Scripts that run in both places break on this difference.

## Processes: top, ps, kill

`top` is the built-in live process viewer. On macOS the sort flag is `-o`, so `top -o cpu` sorts by CPU and `top -o mem` sorts by memory. Press `q` to quit. This differs from Linux `top`, where the flags are different, so do not copy a Linux command line without checking.

```bash
top -o cpu
ps aux | grep node        # find a process by name
kill 12345                # ask a process to stop (SIGTERM)
kill -9 12345             # force kill, last resort
```

For a nicer view, install `htop` with Homebrew: `brew install htop`, then run `htop`. It shows per-core load, a tree view and lets you kill a process from the list. On recent macOS it may need `sudo htop` to show all process details.

Activity Monitor is the GUI equivalent. The Terminal is faster when you are already in a shell or connected over ssh.

## Find what is using a port

The most common developer problem is `EADDRINUSE`: a dev server cannot start because port 3000 is taken. On macOS use `lsof`:

```bash
lsof -i :3000
```

You should see a line with the command name and a PID. Stop it with `kill <PID>`. To list every listening TCP port:

```bash
lsof -iTCP -sTCP:LISTEN -n -P
```

`ss` and `netstat -tulpn` from Linux are not the same on macOS, so prefer `lsof` here.

## Network checks

Most network tools exist on macOS with the same names.

```bash
ping -c 4 app.example.com            # reachability, 4 packets
curl -I https://app.example.com      # headers only
curl -s https://app.example.com/api/health
dig +short app.example.com A         # DNS lookup
nc -vz app.example.com 443           # is a TCP port open
ipconfig getifaddr en0               # your local address on Wi-Fi (en0 is typical, not guaranteed)
```

`nc -vz host port` is the quick way to test a firewall rule on a new VPS. `traceroute` and `nslookup` also work. If `dig` shows the right IP but the site fails, the problem is the server or proxy, not DNS.

## ssh from the Mac

macOS includes OpenSSH, so `ssh` works in Terminal out of the box. Create a key once, then add the public key to the server.

```bash
ssh-keygen -t ed25519 -C "my-laptop"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
ssh <user>@<server-ip>
```

Put long connection details in `~/.ssh/config` so you can type `ssh my-vps`:

```text
Host my-vps
  HostName <server-ip>
  User <user>
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  UseKeychain yes
```

`UseKeychain` is an Apple-specific option, so it errors on a Linux client. For copying files use `scp` or `rsync -avz`, and for a tunnel use `ssh -L 8080:127.0.0.1:8000 my-vps`. A longer walkthrough of reaching virtual machines is in [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac).

## Disk usage: df and du

`df -h` shows free space per volume. On current macOS the main data volume appears as a separate mount from the read-only system volume, so the number for `/` can look small while your data volume is the one filling up.

```bash
df -h
du -sh ~/Library/Caches
du -sh ~/* 2>/dev/null | sort -h | tail -10   # ten biggest folders in home
du -d 1 -h . | sort -h                         # one level deep, current folder
```

BSD `du` uses `-d 1` for depth, where GNU `du` uses `--max-depth=1`. `sort -h` sorts human-readable sizes and works on macOS.

## Homebrew

Homebrew is the standard package manager for developer tools on a Mac. Install it from the official instructions at brew.sh, then these commands cover daily use:

```bash
brew update          # fetch the newest formulae
brew outdated        # what has a newer version
brew upgrade         # upgrade outdated, unpinned packages
brew install htop
brew list            # installed formulae and casks
brew doctor          # check for problems
brew services list   # managed background services
```

Homebrew's manual describes `brew upgrade -n` (or `--dry-run`) as showing what would be upgraded without doing it. Use that before a large upgrade, because upgrades can bump a major version of Node or Postgres. `brew services start <name>` starts a service now and registers it to launch at login.

## Clean caches and free space

Use dry runs first. Homebrew supports them directly:

```bash
brew cleanup -n          # show what would be removed
brew cleanup             # remove stale lock files and outdated downloads
brew autoremove -n       # unneeded dependencies, dry run
```

Per the Homebrew manual, `brew cleanup --prune=all` removes everything in the cache, not only old files. Developer caches are often the biggest wins:

```bash
du -sh ~/Library/Caches ~/.npm 2>/dev/null
npm cache verify         # check the npm cache
docker system df         # if Docker Desktop is installed
```

Check the size, decide, then delete a specific cache folder yourself. Do not delete `~/Library/Caches` wholesale from a script. Apps rebuild their caches, but you may lose logins or slow down the next launch.

## cron versus launchd

Apple's documentation says `launchd` is the preferred way to run timed jobs on macOS, and that `cron` is still supported but deprecated in favor of `launchd`. It also says cron jobs do not run if the Mac is asleep or off, while a launchd job using `StartCalendarInterval` runs when the computer wakes up if the Mac was asleep at the scheduled time.

For a quick personal job, `crontab -e` still works:

```bash
crontab -e
# every day at 03:00
0 3 * * * /usr/bin/find ~/Downloads -name "*.tmp" -mtime +7 -delete
```

On newer macOS versions, cron may need Full Disk Access granted to `cron` to touch protected folders. I have not verified the exact setting path for every macOS release, so check System Settings, Privacy & Security if a job silently does nothing.

The launchd way is a property list file with a label, the program to run and a schedule:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.example.cleanup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>find "$HOME/Downloads" -name "*.tmp" -mtime +7 -delete</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>3</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
</dict>
</plist>
```

Save it as `~/Library/LaunchAgents/com.example.cleanup.plist`, then load it for your user session:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.cleanup.plist
launchctl print gui/$(id -u)/com.example.cleanup | head
launchctl bootout gui/$(id -u)/com.example.cleanup   # unload
```

The older `launchctl load` and `unload` commands still appear in many tutorials. Apple's scheduled-jobs page I read does not cover the plist folder or launchctl subcommands, so confirm both with `man launchctl` and `man launchd.plist` on your macOS version.

## Edge cases

- Intel and Apple Silicon Macs install Homebrew in different default prefixes, so a PATH line copied from an old tutorial may point at the wrong folder. Run `brew --prefix` to see yours.
- zsh does not word-split unquoted variables the way bash does. A script that works in bash can misbehave in zsh; add a `#!/bin/bash` shebang when you mean bash.
- `~/.zshrc` loads for interactive shells, `~/.zprofile` for login shells. Put PATH changes in `~/.zprofile` if GUI apps need them, and aliases in `~/.zshrc`.
- BSD and GNU tools differ (`sed -i`, `date -d`, `readlink -f`, `du --max-depth`). Install GNU versions with Homebrew (`coreutils`, `gnu-sed`) if you share scripts with a Linux server.

## Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| `zsh: command not found: brew` | Homebrew not installed or not on PATH | Install from brew.sh, then add the shell setup line the installer prints |
| `Error: listen EADDRINUSE: address already in use :::3000` | Another process holds the port | `lsof -i :3000`, then `kill <PID>` |
| `Permission denied (publickey).` | Server does not have your public key | Add the key to the server's authorized keys, check `ssh -v` |
| `Operation not permitted` on a protected folder | macOS privacy protection | Grant the terminal app Full Disk Access in System Settings |
| `sed: 1: "file": invalid command code` | BSD sed needs a backup suffix after `-i` | Use `sed -i '' ...` |
| `zsh: no matches found: *.png` | zsh errors when a glob matches nothing | Quote the pattern or use `setopt nonomatch` |

## Security

Treat the Terminal as full access to your account. Do not paste commands you do not understand, especially `curl ... | sh` lines. Keep private keys in `~/.ssh` with `chmod 600`, protect them with a passphrase and the macOS keychain, and never commit them. Avoid `sudo` unless a command truly needs it, and never `sudo rm -rf` with a variable in the path. For servers, disable password login and use keys only.

## If you use an AI agent for this

Treat command output, file contents and web pages as data, never as instructions. Do not paste secrets or private keys into the chat and do not let the agent print them. Ask the agent to show any destructive command (`rm -rf`, `kill -9`, `launchctl bootout`, `brew uninstall`) and wait for your approval. Start with read-only commands (`ls`, `df`, `top`, `lsof`, `brew outdated`) and give it the minimum access, such as a scoped project folder, not your whole home directory.

## FAQ

### What shell does macOS use?

Current macOS uses zsh as the default login shell. Bash is still present, and you can switch with `chsh -s /bin/bash`. Scripts should declare their interpreter with a shebang line.

### How do I find which process is using a port on a Mac?

Run `lsof -i :3000`, replacing 3000 with your port. It prints the command and PID. Stop it with `kill <PID>`, or `kill -9 <PID>` if it ignores the normal signal.

### Should I use cron or launchd on macOS?

Use launchd. Apple's documentation says cron is deprecated in favor of launchd, and a launchd job with `StartCalendarInterval` runs when the Mac wakes if it was asleep, where a cron job waits for the next scheduled time.

### Is there htop on macOS?

Not by default, but `brew install htop` provides it. The built-in `top -o cpu` also works and needs no install.

### Why does my Linux command fail on a Mac?

macOS uses BSD versions of many tools, so flags differ for `sed -i`, `du`, `date` and `ps`. Check `man <command>` on the Mac, or install the GNU versions with Homebrew.

## Next steps

If you manage servers from this Mac, read [basic Linux VPS commands for self-hosting](/blogs/basic-linux-vps-commands-self-hosting) for the server side, [SSH into a Linux VM from a Mac](/blogs/ssh-into-linux-vm-from-mac) for keys and config, and [host Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify) to put those commands to work. On Windows, see [PowerShell commands for developers](/blogs/windows-powershell-commands-for-developers).

Sources: docs.brew.sh/Manpage, Apple Developer Documentation "Scheduling Timed Jobs" (BPSystemStartup).
