---
title: How to Use a Linux VPS for Self-Hosting: Commands, htop and Docker Cleanup Cron
seoTitle: How to Use a Linux VPS: Commands, htop, Docker Cleanup
description: Linux VPS commands for Coolify or Docker: SSH, updates, htop, disk checks, logs, a ufw firewall, and a cron job that prunes Docker images and build cache.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 28
readTime: 13 min
primaryKeyword: basic linux vps commands
keywords: [basic linux vps commands, htop, docker prune cron, delete docker build cache, vps commands for developers, self hosting linux, ssh commands, docker commands vps]
related: [host-nextjs-on-vps-with-coolify, add-multiple-servers-coolify, hostinger-vs-hetzner-vps-self-hosting, move-nextjs-from-vercel-to-coolify, macos-terminal-commands-for-developers, windows-powershell-commands-for-developers]
subclipBlurb: Subclip records and edits screen demos, so you can capture a terminal session as a short runbook clip for your team.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps when you write server how-tos and want to know if they are found.
---

A VPS is a Linux server you control over SSH, and about twenty commands cover almost everything you need to self-host a Next.js app. This guide lists them in the order you use them: log in, update, check resources, read logs, inspect Docker, and set a firewall. It also covers `htop` for reading the live process list and a cron job that prunes old Docker images and build cache so the disk does not fill up. It is aimed at developers who deploy with Coolify or plain Docker and have never administered a server.

This post is for the Linux server. If your laptop runs macOS or Windows, the local commands are in [macOS Terminal commands for developers](/blogs/macos-terminal-commands-for-developers) and [Windows PowerShell commands for developers](/blogs/windows-powershell-commands-for-developers).

I use these on the server that runs my Coolify-hosted Next.js apps. The firewall and Docker details come from Ubuntu's and Docker's documentation and Coolify's firewall page.

## Quick answer

Log in with `ssh root@<server-ip>`, run `apt update && apt upgrade -y`, check space with `df -h` and memory with `free -h`, watch processes with `htop`, list containers with `docker ps`, read logs with `docker logs`, open only the ports you need with `ufw`, remembering that Docker published ports can bypass ufw, and schedule `docker image prune` and a build cache prune with cron (never prune volumes blindly).

## Environment

| Item | Value |
| --- | --- |
| OS | Ubuntu LTS (Debian-family commands) |
| Access | SSH with a key |
| Tools | Docker Engine, installed by Coolify |
| Placeholders | `<server-ip>`, `<container-name>`, `my-app` |

Package commands differ on other distributions. Coolify supports Debian-based, Red Hat-based, SUSE-based, Arch and Alpine systems, but the examples here use `apt`.

## 1. Log in with SSH

```bash
ssh root@<server-ip>
```

If SSH listens on another port, add `-p <port>`. Prefer key login. Coolify's docs set `PubkeyAuthentication yes` and `PermitRootLogin prohibit-password` in `/etc/ssh/sshd_config`, validate with `sshd -t`, and say to keep your original session open until a second terminal confirms the new login works.

Copy a file to the server and back:

```bash
scp ./file.txt root@<server-ip>:/root/
scp root@<server-ip>:/root/file.txt ./
```

## 2. Update the system

```bash
apt update
apt upgrade -y
```

`apt update` refreshes the package list, and `apt upgrade` installs newer versions. Reboot when the kernel was upgraded.

```bash
reboot
```

You lose your SSH session on reboot. Wait a minute and log in again.

## 3. Check what the server is doing

| Command | What it shows |
| --- | --- |
| `uptime` | Load and how long it has been up |
| `df -h` | Disk space per mount, human readable |
| `free -h` | Memory and swap |
| `top` | Live processes (press `q` to quit), or use `htop` below |
| `du -sh /var/lib/docker` | Space used by Docker data |

```bash
df -h
free -h
```

You should see free space on `/` and available memory. Coolify's minimum is 2 GB RAM and 10 GB free disk. If the disk is full, builds and the database will fail in confusing ways, so check `df -h` first when something breaks.

## 4. htop: see what is eating CPU and memory

`top` is installed everywhere, but `htop` is easier to read. It is a separate package, so install it first.

```bash
apt install -y htop
htop
```

The top of the screen shows one bar per CPU core, a memory bar, a swap bar, the task count, load average and uptime. Below that is the process table. Read the columns like this:

| Column | Meaning |
| --- | --- |
| PID | Process ID, the number you pass to `kill` |
| USER | Which user runs it |
| CPU% | Share of one core, so a busy multi-thread process can exceed 100 |
| MEM% | Share of physical RAM |
| RES | Resident memory the process actually holds |
| TIME+ | Total CPU time used |
| Command | The process command line |

Keys inside htop, as listed in its on-screen footer and manual:

| Key | Action |
| --- | --- |
| `F6` or `<` `>` | Choose the sort column, for example MEM% or CPU% |
| `F4` or `\` | Filter the list by text |
| `F3` or `/` | Search for a process |
| `F5` or `t` | Toggle the tree view, which shows parent and child processes |
| `u` | Show only one user's processes |
| `F9` or `k` | Send a signal to the selected process (the default is SIGTERM) |
| `F2` | Setup, for columns and meters |
| `F10` or `q` | Quit |

Docker containers show up as ordinary processes on the host, so a runaway Node.js process in a container is visible here. Sort by MEM% when the server feels slow, and check the swap bar: heavy swap use means you are out of RAM. Killing a process in htop kills it on the host, so check that it is not your database before you press `F9`.

Alternatives: `top` (always there, press `q` to quit, `M` sorts by memory, `P` by CPU), `btop` (a graphical-style monitor, install it with `apt install btop` where your Ubuntu release packages it), and `docker stats --no-stream` for per-container numbers. I did not benchmark these tools against each other.

## 5. Files and permissions

```bash
pwd
ls -la
cd /data/coolify
cat file.txt
chmod 600 ~/.ssh/authorized_keys
```

`chmod 700 ~/.ssh` and `chmod 600 ~/.ssh/authorized_keys` are the modes Coolify's add-server guide uses. Be careful with `rm -rf`. It deletes without asking and there is no trash, so double-check the path before pressing enter.

## 6. Services and logs

Most system services run under systemd.

```bash
systemctl status docker
systemctl restart docker
journalctl -u docker --since "1 hour ago"
```

`systemctl status` shows whether a service is active. `journalctl -u <service>` reads its logs. Restarting Docker restarts the container runtime, so containers can be briefly unavailable. Coolify's docs make the same point about server validation.

## 7. Docker commands

Coolify runs your apps as Docker containers, so these are the commands you reach for.

```bash
docker ps
docker ps -a
docker logs --tail 100 <container-name>
docker logs -f <container-name>
docker stats --no-stream
docker exec -it <container-name> sh
docker restart <container-name>
```

| Command | Use |
| --- | --- |
| `docker ps` | Running containers |
| `docker ps -a` | Including stopped ones |
| `docker logs --tail 100 <name>` | Last 100 log lines |
| `docker logs -f <name>` | Follow logs live |
| `docker stats --no-stream` | CPU and memory per container |
| `docker exec -it <name> sh` | Open a shell inside a container |

Container names in Coolify are generated, so copy them from `docker ps` instead of guessing. Do not paste real container names into public posts or chats.

If Coolify itself misbehaves, `docker restart coolify` is the command its docs give when the registration page shows "Setup window closed".

## 8. Disk cleanup

Builds leave images behind. Look before you delete.

```bash
docker system df
```

Coolify has an Automated Docker cleanup feature listed in its server docs, so check that first. Avoid running `docker system prune -a` by hand on a server with images you rely on, because it removes every image not used by a running container.

## 9. Firewall with ufw

Coolify's firewall page lists the ports a self-hosted Coolify server needs: `22/tcp` (SSH), `80/tcp` and `443/tcp` (proxy), and `8000/tcp`, `6001/tcp`, `6002/tcp` for dashboard access by IP, which can be closed once the dashboard works on a domain.

Ubuntu's firewall docs show these ufw commands:

```bash
sudo ufw allow 22
sudo ufw enable
sudo ufw status verbose
```

Allow SSH before you enable the firewall, or you can lock yourself out. Keep your current session open while testing from a second one.

The important caveat comes from both Docker and Coolify. Docker's documentation says published container ports are handled in the `nat` table, so traffic is diverted before it reaches the chains ufw uses, and your ufw rules can be ignored. Coolify's firewall page therefore says not to rely on plain UFW alone and to prefer your provider's firewall, or the community ufw-docker tool if there is none. Whatever you choose, test from outside the server with a port scan or a simple `curl`.

## 10. Users and SSH hygiene

```bash
adduser deploy
usermod -aG sudo deploy
```

A non-root user is good practice, but Coolify's documented add-server path uses `root`, and other accounts need its non-root setup first. Decide before you add the server to Coolify.

## 11. Cron jobs for Docker cleanup and old build caches

Old images and build cache are the usual reason a Coolify server runs out of disk. A cron job can prune them on a schedule. First look at the numbers, then prune with filters, then schedule it.

### Check before you prune

```bash
df -h /
docker system df
```

`docker system df` splits Docker's usage into images, containers, local volumes and build cache, and shows how much of each is reclaimable. If build cache or old images are the big lines, pruning them is safe in principle. If local volumes are the big line, stop: volumes can hold your database data.

### Prune commands that respect an age limit

Docker's pruning docs describe these. Each prompts for confirmation unless you add `-f`.

```bash
docker image prune -a --filter "until=168h" -f
docker builder prune --filter "until=168h" -f
```

`until=168h` keeps anything created in the last seven days, which protects the image you just deployed and your rollback. `docker image prune` without `-a` only removes dangling images, meaning untagged and unused ones. With `-a` it removes every image not used by an existing container that is older than the filter. Docker's pruning page documents `docker buildx prune` for build cache; `docker builder prune` is the same kind of command, but I did not verify its flags on that page, so run `docker builder prune --help` on your server first. `docker system prune --filter "until=168h"` combines stopped containers, unused networks, dangling images and unused build cache in one command. It leaves volumes alone by default.

### Why not prune volumes blindly

Docker's docs say volumes are never removed automatically because that could destroy data. `docker system prune --volumes` and `docker volume prune` remove anonymous volumes not used by a container, and with `-a` they also remove named volumes. A stopped database container's volume looks "unused" while the container is stopped, so a prune at the wrong moment can delete a database. Coolify's cleanup docs say the same: its "Delete unused volumes" option is off by default and you should back volumes up first. Leave volumes out of your cron job.

### Crontab syntax and `crontab -e`

A crontab line has five time fields and then the command: minute, hour, day of month, month, day of week.

```text
# m  h  dom mon dow  command
  30 3  *   *   0    /usr/local/bin/docker-cleanup.sh
```

That line runs at 03:30 every Sunday. Edit your own crontab with `crontab -e`, list it with `crontab -l`. Use a script so the command stays short and testable.

### A safe cleanup script with a lock and a log

```bash
#!/usr/bin/env bash
# /usr/local/bin/docker-cleanup.sh
set -u
LOG=/var/log/docker-cleanup.log
{
  echo "=== $(date -Is) ==="
  df -h /
  docker image prune -a --filter "until=168h" -f
  docker builder prune --filter "until=168h" -f
  df -h /
} >> "$LOG" 2>&1
```

```bash
chmod +x /usr/local/bin/docker-cleanup.sh
```

Then add the schedule with `crontab -e`, wrapped in `flock` so two runs can never overlap if one is slow:

```text
30 3 * * 0 flock -n /var/lock/docker-cleanup.lock /usr/local/bin/docker-cleanup.sh
```

`flock -n` exits immediately instead of waiting if the lock is held. Run the script by hand once and read `/var/log/docker-cleanup.log` before you trust the schedule. Cron uses a minimal environment, so use absolute paths and confirm `docker` is on the PATH in the crontab if the log shows `docker: command not found`.

### Coolify's own cleanup

Coolify has a built-in Docker cleanup per server. Its docs describe a cleanup frequency (default `0 0 * * *`, once a day at midnight), a trigger of either "Run on every schedule" or "Only above disk threshold", a disk threshold that defaults to 80, and Advanced cleanup toggles: "Delete unused volumes" and "Delete unused networks" (both off by default) and "Delete all old images" (by default Coolify keeps retained images for rollback). There is also a manual "Run cleanup" action. If you use Coolify, start with these settings and add your own cron job only for what they do not cover, such as build cache on a separate build server. Running both is safe as long as neither prunes volumes.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Disk full | Builds and databases fail | `df -h`, then clean images and old logs |
| Out of memory | The kernel kills processes | `free -h`, add RAM or swap, move builds elsewhere |
| Firewall enabled before allowing SSH | You lose access | Use the provider console to fix rules |
| `reboot` during a deploy | Deploy fails | Wait for the deploy to finish |
| ufw rule for a published container port | Port may still be reachable | Use the provider firewall |
| Long-running `docker logs -f` | Terminal floods | Use `--tail` and Ctrl+C |
| Cron prune runs during a deploy | Cache or image may be pruned mid-build | Run it at a quiet hour with an `until` filter |
| `docker system prune --volumes` in cron | Can delete data volumes | Never schedule it |

## Troubleshooting

| Error | Cause | Fix |
| --- | --- | --- |
| `Permission denied (publickey)` | Key not in `authorized_keys` or wrong key | Re-add the public key, check modes 700 and 600 |
| `Connection refused` | OpenSSH not running or other port | Start it, use `-p <port>` |
| `Connection timed out` | Firewall blocks SSH or wrong address | Check provider firewall and IP |
| `No space left on device` | Disk full | `df -h`, `docker system df`, clean up |
| `Cannot connect to the Docker daemon` | Docker not running | `systemctl start docker` |
| `E: Could not get lock /var/lib/dpkg/lock` | Another apt process running | Wait, then retry |
| `docker: command not found` in the cron log | Cron has a minimal PATH | Use the full path to `docker` or set PATH in the script |
| Cron job never runs | Syntax error or script not executable | `crontab -l`, `chmod +x`, check `/var/log/docker-cleanup.log` |

## Security

- Use SSH keys and disable password root login once the key works.
- Open only the ports you use, and close 8000, 6001 and 6002 after the dashboard is on a domain.
- Use the provider firewall in front of Docker.
- Keep the system updated.
- Run `df -h` and `docker system df` first, and never let a scheduled job prune volumes.
- Never paste private keys or tokens into a terminal session you are recording or sharing.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them. Check that command output you share has no tokens in it.
- Make it show destructive commands (`rm -rf`, any `prune` command, crontab edits, firewall changes, reboots) and wait for your approval.
- Give it the minimum access: a non-production server first, and a limited user where possible.

## FAQ

### What Linux commands do I need to run a VPS?
`ssh`, `apt update && apt upgrade`, `df -h`, `free -h`, `systemctl`, `journalctl`, `docker ps`, `docker logs`, and `ufw`. Those cover login, updates, health checks, logs and the firewall.

### How do I see why my container is failing?
Run `docker ps -a` to find it, then `docker logs --tail 100 <container-name>`.

### Is ufw enough to protect Docker containers?
No. Docker's docs say published ports can bypass ufw rules. Use your provider firewall, as Coolify's docs advise.

### How much disk and RAM does Coolify need?
The docs list 2 CPU cores, 2 GB RAM and 10 GB free disk as the minimum.

### How do I delete old Docker images and build cache automatically?
Schedule `docker image prune -a --filter "until=168h" -f` and a build cache prune with cron, wrapped in `flock -n`, and log the output. Check `docker system df` first and never include volumes. Coolify also has its own per-server cleanup settings.

### Is it safe to run docker system prune?
With an `until` filter and without `--volumes` it is generally safe, because it removes stopped containers, unused networks, dangling images and unused build cache. Stopped containers you want to keep are removed too, so read the confirmation prompt.

### What is htop and how do I quit it?
`htop` is an interactive process viewer. Press `F10` or `q` to quit.

### How do I stop locking myself out of SSH?
Allow SSH first, keep one session open, and test a second login before closing the first.

## Next steps

- Put the commands to work: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Add another machine: [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).
- Local machine commands: [macOS Terminal commands](/blogs/macos-terminal-commands-for-developers) and [Windows PowerShell commands](/blogs/windows-powershell-commands-for-developers).
- Pick a provider: [Hostinger vs Hetzner VPS](/blogs/hostinger-vs-hetzner-vps-self-hosting).

Sources: docs.docker.com/engine/manage-resources/pruning, coolify.io/docs/knowledge-base/server/automated-cleanup, coolify.io/docs/get-started/installation, coolify.io/docs/knowledge-base/server/firewall, coolify.io/docs/knowledge-base/server/openssh, ubuntu.com/server/docs/how-to/security/firewalls, docs.docker.com/engine/network/packet-filtering-firewalls
