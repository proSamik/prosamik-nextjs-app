---
title: How to Organize Coolify Projects and Environments for Next.js
seoTitle: How to Organize Coolify Projects and Environments
description: Learn what Coolify projects, environments and resources are, how to lay them out for a Next.js app with a database, and how shared variables fit in.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 27
readTime: 8 min
primaryKeyword: coolify projects environments
keywords: [coolify projects, coolify environments, coolify shared variables, coolify staging production, coolify resources]
related: [host-nextjs-on-vps-with-coolify, add-multiple-servers-coolify, move-nextjs-from-vercel-to-coolify, coolify-healthcheck-nextjs-docker-railpack]
subclipBlurb: Subclip records and edits screen demos, so you can capture how your project and environment layout works for a teammate.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, so you can see whether your deployment docs are found.
---

In Coolify a server hosts projects, a project holds environments, and an environment holds resources such as your Next.js app and its database. Getting this layout right early keeps staging and production apart and makes variables easier to manage. This guide explains each level and a layout that works for a Next.js app.

One limit up front: Coolify's docs pages I could fetch cover the concepts and shared variables, but not every button for cloning or moving resources. Where I could not verify a UI detail, I say so.

## Quick answer

Use one project per product, and inside it use environments such as production and staging. Put the Next.js app and its Postgres database in the same environment as separate resources. Use shared variables, referenced as `{{project.NAME}}`, for values that several resources need, and keep secrets runtime-only.

## Environment

| Item | Value |
| --- | --- |
| Coolify | Self-hosted, current docs |
| App | Next.js 16 on Railpack or a Dockerfile |
| Database | Postgres as its own Coolify resource |
| Placeholders | `app.example.com`, `MY_DB_URL`, `my-app` |

## The four concepts

Coolify's Concepts page defines them like this.

| Term | Meaning |
| --- | --- |
| Server | A computer that runs applications or services, physical or rented |
| Project | A group of environments and resources you deployed on your server; you can run several projects on one server |
| Environment | A setup that determines how your resources operate, for example development for testing and production for the live app |
| Resource | An application or service you set up, such as a website, database or API, each with its own domains, backups and health checks |

The relationship from the docs: a server hosts one or more projects, each project contains its own environments and resources, and every resource is deployed as a Docker container.

## A layout that works for one Next.js app

For my own small site, the useful split is one project, one production environment, and two resources: the Next.js application and a Postgres database. The app uses a Railpack build and the database is a separate resource, not baked into the app container.

```text
Project: my-app
  Environment: production
    Resource: Next.js app (Git, Railpack)   -> app.example.com
    Resource: Postgres database
  Environment: staging
    Resource: Next.js app (Git, staging branch)
    Resource: Postgres database (separate)
```

Staging gets its own database. Pointing staging at the production database is the most common way to damage real data during a test.

## Step 1: create the project

In the dashboard click **New Project**, enter a name, and click **Continue**. Then open the project and click **Create New Resource**. This is the flow from Coolify's first-app guide.

## Step 2: add resources to an environment

Add the Git application first, choosing the build pack and the exposed port. Then add the database as a second resource in the same environment. For how the app side is configured, see [hosting Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).

I could not verify from the pages I fetched the exact steps for creating extra environments, cloning one, or moving a resource between them. Check the current Coolify UI and docs before relying on them.

## Step 3: wire the app to the database

Resources in one environment can reach each other. Give the app its connection string as a runtime variable, not a build variable.

```text
MY_DB_URL=<copy the internal URL from the database resource, set in the secret UI>
```

Coolify's variable settings have independent **Build time** and **Runtime** controls. New variables default to both. For a database URL the app only reads after start, set Build time to "Not available during build". The docs also say build arguments can remain visible in image metadata, and that Docker BuildKit secrets are available for sensitive build-time values when the build server supports BuildKit.

## Step 4: shared variables

Shared variables let you reference one value from many resources instead of copying it. Coolify documents four scopes: team, project, environment and server. Project-scoped variables use the syntax `{{project.VARIABLE_NAME}}`, and the environment page shows `{{environment.DATABASE_URL}}` as an example.

Facts from the docs worth knowing:

- Defining a shared variable does not add it to any resource. You add a reference where a resource needs it, then redeploy or restart.
- Server-scoped references resolve using the server that runs the resource.
- Deleting a shared variable does not remove its references from resource configuration.
- References to locked shared variables stay as references and do not expose the secret when you use the copy button.

Example reference in a resource's variables:

```text
MY_ANALYTICS_HOST={{project.MY_ANALYTICS_HOST}}
```

## Naming that stays readable

Name projects after products, environments after stages, and resources after what they do. Something like `my-app` for the project, `production` and `staging` for environments, and `web` and `postgres` for resources makes the dashboard and the deployment logs easy to scan when you have several servers. Avoid names that include dates or people, because they go stale. Coolify's docs say each resource has its own domains, backups and health checks, so a clear resource name also tells you which settings you are editing.

## Step 5: keep staging and production apart

Give each environment its own domain, branch and database. A staging app on `staging.example.com` deploying from a staging branch means a broken change never touches production. Add a healthcheck in each so a bad deploy is caught, as in [the healthcheck guide](/blogs/coolify-healthcheck-nextjs-docker-railpack).

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Two apps in one project | Both live in the same grouping, separate containers | Fine for one product; use separate projects for unrelated products |
| Secret marked as build time | May be visible in image metadata | Use runtime-only or BuildKit secrets |
| Shared variable deleted | References stay in resource config | Remove references by hand |
| Variable changed | Running containers do not pick it up | Redeploy or restart |
| Resource on a build-only server | Not allowed | Build servers cannot host resources |
| Preview deployments | Not the same as a staging environment | Treat them separately |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| App cannot reach the database | Wrong connection string, or different environment or network | Use the internal URL from the database resource |
| `NEXT_PUBLIC_` value empty in browser | Variable not available at build time | Enable Build time and rebuild |
| Shared variable shows as literal text | Wrong scope or syntax | Check `{{project.NAME}}` and that the variable exists at that scope |
| Staging changed production data | Shared database | Give staging its own database |
| Change has no effect | Container not restarted | Redeploy |

## Security

- Do not mark secrets as build time unless the build truly needs them.
- Use locked shared variables for secrets, so the copy button does not reveal them.
- Keep production and staging credentials different.
- Do not commit `.env` files, and strip them from images.
- Give the database a user with only the permissions the app needs.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print variable values.
- Make it show destructive actions (deleting a resource, environment or volume, force deploys) and wait for approval.
- Give it a scoped API token and work in a staging environment first.

## FAQ

### What is the difference between a project and an environment in Coolify?
A project is the top-level group. An environment, such as production or development, sits inside it and determines how its resources operate.

### Can I run several projects on one server?
Yes. Coolify's docs say you can run several projects on one server, for example separate hobby and work projects.

### What is a resource?
An application or service you set up, such as a website, database or API. Each is deployed as a Docker container.

### How do shared variables work?
You define a value at team, project, environment or server scope, then reference it, for example `{{project.NAME}}`, in each resource that needs it.

### Should the database be in the same environment as the app?
Mine is a separate resource beside the app. Keep one database per environment.

## Next steps

- Install and deploy first: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Spread across machines: [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).
- Coming from Vercel: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
