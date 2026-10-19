import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/privacy-copy";

const IMPRINT_ADDRESS = "imprint+streaks@trebeljahr.com";

export const metadata: Metadata = {
  title: "Imprint",
  description: `Provider information for ${APP_NAME}, as § 5 DDG and § 18 (2) MStV require.`,
};

const linkClass = "text-foreground underline underline-offset-2";

function Address() {
  return (
    <p>
      Rico Trebeljahr
      <br />
      c/o Block Services
      <br />
      Stuttgarter Str. 106
      <br />
      70736 Fellbach
      <br />
      Germany
    </p>
  );
}

export default function ImprintPage() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <main className="mx-auto w-full max-w-2xl py-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Imprint</h1>
        <p className="mb-4 text-lg text-muted-foreground">
          Information pursuant to § 5 DDG (German Digital Services Act) and
          § 18 (2) MStV (Interstate Media Treaty).
        </p>
        <p className="mb-10 text-muted-foreground">
          See also the{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>{" "}
          page.
        </p>

        <div className="space-y-10">
          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">
              Service Provider
            </h2>
            <Address />
          </section>

          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">Contact</h2>
            <p>
              Email:{" "}
              <a href={`mailto:${IMPRINT_ADDRESS}`} className={linkClass}>
                {IMPRINT_ADDRESS}
              </a>
            </p>
          </section>

          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">
              Person Responsible for Content (§ 18 (2) MStV)
            </h2>
            <Address />
          </section>

          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">
              Liability for Content
            </h2>
            <p>
              As a service provider, I am responsible for my own content on
              these pages in accordance with § 7 (1) DDG and general laws.
              However, pursuant to §§ 8 to 10 DDG, I am not obligated as a
              service provider to monitor transmitted or stored third-party
              information or to investigate circumstances that indicate illegal
              activity.
            </p>
            <p>
              Obligations to remove or block the use of information under
              general laws remain unaffected. However, liability in this regard
              is only possible from the point in time at which a specific legal
              violation becomes known. Upon becoming aware of such violations,
              I will remove this content immediately.
            </p>
          </section>

          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">
              Liability for Links
            </h2>
            <p>
              This site contains links to external websites of third parties
              over whose content I have no influence. Therefore, I cannot
              assume any liability for these third-party contents. The
              respective provider or operator of the pages is always
              responsible for the content of the linked pages.
            </p>
          </section>

          <section className="space-y-4 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground">
              Copyright
            </h2>
            <p>
              The content and works created by the site operator on these pages
              are subject to German copyright law. Duplication, processing,
              distribution, and any kind of use outside the limits of copyright
              require the written consent of the respective author or creator.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm underline">
          Back to {APP_NAME}
        </Link>
      </main>
    </div>
  );
}
