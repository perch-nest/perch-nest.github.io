# Perch Nest

**One home for Perch and Roost: reach your Mac or your Windows PC from any browser.**

Perch Nest is a shared, neutral site for two sibling projects:

- **[Perch](https://github.com/Just-Rice/perch), by [Just-Rice](https://github.com/Just-Rice)**, for Macs. Perch is the
  original. Its creator designed and built the core of everything here: the sign-in (passkeys and authenticator codes
  checked by your own computer, every proof bound to its connection), the private backup password, the way a device
  finds its computer through sealed notes on public message servers, the direct encrypted connection, the Cloudflare
  relays for strict networks, and the viewer itself.
- **[Roost](https://github.com/faarisaahmed/roost)**, for Windows: a port of Perch, built on its protocol and security
  model, with a native Windows app and its own look.

Perch Nest adds what only a shared home can: **your computers linked together**, so a device you pair once can reach
your Mac and your PC, and **one relay** for all of them.

The code both projects genuinely share (the protocol and the relay) lives once, in
**[perch-nest/core](https://github.com/perch-nest/core)**, and each project pulls in a pinned version of it.

Neither project is merged into the other. Each keeps its own repository, releases and design; this repository only
brings their websites together at `https://perch-nest.github.io/` and holds the shared relay.

## What's here

| Path | What |
|---|---|
| `DESIGN.md` | How linking computers works, and why it is as secure as each project on its own. **Read this first.** |
| `site/` | The landing page: Perch first, fading into Roost, and "Mac or Windows?" (remembered, always switchable) |
| `relay/` | The relay Worker for both projects, with a one-click "Deploy to Cloudflare" |
| `scripts/` | The build that pulls each project's website from its own repository into `/mac/` and `/windows/` |

## Building

`node scripts/build.mjs` fetches both projects and builds the site into `dist/` (or `PERCH_DIR=../perch ROOST_DIR=../roost`
for local checkouts). `.github/workflows/pages.yml` does the same on every push and daily, and publishes it.

## Status

The website is live. Linking computers is at the design stage. Nothing here changes Perch or Roost until both projects accept it: Perch's side arrives as a pull
request to Perch, for its creator to review.

## Licence

Apache 2.0, the same as Perch and Roost. See [NOTICE](NOTICE) for what comes from Perch.
