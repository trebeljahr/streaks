"use client";

import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  const profileQuery = trpc.profile.get.useQuery();
  const billingStatus = trpc.billing.status.useQuery();
  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  function handleThemeChange(theme: "light" | "dark" | "system") {
    updateMutation.mutate({ preferences: { theme } });
  }

  function handleNotificationToggle() {
    const current = profileQuery.data?.preferences.notifications ?? true;
    updateMutation.mutate({ preferences: { notifications: !current } });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="max-w-md space-y-8">
        {/* Theme */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium capitalize ${
                  profileQuery.data?.preferences.theme === theme
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent"
                }`}
                data-testid={`theme-${theme}`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={profileQuery.data?.preferences.notifications ?? true}
              onChange={handleNotificationToggle}
              className="h-4 w-4 rounded border-input"
              data-testid="notifications-toggle"
            />
            <span className="text-sm">Enable email notifications</span>
          </label>
        </div>

        {/* Billing — fallback rendered when hatchkit scaffolded Stripe
            but the user deferred their keys (or rotated them and left
            CHANGE_ME placeholders behind). The notice spells out which
            STRIPE_* vars are missing and the exact `dotenvx set` recipe
            so a developer can wire it up without leaving the page. */}
        {billingStatus.data?.enabled ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Billing</h2>
            {billingStatus.data.configured ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription and payment methods.
                </p>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
                  data-testid="manage-billing"
                >
                  Manage billing
                </button>
              </>
            ) : (
              <div
                className="space-y-3 rounded-md border border-amber-500/40 bg-amber-50/40 p-4 dark:bg-amber-950/20"
                data-testid="stripe-unconfigured-notice"
              >
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Stripe is not fully configured
                  {billingStatus.data.mode
                    ? ` (mode: ${billingStatus.data.mode})`
                    : ""}
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  Billing endpoints (checkout, billing portal, webhooks)
                  will return errors until every Stripe secret has a real
                  value. The rest of the app is unaffected.
                </p>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Missing env vars:</p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {billingStatus.data.missingKeys.map((key) => (
                      <li key={key}>
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {key}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Fix:</p>
                  <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                    <li>
                      Grab your sk + pk from{" "}
                      <a
                        href={
                          billingStatus.data.mode === "live"
                            ? "https://dashboard.stripe.com/apikeys"
                            : "https://dashboard.stripe.com/sandboxes"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        the Stripe dashboard
                      </a>
                      .
                    </li>
                    <li>
                      Replace each placeholder in{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {billingStatus.data.envFile}
                      </code>{" "}
                      via:
                      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                        {billingStatus.data.missingKeys
                          .map(
                            (key) =>
                              `pnpm --filter @starter/server exec dotenvx set ${key} <value> -f ${billingStatus.data.envFile}${billingStatus.data.requiresEncryption ? " --encrypt" : ""}`,
                          )
                          .join("\n")}
                      </pre>
                    </li>
                    <li>
                      Create the webhook endpoint at{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        /api/stripe/webhook
                      </code>{" "}
                      in the dashboard (or use{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        stripe listen
                      </code>{" "}
                      for local dev) and set the resulting{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        STRIPE_WEBHOOK_SECRET
                      </code>
                      .
                    </li>
                    <li>Restart the server.</li>
                  </ol>
                </div>
                <button
                  disabled
                  className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border border-input px-4 text-sm font-medium opacity-50"
                  data-testid="manage-billing-disabled"
                >
                  Manage billing (unavailable)
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Danger zone */}
        <div className="space-y-4 rounded-md border border-destructive/30 p-4">
          <h2 className="text-lg font-semibold text-destructive">
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-account"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
