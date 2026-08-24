import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Welcome to My App
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          A full-stack starter with auth, payments, real-time, and more.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
