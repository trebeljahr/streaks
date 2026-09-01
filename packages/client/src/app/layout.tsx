import type { Metadata, Viewport } from "next";
import { DM_Mono, Outfit, Sora } from "next/font/google";
import { TRPCProvider } from "@/providers/trpc-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { MobileBridgeLoader } from "@/mobile/MobileBridgeLoader";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${outfit.variable} ${dmMono.variable}`}>
      <head>
        {/* OpenPanel analytics — replace with your client ID */}
        {process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID && (
          <script
            defer
            async
            src="https://openpanel.dev/op.js"
            data-client-id={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID}
            data-track-screenviews="true"
          />
        )}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={
              process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ||
              "https://plausible.io/js/script.js"
            }
          />
        )}
      </head>
      <body className="min-h-screen bg-ground font-sans antialiased">
        <MobileBridgeLoader />
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
