import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Amberboard",
  description:
    "Onchain cheer leaderboard of the Amberforge project on Base. Cheer, climb the board, earn an Amber Cube.",
  other: {
    // Base.dev domain-ownership verification tag
    "base:app_id": "6a568090862b3c002cbb65af",
    // talent.app project-ownership verification tag
    "talentapp:project_verification":
      "5d88ce1d60ddb3a0e1866e1947033803832b5e00504d27c7d78ad325e46ad1b6dc8a58bbd29fe8284acd24d78f63cf78960f20700e14aba979a00e9a824cf962",
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
