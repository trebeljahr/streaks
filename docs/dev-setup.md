# Dev URL setup (`https://streaks.local.trebeljahr.com/`)

This project ships with the **hatchkit local-dev** integration: when you run
`pnpm dev`, the dev server is reachable from any Tailscale peer (phone,
tablet, other laptop) at:

```
https://streaks.local.trebeljahr.com/
```

Caddy on your host terminates TLS with a real Cloudflare-issued wildcard
cert, and tailscale serve forwards inbound port-443 traffic from the
tailnet to Caddy. No per-project DNS work, no port juggling, no
framework `base` / `basePath` config.

## One-time host setup

Do this **once per machine**, not per project. New hatchkit projects opt in by
default, so after the host is wired they just work.

```
hatchkit dev-setup init --domain local.trebeljahr.com
```

### 1. Cloudflare DNS — auto-managed

`hatchkit dev-setup init` creates a DNS-only A record:

```
*.local.trebeljahr.com   A   <your-tailnet-ip>   (DNS-only, TTL 60)
```

It uses your hatchkit DNS token (or the `caddy-dev/cloudflare-acme`
keychain entry as a fallback) — the same token Caddy already needs for
DNS-01 ACME. Required permissions: `Zone:DNS:Edit` + `Zone:Zone:Read`
on the parent zone.

**Why a direct A record instead of a CNAME to laptop.tail4a5428.ts.net?**
A CNAME to a `.ts.net` name only resolves when each peer has
Tailscale's MagicDNS resolver in front of its public DNS. iOS's stub
resolver caches NXDOMAIN for the intermediate lookup, so phone requests
silently fail. Pointing the wildcard at the laptop's tailnet IP makes
the resolution a single hop — tailnet peers reach the laptop, anyone
else gets a useless 100.x address (intended).

If you're using a non-Cloudflare DNS provider, add the record yourself:

```
*.local.trebeljahr.com   A   <your-tailnet-ip>   (DNS-only)
```

### 2. Cloudflare API token

Caddy needs a Cloudflare token to fetch the wildcard cert via DNS-01
ACME. `hatchkit config add dns` already prompts for one — if you ran
`hatchkit setup`, you've got it. Otherwise:

```
hatchkit config add dns
```

Permissions: `Zone:DNS:Edit` + `Zone:Zone:Read` scoped to
`local.trebeljahr.com`. For the cleanest setup, keep the token in Keychain:

```
security add-generic-password -s caddy-dev -a cloudflare-acme -w '<token>' -U
```

When that keychain entry exists, `dev-setup init` writes a tiny Caddy
wrapper that reads the token at startup, so the launchd plist never stores
the token in plaintext. Without the keychain entry, hatchkit falls back to
embedding the DNS token from `hatchkit config add dns` in the plist.

### 3. Caddy with the Cloudflare DNS plugin

```
brew install caddy
caddy list-modules | grep cloudflare
```

If `dns.providers.cloudflare` isn't in the module list, rebuild with
xcaddy:

```
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build --with github.com/caddy-dns/cloudflare
```

### 4. Wire it all up

```
hatchkit dev-setup init
```

This writes `~/.config/dev/Caddyfile`, writes/loads a launchd job that runs
Caddy on a free port (default 9443, auto-bumps if taken), registers
`tailscale serve --tcp=443 → localhost:<caddyPort>`, and upserts the
`*.local.trebeljahr.com` DNS-only A record when Cloudflare credentials are
available. Idempotent — safe to re-run.

### 5. Verify

```
hatchkit doctor
```

Look for the **Local-dev** rows. They should be green:

- Tailscale daemon
- Caddy installed
- Caddy cloudflare plugin
- Cloudflare ACME token in keychain, or Cloudflare API token in plist
- Caddy launchd job
- DNS A record
- Tailscale serve bridge

## Per-project bits

This project's slug is **`streaks`**, recorded in
`.hatchkit.json` under `localDev.slug`. When `pnpm dev` starts, the
hatchkit dev plugin:

1. Reads the slug + the live dev port from the running server.
2. Writes/updates `~/.config/dev/projects/streaks.caddy` pointing at
   that port. Caddy's `--watch` picks it up without a restart.
3. Probes `tailscale serve status` for the TCP=443 bridge.
4. Prints a banner:

```
➜  Local:     http://localhost:<port>/
➜  Tailscale: https://streaks.local.trebeljahr.com/
```

`HATCHKIT_LOCAL_DEV=0` in the environment disables the plugin entirely;
the dev server falls back to its default banner.

## Mobile/devices

For browser testing on a phone or tablet, install Tailscale on the device,
sign in to the same tailnet, and open:

```
https://streaks.local.trebeljahr.com/
```

For the native Capacitor loop, the scaffolded `pnpm dev:ios` and
`pnpm dev:android` scripts run the WebView against `CAP_DEV_URL`.
The iOS script targets the Simulator; the Android script targets an emulator
or attached device. Simulators/emulators use local host routes automatically.
Android physical devices auto-pick this Tailscale URL when `.hatchkit.json`
has `localDev.slug`; otherwise Android devices can use either:

```
LAN_IP=<your-lan-ip> pnpm dev:android
```

or, when the device is on Tailscale and this host setup is green:

```
CAP_DEV_URL=https://streaks.local.trebeljahr.com/ pnpm dev:android
```

For a real iPhone, set `CAP_DEV_URL=https://streaks.local.trebeljahr.com/`, run `npx cap sync ios`,
then launch from Xcode via `npx cap open ios`.

## Cleanup

If you tear down this project:

```
hatchkit destroy
```

…also removes `~/.config/dev/projects/streaks.caddy`. Other projects'
fragments stay put.
