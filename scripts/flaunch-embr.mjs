// Launch Amber Ember (EMBR) on Flaunch (Base mainnet).
// Below $10k market cap Flaunch charges no protocol fee — cost is gas only.
// Usage: PRIVATE_KEY=0x... node flaunch-embr.mjs

import { createFlaunch } from "@flaunch/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import sharp from "sharp";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
console.log("Creator:", account.address);

// Simple ember artwork: amber glow on dark forge background (SVG -> PNG -> base64)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#14100b"/>
  <circle cx="256" cy="280" r="120" fill="#ff6a00" opacity="0.55"/>
  <circle cx="256" cy="270" r="80" fill="#ffb300" opacity="0.85"/>
  <circle cx="256" cy="262" r="44" fill="#ffe27a"/>
  <text x="256" y="440" font-family="monospace" font-size="56" text-anchor="middle" fill="#ffb300">EMBR</text>
</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
const base64Image = `data:image/png;base64,${png.toString("base64")}`;
console.log("image ready:", png.length, "bytes");

const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

const flaunch = createFlaunch({ publicClient, walletClient });

const hash = await flaunch.flaunchIPFS({
  name: "Amber Ember",
  symbol: "EMBR",
  fairLaunchPercent: 0, // FairLaunch deprecated in current protocol version
  fairLaunchDuration: 0,
  initialMarketCapUSD: 1_000, // minimum; below $10k => no protocol fee
  creator: account.address,
  creatorFeeAllocationPercent: 80, // 80% of swap fees to creator, 20% to community
  metadata: {
    base64Image,
    description:
      "Ember from the Amberforge learning project on Base. Launched via Flaunch as part of a four-phase builder program.",
    websiteUrl: "https://amberforge-board.vercel.app",
  },
});
console.log("flaunch tx:", hash);

await publicClient.waitForTransactionReceipt({ hash });
const pool = await flaunch.getPoolCreatedFromTx(hash);
if (pool) {
  console.log("EMBR memecoin address:", pool.memecoin);
  console.log("Flaunch NFT tokenId:", pool.tokenId?.toString?.() ?? pool.tokenId);
}
