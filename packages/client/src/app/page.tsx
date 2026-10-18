import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Two minutes counts.
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Streaks tracks timed practice: piano, writing, drawing, learning. Start
          the timer, stay two minutes, and the day counts. The timer counts
          up, so there is no deadline to miss.
        </p>
        <ul className="mb-8 space-y-3 text-left text-muted-foreground">
          <li>
            Each practice has a weekly target, like five sessions a week. A
            blank day inside that target doesn&apos;t break your streak.
          </li>
          <li>
            Seven credited days in a row earn a repair token. You can hold
            three, and you choose which missed day from the last week to fill.
          </li>
          <li>
            Your momentum score weighs recent days most, so a comeback shows
            up within days.
          </li>
        </ul>
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
