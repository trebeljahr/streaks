/** Auth links are credentials. Production logging requires owner opt-in. */
export function logAuthLink(
  label: string,
  recipient: string,
  url: string,
  source: Record<string, string | undefined> = process.env,
  log: (message: string) => void = console.log,
): void {
  const development = source.NODE_ENV === "development" || source.NODE_ENV === "test";
  if (!development && source.AUTH_LOG_LINKS !== "true") {
    throw new Error("Auth email unavailable; configure mail or explicitly enable AUTH_LOG_LINKS for owner recovery");
  }
  log(`[auth] ${label} URL for ${recipient}: ${url}`);
}

/** Production requires verification unless the operator explicitly opts out. */
export function requireEmailVerification(
  deliveryConfigured: boolean,
  source: Record<string, string | undefined> = process.env,
): boolean {
  if (source.AUTH_REQUIRE_EMAIL_VERIFICATION === "true") return true;
  if (source.AUTH_REQUIRE_EMAIL_VERIFICATION === "false") return false;
  if (source.AUTH_REQUIRE_EMAIL_VERIFICATION) {
    throw new Error("AUTH_REQUIRE_EMAIL_VERIFICATION must be true or false");
  }
  return source.NODE_ENV === "production" || deliveryConfigured;
}
