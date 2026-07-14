import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Amberboard",
  description:
    "Onchain cheer leaderboard of the Amberforge project on Base Sepolia. Cheer, climb the board, earn an Amber Cube.",
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
