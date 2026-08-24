import { router, protectedProcedure } from "../trpc.js";
import { env } from "../../config/env.js";

/** Mirrors the `CHANGE_ME_*` sentinel hatchkit writes when the user
 *  deferred Stripe keys during scaffold. Duplicated here (instead of
 *  importing from `../../services/stripe.js`) so the billing router
 *  stays valid even on scaffolds where the Stripe service file was
 *  stripped because the feature wasn't selected. */
function isStripePlaceholder(value: string | undefined): boolean {
  return !!value && value.startsWith("CHANGE_ME_");
}

function isMissing(value: string | undefined): boolean {
  return !value || isStripePlaceholder(value);
}

export const billingRouter = router({
  /** Used by the client to decide whether to render the live billing
   *  controls or a "Stripe is not configured" fallback. Returns the
   *  exact env var names that still need a real value so the UI can
   *  surface a copy-pasteable dotenvx recipe to the developer. */
  status: protectedProcedure.query(() => {
    const checks: Array<{ key: string; value: string | undefined }> = [
      { key: "STRIPE_SECRET_KEY", value: env.STRIPE_SECRET_KEY },
      { key: "STRIPE_PUBLISHABLE_KEY", value: env.STRIPE_PUBLISHABLE_KEY },
      { key: "STRIPE_WEBHOOK_SECRET", value: env.STRIPE_WEBHOOK_SECRET },
    ];
    const missingKeys = checks.filter((c) => isMissing(c.value)).map((c) => c.key);
    const mode = env.STRIPE_MODE || null;
    const envFile = env.isProduction
      ? "packages/server/.env.production"
      : "packages/server/.env.development";
    return {
      // True when hatchkit wrote any Stripe env scaffolding for this
      // project. Lets the client hide billing entirely on builds that
      // never opted into Stripe at scaffold time.
      enabled: !!mode,
      // True when every Stripe secret has a real (non-placeholder) value.
      configured: missingKeys.length === 0,
      mode,
      missingKeys,
      envFile,
      // dotenvx writes encrypted ciphertext in production. The client
      // surfaces the matching `--encrypt` flag in its recipe.
      requiresEncryption: env.isProduction,
    };
  }),
});
