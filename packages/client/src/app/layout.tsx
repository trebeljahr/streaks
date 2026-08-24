import type { Metadata } from "next";
import { TRPCProvider } from "@/providers/trpc-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { MobileBridgeLoader } from "@/mobile/MobileBridgeLoader";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "My App",
    template: "%s | My App",
  },
  description: "A full-stack web application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <MobileBridgeLoader />
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
