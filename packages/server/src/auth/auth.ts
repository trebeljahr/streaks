import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { env, getTrustedOrigins } from "../config/env.js";
import { sendEmail } from "../services/email.js";

/**
 * better-auth instance. Must be initialized AFTER mongoose.connect() because
 * it uses the same MongoDB URI.
 *
 * We create a separate MongoClient (not from mongoose) to avoid the type
 * mismatch between mongoose's bundled mongodb driver and better-auth's.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null;
let _authClient: MongoClient | null = null;

export async function initAuth(): Promise<void> {
  _authClient = new MongoClient(env.MONGODB_URI);
  await _authClient.connect();
  const db = _authClient.db();

  _auth = betterAuth({
    database: mongodbAdapter(db),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: getTrustedOrigins(),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true once Listmonk + SES is configured
      async sendResetPassword({ user, url }: { user: { email: string }; url: string }) {
        if (!env.LISTMONK_URL || !env.LISTMONK_TX_TEMPLATE_ID) {
          console.log(`[auth] Password reset URL for ${user.email}: ${url}`);
          return;
        }
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Click this link to reset your password: ${url}`,
          html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
        });
      },
      async sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
        if (!env.LISTMONK_URL || !env.LISTMONK_TX_TEMPLATE_ID) {
          console.log(`[auth] Verification URL for ${user.email}: ${url}`);
          return;
        }
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Click this link to verify your email: ${url}`,
          html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
        });
      },
    },

    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
}

export function getAuth() {
  if (!_auth) {
    throw new Error(
      "Auth not initialized. Call initAuth() after database connection.",
    );
  }
  return _auth;
}

export async function disconnectAuth(): Promise<void> {
  if (_authClient) {
    await _authClient.close();
    _authClient = null;
  }
}
