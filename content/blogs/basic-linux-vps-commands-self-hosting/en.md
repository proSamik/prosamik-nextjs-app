---
title: How to Use a Linux VPS for Self-Hosting: Basic Commands Every Developer Needs
seoTitle: How to Use a Linux VPS: Basic Commands for Self-Hosting
description: The Linux commands you need on a VPS running Coolify or Docker: SSH, updates, disk and memory checks, logs, Docker, and a safe firewall setup.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 28
readTime: 9 min
primaryKeyword: basic linux vps commands
keywords: [basic linux vps commands, vps commands for developers, self hosting linux, ssh commands, docker commands vps]
related: [host-nextjs-on-vps-with-coolify, add-multiple-servers-coolify, hostinger-vs-hetzner-vps-self-hosting, move-nextjs-from-vercel-to-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a terminal session as a short runbook clip for your team.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps when you write server how-tos and want to know if they are found.
---

A VPS is a Linux server you control over SSH, and about twenty commands cover almost everything you need to self-host a Next.js app. This guide lists them in the order you use them: log in, update, check resources, read logs, inspect Docker, and set a firewall. It is aimed at developers who deploy with Coolify or plain Docker and have never administered a server.

I use these on the server that runs my Coolify-hosted Next.js apps. The firewall and Docker details come from Ubuntu's and Docker's documentation and Coolify's firewall page.

## Quick answer

Log in with `ssh root@<server-ip>`, run `apt update && apt upgrade -y`, check space with `df -h` and memory with `free -h`, list containers with `docker ps`, read logs with `docker logs`, and open only the ports you need with `ufw`, remembering that Docker published ports can bypass ufw.

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
| `top` | Live processes (press `q` to quit) |
| `du -sh /var/lib/docker` | Space used by Docker data |

```bash
df -h
free -h
```

You should see free space on `/` and available memory. Coolify's minimum is 2 GB RAM and 10 GB free disk. If the disk is full, builds and the database will fail in confusing ways, so check `df -h` first when something breaks.

## 4. Files and permissions

```bash
pwd
ls -la
cd /data/coolify
cat file.txt
chmod 600 ~/.ssh/authorized_keys
```

`chmod 700 ~/.ssh` and `chmod 600 ~/.ssh/authorized_keys` are the modes Coolify's add-server guide uses. Be careful with `rm -rf`. It deletes without asking and there is no trash, so double-check the path before pressing enter.

## 5. Services and logs

Most system services run under systemd.

```bash
systemctl status docker
systemctl restart docker
journalctl -u docker --since "1 hour ago"
```

`systemctl status` shows whether a service is active. `journalctl -u <service>` reads its logs. Restarting Docker restarts the container runtime, so containers can be briefly unavailable. Coolify's docs make the same point about server validation.

## 6. Docker commands

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

## 7. Disk cleanup

Builds leave images behind. Look before you delete.

```bash
docker system df
```

Coolify has an Automated Docker cleanup feature listed in its server docs, so check that first. Avoid running `docker system prune -a` by hand on a server with images you rely on, because it removes every image not used by a running container.

## 8. Firewall with ufw

Coolify's firewall page lists the ports a self-hosted Coolify server needs: `22/tcp` (SSH), `80/tcp` and `443/tcp` (proxy), and `8000/tcp`, `6001/tcp`, `6002/tcp` for dashboard access by IP, which can be closed once the dashboard works on a domain.

Ubuntu's firewall docs show these ufw commands:

```bash
sudo ufw allow 22
sudo ufw enable
sudo ufw status verbose
```

Allow SSH before you enable the firewall, or you can lock yourself out. Keep your current session open while testing from a second one.

The important caveat comes from both Docker and Coolify. Docker's documentation says published container ports are handled in the `nat` table, so traffic is diverted before it reaches the chains ufw uses, and your ufw rules can be ignored. Coolify's firewall page therefore says not to rely on plain UFW alone and to prefer your provider's firewall, or the community ufw-docker tool if there is none. Whatever you choose, test from outside the server with a port scan or a simple `curl`.

## 9. Users and SSH hygiene

```bash
adduser deploy
usermod -aG sudo deploy
```

A non-root user is good practice, but Coolify's documented add-server path uses `root`, and other accounts need its non-root setup first. Decide before you add the server to Coolify.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Disk full | Builds and databases fail | `df -h`, then clean images and old logs |
| Out of memory | The kernel kills processes | `free -h`, add RAM or swap, move builds elsewhere |
| Firewall enabled before allowing SSH | You lose access | Use the provider console to fix rules |
| `reboot` during a deploy | Deploy fails | Wait for the deploy to finish |
| ufw rule for a published container port | Port may still be reachable | Use the provider firewall |
| Long-running `docker logs -f` | Terminal floods | Use `--tail` and Ctrl+C |

## Troubleshooting

| Error | Cause | Fix |
| --- | --- | --- |
| `Permission denied (publickey)` | Key not in `authorized_keys` or wrong key | Re-add the public key, check modes 700 and 600 |
| `Connection refused` | OpenSSH not running or other port | Start it, use `-p <port>` |
| `Connection timed out` | Firewall blocks SSH or wrong address | Check provider firewall and IP |
| `No space left on device` | Disk full | `df -h`, `docker system df`, clean up |
| `Cannot connect to the Docker daemon` | Docker not running | `systemctl start docker` |
| `E: Could not get lock /var/lib/dpkg/lock` | Another apt process running | Wait, then retry |

## Security

- Use SSH keys and disable password root login once the key works.
- Open only the ports you use, and close 8000, 6001 and 6002 after the dashboard is on a domain.
- Use the provider firewall in front of Docker.
- Keep the system updated.
- Never paste private keys or tokens into a terminal session you are recording or sharing.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them. Check that command output you share has no tokens in it.
- Make it show destructive commands (`rm -rf`, `docker system prune`, firewall changes, reboots) and wait for your approval.
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

### How do I stop locking myself out of SSH?
Allow SSH first, keep one session open, and test a second login before closing the first.

## Next steps

- Put the commands to work: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Add another machine: [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).
- Pick a provider: [Hostinger vs Hetzner VPS](/blogs/hostinger-vs-hetzner-vps-self-hosting).

Sources: coolify.io/docs/get-started/installation, coolify.io/docs/knowledge-base/server/firewall, coolify.io/docs/knowledge-base/server/openssh, ubuntu.com/server/docs/how-to/security/firewalls, docs.docker.com/engine/network/packet-filtering-firewalls
