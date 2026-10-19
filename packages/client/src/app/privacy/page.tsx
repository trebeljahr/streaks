import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, errorReportCopy } from "@/lib/privacy-copy";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What the error reports ${APP_NAME} sends contain, and who receives them.`,
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <main className="mx-auto w-full max-w-2xl py-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Privacy</h1>
        <p className="mb-10 text-lg text-muted-foreground">
          This page covers the error reports {APP_NAME} sends. It does not yet
          describe the other data {APP_NAME} keeps, such as your account.
        </p>

        <section className="space-y-4 text-muted-foreground">
          <h2 className="text-2xl font-semibold text-foreground">
            Error reports
          </h2>
          <p>{errorReportCopy.when}</p>
          <p>A report contains:</p>
          <ul className="list-disc space-y-1 pl-6">
            {errorReportCopy.contains.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>A report never contains:</p>
          <ul className="list-disc space-y-1 pl-6">
            {errorReportCopy.omits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{errorReportCopy.operator}</p>
          <p>{errorReportCopy.ip}</p>
        </section>

        <Link href="/" className="mt-10 inline-block text-sm underline">
          Back to {APP_NAME}
        </Link>
      </main>
    </div>
  );
}
