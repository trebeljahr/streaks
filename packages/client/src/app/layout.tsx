import type { Metadata, Viewport } from "next";
import { DM_Mono, Outfit, Sora } from "next/font/google";
import { TRPCProvider } from "@/providers/trpc-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { MobileBridgeLoader } from "@/mobile/MobileBridgeLoader";
import { ErrorReporting } from "@/components/error-reporting";
import "@/styles/globals.css";

// Sora for display, Outfit for the interface, DM Mono for anything that
// counts — mono so the digits do not shift width while a timer runs.
const sora = Sora({ subsets: ["latin"], weight: ["600"], variable: "--font-display" });
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  // Absolute og:image and twitter:image URLs for opengraph-image.jpg and
  // twitter-image.jpg (made from docs/marketing/og-wordmark.png).
  metadataBase: new URL("https://streaks.trebeljahr.com"),
  title: {
    default: "Streaks",
    template: "%s | Streaks",
  },
  description: "A practice-session tracker built for getting started.",
};

export const viewport: Viewport = {
  themeColor: "#16141f",
  // The running screen sits under the notch; the layout pads for it itself.
  viewportFit: "cover",
};

/*
 * CI sets this to "" when the repo variable is unset. A ternary, never
 * `domain && <script/>`: that renders "" as a text node inside <head>, the
 * exported HTML has none, hydration fails (React #418), and React's
 * recovery drops every <link> in <head> — the stylesheet included.
 */
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${outfit.variable} ${dmMono.variable}`}>
      <head>
        {plausibleDomain ? (
          <script
            defer
            data-domain={plausibleDomain}
            src={
              process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ||
              "https://plausible.io/js/script.js"
            }
          />
        ) : null}
      </head>
      <body className="min-h-screen bg-ground font-sans antialiased">
        <ErrorReporting />
        <MobileBridgeLoader />
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
