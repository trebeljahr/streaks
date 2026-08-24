import { config as dotenvxConfig } from "@dotenvx/dotenvx";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// dotenvx handles encrypted .env files transparently. It looks for
// `DOTENV_PRIVATE_KEY_*` either in the process env (Coolify / CI set
// it there) or in a local .env.keys file (dev workstation).
//
// Load order mirrors conventional dotenv behavior:
//   - production: only .env.production (encrypted, committed to git)
//   - otherwise:  .env.development (plaintext, local-dev defaults)
// Any plaintext values in a production file stay plaintext — dotenvx
// only decrypts values whose cipher prefix starts with "encrypted:".
const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "../..");
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
const envPath = resolve(serverRoot, envFile);
if (existsSync(envPath)) {
  dotenvxConfig({ path: envPath });
}

function getRequired(key: string): string {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? "";
}

function getOptional(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  NODE_ENV: getOptional("NODE_ENV", "development"),
  PORT: parseInt(getOptional("PORT", "5000"), 10),
  MONGODB_URI: getRequired("MONGODB_URI"),
  REDIS_URL: getOptional("REDIS_URL"),

  // Auth
  BETTER_AUTH_SECRET: getRequired("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: getRequired("BETTER_AUTH_URL"),
  FRONTEND_URL: getRequired("FRONTEND_URL"),
  // Additional CORS / auth origins, comma-separated. Use this for
  // native clients:
  //   capacitor://localhost,https://localhost   (Capacitor iOS+Android)
  //   app://-                                    (custom Electron protocol)
  // Electron file:// sends Origin: null, which can't be allowed with
  // credentials:true — register a custom protocol in the main process
  // and list it here instead.
  TRUSTED_ORIGINS: getOptional("TRUSTED_ORIGINS"),
  GOOGLE_CLIENT_ID: getOptional("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getOptional("GOOGLE_CLIENT_SECRET"),

  // Stripe
  // Hatchkit provisions one set per environment:
  //   .env.development → sandbox keys (STRIPE_MODE=test)
  //   .env.production  → live keys    (STRIPE_MODE=live, dotenvx-encrypted)
  // Each project gets its own pair (paste once at `hatchkit create` /
  // `hatchkit adopt`); STRIPE_WEBHOOK_SECRET is auto-minted by hatchkit.
  STRIPE_MODE: getOptional("STRIPE_MODE"),
  STRIPE_SECRET_KEY: getOptional("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY: getOptional("STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET: getOptional("STRIPE_WEBHOOK_SECRET"),

  // Email — Listmonk + SES. Listmonk owns the API surface (tx + campaigns
  // + subscriber management); SES is the SMTP relay it sends through.
  // `hatchkit add <project> listmonk-ses` provisions the SES identity +
  // Listmonk lists/templates and writes these values.
  LISTMONK_URL: getOptional("LISTMONK_URL"),
  LISTMONK_API_USER: getOptional("LISTMONK_API_USER"),
  LISTMONK_API_TOKEN: getOptional("LISTMONK_API_TOKEN"),
  LISTMONK_FROM_EMAIL: getOptional("LISTMONK_FROM_EMAIL"),
  LISTMONK_FROM: getOptional("LISTMONK_FROM"),
  LISTMONK_LIVE_LIST_ID: getOptional("LISTMONK_LIVE_LIST_ID"),
  LISTMONK_TEST_LIST_ID: getOptional("LISTMONK_TEST_LIST_ID"),
  LISTMONK_TX_TEMPLATE_ID: getOptional("LISTMONK_TX_TEMPLATE_ID"),
  LISTMONK_CAMPAIGN_TEMPLATE_ID: getOptional("LISTMONK_CAMPAIGN_TEMPLATE_ID"),
  // Pre-filled into .env.development by `hatchkit add <project>
  // listmonk-ses` when a global default forwarding email is configured.
  // The bundled `pnpm newsletter:test-tx` / `newsletter:welcome` /
  // `newsletter:verify` scripts default to this address so a fresh
  // provision is one command away from a real send in your own inbox.
  LISTMONK_TEST_RECIPIENT: getOptional("LISTMONK_TEST_RECIPIENT"),

  // S3
  S3_ENDPOINT: getOptional("S3_ENDPOINT"),
  S3_BUCKET_NAME: getOptional("S3_BUCKET_NAME", "streaks-assets"),
  S3_PUBLIC_URL: getOptional("S3_PUBLIC_URL"),
  S3_FORCE_PATH_STYLE: getOptional("S3_FORCE_PATH_STYLE") === "true",
  AWS_REGION: getOptional("AWS_REGION", "us-east-1"),
  AWS_ACCESS_KEY_ID: getOptional("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: getOptional("AWS_SECRET_ACCESS_KEY"),

  // ML services (Modal/RunPod endpoints)
  ML_BACKGROUND_REMOVAL_ENDPOINT: getOptional("ML_BACKGROUND_REMOVAL_ENDPOINT"),
  ML_SUBTITLES_ENDPOINT: getOptional("ML_SUBTITLES_ENDPOINT"),
  ML_IMAGE_RECOGNITION_ENDPOINT: getOptional("ML_IMAGE_RECOGNITION_ENDPOINT"),
  ML_3D_EXTRACTION_ENDPOINT: getOptional("ML_3D_EXTRACTION_ENDPOINT"),
  ML_3D_SAM_OBJECTS_ENDPOINT: getOptional("ML_3D_SAM_OBJECTS_ENDPOINT"),
  ML_3D_SAM_BODY_ENDPOINT: getOptional("ML_3D_SAM_BODY_ENDPOINT"),
  ML_3D_HUNYUAN_ENDPOINT: getOptional("ML_3D_HUNYUAN_ENDPOINT"),
  ML_3D_TRELLIS_ENDPOINT: getOptional("ML_3D_TRELLIS_ENDPOINT"),

  // Monitoring
  SENTRY_DSN: getOptional("SENTRY_DSN"),

  isProduction: getOptional("NODE_ENV") === "production",
  isTest: getOptional("NODE_ENV") === "test",
} as const;

/** All origins trusted for CORS + better-auth. Merges FRONTEND_URL with
 *  the optional TRUSTED_ORIGINS CSV so native shells (Capacitor, custom
 *  Electron protocols) can authenticate against the same API. */
export function getTrustedOrigins(): string[] {
  const extras = env.TRUSTED_ORIGINS
    ? env.TRUSTED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return env.FRONTEND_URL ? [env.FRONTEND_URL, ...extras] : extras;
}
