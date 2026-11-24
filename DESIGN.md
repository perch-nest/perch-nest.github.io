# Perch Nest: design

Status: **proposal, for review by both projects.** Nothing here ships until Perch's creator has agreed to it.

Words: a **computer** is a Mac running Perch or a PC running Roost. A **device** is what you reach it from (a phone,
a tablet, another computer's browser). A **nest** is a set of computers that belong to one person and trust each other.
Wire formats follow Perch's docs/PROTOCOL.md; anything not described here is unchanged.

## Goals

1. **One home.** `https://perch-nest.github.io/` serves both websites: Perch at `/mac/`, Roost at `/windows/`.
2. **Pair once, reach all your computers.** A device paired on the Nest with any computer in your nest can sign in to
   every computer in it.
3. **Adding a computer to your nest needs your passkey and your password.**
4. **One relay** for all the computers in a nest, Mac and Windows, set up in a few clicks.
5. **No weaker than today.** Each guarantee in Perch's SECURITY.md still holds; where linking introduces a new risk,
   it is named below with what bounds it.

Non-goals: sharing computers between different people; a relay or service run for everyone.

## 1. The site

- `/` is the landing page. It opens in Perch's look; scrolling (or choosing) fades it into Roost's. It asks "Mac or
  Windows?", remembers the answer (`nest.choice.v1` in localStorage), and on later visits goes straight there. A
  small "Mac · Windows" switch is always on screen in both. It never guesses from the device you are holding: that is
  usually a phone, not the computer you want.
- `/mac/` and `/windows/` are each project's own website, built from its own repository at a released tag, served
  unchanged except for the switch and the nest features below (both of which live in each project, behind "served
  from the Nest" checks).
- Both are one origin, so they share one passkey RP ID (`perch-nest.github.io`) and one localStorage. Their keys
  don't overlap (`perch.*`, `roost.*`, `nest.*`), and a computer accepts only passkeys it knows, so sharing the
  origin gives neither site anything the other's computers would accept.
- Each computer lists `https://perch-nest.github.io` as one of its **sites that can sign in** (the existing feature).
  It is added automatically when a computer joins a nest; before that, the owner adds it like any other site.

## 2. Linking computers

### What each computer keeps

```
nest: {
  id:       16 random bytes                       (which nest)
  key:      32 random bytes, with the secrets     (seals and authenticates messages between the computers)
  members:  [{hostId, sigKey, pin, name, os, joined}]   (every computer in the nest, itself included)
  devices:  [{credentialId, publicKey, counter, label, added, by}]   (devices paired on the Nest, from any member)
  removed:  [{credentialId, removed, by}]         (tombstones: a removed device never comes back)
  log:      the changes below, for catching up
}
```

Only **public** keys are shared. A passkey's private key never leaves the device or its password manager, and nothing
any computer holds can make a passkey sign.

What is **not** shared: each computer's own authenticator (TOTP) secret, backup password, sign-in rate limits, DTLS
certificate and rendezvous key. A device signing in to two computers types two different 6-digit codes. This is
deliberate: someone who breaks into one computer learns nothing that gets them past the second factor of another.

Only devices paired **on the Nest** are shared. Devices paired on `just-rice.github.io` or `faarisaahmed.github.io`
stay with their computer: their passkeys can't be used on any other site anyway.

### Adding a computer (passkey and password)

To add computer **B** to the nest that computer **A** is in:

1. **On B** (Setup / Control Center, which only someone at B can open): *Join your other computers*. B makes a
   one-time join link that expires in 10 minutes:
   `https://perch-nest.github.io/#join=b64url(B.hostId ‖ B.sigKey ‖ joinId ‖ joinSecret ‖ B.pin)`
   (16 + 32 + 16 + 32 + 16 bytes), shown as a QR code.
2. **On a device already paired with A on the Nest**, open the link. The page asks which of your computers approves,
   and signs in to A the usual way: **passkey**, then A's 6-digit code. Over that connection:
3. **Password.** The page asks for **A's backup password** and runs OPAQUE with A (exactly as backup sign-in does:
   the password is never sent, A learns only whether it was right, and each try counts towards A's backup lockout).
   The proof is bound to the connection: `HMAC(opaqueSessionKey, "nest add v1" ‖ bind)`. A without a backup password
   refuses: "Set a backup password on <A> first."
4. Only now does the page send A `{t:"nest-add", join}` with B's link contents. A has proof of the passkey **and** the
   password, on this one connection.
5. **A ↔ B.** A talks to B through B's own meeting point, sealed with B's rendezvous key as any device would, and
   both seal the exchange itself with `K = HKDF(joinSecret, "nest join v1")`. Only B (which made the link) and the
   owner's device know `joinSecret`, so B knows the approval came through the owner, and A knows it is talking to the
   computer that made the link. B's identity (`hostId`, `sigKey`, `pin`) is the one in the link, so a different
   computer can't stand in for it.
   - A → B: `nest.id`, `nest.key`, the members, the shared devices and tombstones, the relay (address and secret).
   - B → A: B's name and OS (its identity is already known from the link).
   - B marks the join link used. Like a pairing link, three bad proofs burn it.
6. A tells the other members (section 3). Every member adds B; B adds the Nest as a sign-in site.

If A isn't in a nest yet, step 4 makes one (A becomes its first member).

A stolen device alone can't add a computer (it lacks the password). A known password alone can't either (it lacks a
passkey). Someone at B can make join links, but nothing happens until the owner approves on A.

### Signing in to another member

The passkey's user handle still names the computer it was made on (`hostId ‖ sigKey ‖ pin`, as today). After a
device has fully signed in to that computer, `ready` also carries `nest: {members: [{hostId, sigKey, pin, name, os}]}`.
The device stores it (`nest.computers.v1`) and lists every computer.

The list is trustworthy because of where it comes from: a computer whose certificate the device has just checked
against the pin in its own passkey, over that DTLS connection. To sign in to member B:

- the device finds B through B's meeting point (B's `sigKey`) and **refuses any offer whose certificate doesn't match
  B's pin**, exactly as with a passkey made on B;
- B's challenge is, as always, `bind` for that connection;
- B accepts the assertion if the credential is in its shared device list, its signature verifies, the origin is the
  Nest, and the user handle names **a member** (not necessarily B);
- then B's own 6-digit code, under B's own limits.

A device that has never signed in to the computer its passkey names (a synced passkey on a new phone) signs in there
first, and then sees the rest. If that computer is off, the others are reached once the device knows them.

## 3. Keeping members in step

Members talk over the **nest topic** `nest/v1/<b64url(SHA-256("nest topic v1" ‖ nest.id))[0..22]>` on the same brokers
(and the relay), with the usual sealed envelope keyed by `HKDF(nest.key, "nest env v1")`. Every change is an entry
`{by: hostId, seq, ts, op, data}`, with `seq` counting up per member, authenticated by
`HMAC(HKDF(nest.key, "nest log v1"), entry)`:

| op | data |
|---|---|
| `device-add` | the credential's id, public key, label |
| `device-remove` | the credential's id (a tombstone: it wins over any add, in any order) |
| `member-add` | a new member's identity |
| `member-leave` | the leaving member (sent by itself, or by any member when the owner removes it) |
| `rename`, `relay` | a member's name; the nest's relay |

Every minute, and when it comes online, each member publishes what it has (`{hostId: highest seq}`); a member that is
behind asks for what it lacks. Entries are applied in order per member, and applying is idempotent.

**Removing a device** on any member removes it on every member as soon as they hear. Setup / Control Center shows,
for each member, whether it has confirmed the removal, and says plainly when one hasn't ("Your PC is off: it will
forget this device when it's next online"). Until then, a removed device could still sign in to that offline member,
but only with that member's own 6-digit code. This is the one new risk linking introduces; *Remove all devices* and
*Start over* are still local and immediate on each computer.

**Leaving.** *Start over* on a computer leaves its nest first. Removing a member from another member's Setup sends
`member-leave`; the others forget it and **rotate `nest.key`** (sent to the remaining members over the old key, then
used from then on), so the computer that left can't read or join the nest's traffic.

## 4. One relay

The relay Worker (`relay/`) is Perch's relay, serving both projects:

- `GET /v1/info` answers `{perch: "relay", roost: "relay", nest: "relay", v, claimed}`, so either project recognises it;
- it carries topics under `perch/v1/`, `roost/v1/` and `nest/v1/` (exact topics only, as now);
- it serves the Nest website, so a network that only lets the relay through still gets the site and its broker.

Claiming is unchanged: the first computer claims it with a random secret. Joining a nest hands the relay's address
and secret to the new member, which proves it with `/v1/check` and uses it. So one relay serves every computer in the
nest, and still nobody else's.

**Deploy to Cloudflare.** `relay/` carries a `Deploy to Cloudflare` button: a few clicks fork it into the owner's own
free Cloudflare account (Workers and Durable Objects on the free plan, no payment details). Setup / Control Center
then asks only for the address it shows.

## 5. What each project changes

Both projects, behind "served from the Nest" or "in a nest" checks, so nothing changes for anyone who doesn't use it:

- the join link (Setup / Control Center), `nest-add` with the password step, and the A ↔ B exchange;
- the nest store, the nest topic and catching up;
- accepting a shared device and a member's user handle; `ready.nest`;
- the website: a nest's computers in the list, the "Mac · Windows" switch, the join page;
- the relay checks accepting `nest: "relay"`.

The protocol pieces are written once, in [perch-nest/core](https://github.com/perch-nest/core) (the shared protocol and
relay, which both projects pull in at a pinned version), so both projects use identical code for everything a computer
and a device must agree on.

## Open questions

- Should removing a member also need the passkey and password, or is being at another member enough?
- Should a member refuse Nest sign-ins after it has been out of touch with the others for a long time (say 30 days)?
