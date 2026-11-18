---
title: How to Add Multiple Servers to Coolify (Remote and Build Servers)
seoTitle: How to Add Multiple Servers to Coolify for Next.js
description: Connect a second VPS to Coolify over SSH, validate it, deploy a Next.js app to it, and optionally add a build server so builds stop slowing production.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 26
readTime: 10 min
primaryKeyword: add server to coolify
keywords: [add server to coolify, coolify multiple servers, coolify build server, coolify remote server, coolify ssh key]
related: [host-nextjs-on-vps-with-coolify, coolify-projects-environments-nextjs, basic-linux-vps-commands-self-hosting, hostinger-vs-hetzner-vps-self-hosting]
subclipBlurb: Subclip records and edits screen demos, so you can capture the add-server and validate flow as a short runbook clip.
rankizzBlurb: Rankizz tracks how a published infrastructure guide ranks and gets cited by AI search, so you can see whether your documentation is found.
---

Coolify manages other servers over SSH. You add a remote server by giving Coolify an SSH key, authorizing that key on the machine, and validating the connection. After that you can deploy any resource to it, and you can optionally dedicate a server to building images. This guide follows Coolify's documented flow.

You need a running Coolify instance and a second Linux server you can reach over SSH.

## Quick answer

In Coolify, generate an ED25519 key under Keys & Tokens, paste the public key into `~/.ssh/authorized_keys` on the new server, then go to Servers, New server, enter the IP address, port, user and key, and select Validate connection. Validation checks SSH, the OS and tools, installs or verifies Docker and Docker Compose, and starts the proxy.

## Environment

| Item | Value |
| --- | --- |
| Coolify | Self-hosted instance, already installed |
| New server | Fresh Linux VPS with SSH reachable |
| User | `root` (the documented path; non-root needs extra setup) |
| Key type | ED25519 generated inside Coolify, no passphrase |

## Why add a second server

The Localhost server is created automatically on a self-hosted install. Coolify's docs say it shares resources with the dashboard and cannot be removed, and that a remote server is recommended for production. A second server also gives you a place to move heavy work, and the docs note that building and running on one server can make it unresponsive under high resource use.

Coolify describes three roles.

| Role | What it does |
| --- | --- |
| Localhost | Created automatically, shares resources with the dashboard |
| Deployment server | A Linux server you own or rent that runs apps, databases and services |
| Build server | Optional. Builds images but cannot host applications, databases or services |

## Step 1: create an SSH key in Coolify

Go to **Keys & Tokens > Private Keys**, select **New private key**, then **Generate ED25519**. Open the key's Edit icon, name it, and save. Copy the full public key. Do not add a passphrase, because Coolify must use the key unattended.

## Step 2: authorize the key on the new server

Log in to the new server as root and create the SSH directory with strict permissions.

```bash
ssh root@<server-ip>
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

Open `~/.ssh/authorized_keys`, paste the public key on a new line, and save. Then set the file mode.

```bash
chmod 600 ~/.ssh/authorized_keys
```

If SSH is not on port 22, add `-p <port>` to the ssh command. Coolify's OpenSSH guide also says that if you disable password root login, the key must already be in `/root/.ssh/authorized_keys`, the config needs `PubkeyAuthentication yes` and `PermitRootLogin prohibit-password`, and you should run `sshd -t` before restarting the service. Keep your original session open until a second terminal confirms key login works.

## Step 3: add the server in the dashboard

Select **Servers** in the sidebar, then **New server**, then **IP address or domain**. Fill in:

| Field | Value |
| --- | --- |
| Name | A recognizable label |
| IP address or domain | The address without `http://` or `https://` |
| Port | Usually 22 |
| User | `root` for this guide |
| Private key | The key you created |
| Server role | Under Advanced settings: Deployments and builds, Deployments only, or Builds only |

Select **Continue**.

## Step 4: validate

Select **Validate connection**. Coolify tests SSH and saves the host key, checks the OS and tools, installs or verifies Docker and Docker Compose, records server info, and starts the proxy. This can take several minutes. Wait until the General page shows the server as reachable and validated ("Server is reachable and validated").

The docs warn that validation can install Docker and restart the Docker service, so existing containers can be briefly unavailable. Use a fresh server when you can.

## Step 5: deploy to the new server

When you create a resource in a project, you choose which server it deploys to. A validated server appears as a destination. Point your app's domain DNS at the new server's address, because each server runs its own proxy for the apps on it. For the project side of this, see [projects and environments in Coolify](/blogs/coolify-projects-environments-nextjs).

## Step 6 (optional): add a build server

A build server builds application images on a separate machine. Coolify pushes the finished image to a container registry, and the deployment server pulls and runs it. Add one when builds use too much CPU, memory or disk on the deployment server.

Requirements from the docs:

- A fresh remote server running no applications, databases or services.
- Docker Engine installed, or permission for Coolify to install it.
- A container registry Coolify can push to, and a repository for the app (for example `ghcr.io/example/my-app`).
- The same CPU architecture as the deployment server.

Run `docker login <registry-domain>` on the build server as the SSH user. This creates `~/.docker/config.json`, which Coolify requires. If the repository is private, log in on the deployment server too. You can also set registry login under **Servers > [server] > Registries**.

To create it, add the server as above but set **Advanced settings > Server role > Builds only**. In the application's General page, the **Docker Image** and **Use a Build Server?** settings control the use. A server marked as a build server cannot be a deployment destination, and the build-server option is not available for Docker Compose applications.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Server already runs containers | Validation may restart Docker | Use a fresh server or schedule a window |
| Resources already on a server you want as build-only | Coolify disables the build setting | Move or delete resources first |
| Several build servers | Coolify picks the one with the fewest running builds and a free slot | Tune Concurrent builds |
| No usable build server | Build-server fallback can use a deployment server | Disable the fallback if builds must stay off |
| Different CPU architecture | Image from the build server will not run | Match amd64 or arm64 |
| Non-22 SSH port | Validation times out | Set the same Port in the server form |

## Troubleshooting

| Error or symptom | Cause | Fix |
| --- | --- | --- |
| `Permission denied (publickey)` | Selected private key does not match any public key in `authorized_keys` | Re-paste the public key, check file modes |
| Validation timeout | Wrong IP or port, or firewall blocks SSH from Coolify | Check address, port and firewall |
| Connection refused | OpenSSH not running or on another port | Start it, and match the port under Servers > your server > General |
| Server not offered as destination | Not validated, or marked builds only | Validate, or change the role |
| Image pull fails on deploy | Private registry, no login on the deployment server | `docker login` there too |

## Security

- Use a dedicated key for Coolify and keep its private half only in Coolify.
- Restrict the SSH rule to the Coolify server's IP. For a remote server attached to self-hosted Coolify, the docs list `22/tcp` from the Coolify server, and `80/tcp` and `443/tcp` only if the server receives public web traffic.
- Prefer the provider firewall over plain UFW, because Docker's published ports can bypass UFW.
- Do not expose database ports to all addresses.
- Keep the server patched. Coolify has a server patching page for this.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste private keys or tokens into the chat, and do not let the agent print them. Share only the public key.
- Make it show destructive commands (SSH config changes, firewall rules, Docker restarts, deleting servers) and wait for approval.
- Give it minimum permissions and test the flow on a throwaway server first.

## FAQ

### Do I need root to add a server to Coolify?
The documented path uses `root`. Using another account requires the non-root user setup from Coolify's docs first.

### Can Coolify provision the server for me?
Yes. The docs describe a provisioning path for Hetzner, DigitalOcean, Vultr and Hostinger. This guide covers the manual path for a server you already have.

### Does Coolify install Docker on the new server?
Validation installs or verifies Docker Engine and Docker Compose.

### What is a build server for?
It builds images on a separate machine and pushes them to a registry, so builds do not use CPU and RAM on the server that runs your apps.

### Can a build server also host my app?
No. A server marked as a build server cannot be selected as a deployment destination.

## Next steps

- The base install: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Organise what runs where: [Coolify projects and environments](/blogs/coolify-projects-environments-nextjs).
- Server basics: [Basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting).
- Choosing a provider: [Hostinger vs Hetzner VPS](/blogs/hostinger-vs-hetzner-vps-self-hosting).
