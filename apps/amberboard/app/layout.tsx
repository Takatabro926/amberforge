import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Amberboard",
  description:
    "Onchain cheer leaderboard of the Amberforge project on Base Sepolia. Cheer, climb the board, earn an Amber Cube.",
  other: {
    // Base.dev domain-ownership verification tag
    "base:app_id": "6a568090862b3c002cbb65af",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
