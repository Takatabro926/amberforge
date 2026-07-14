// AmberMind agent transaction sender: every tx carries the agent's ERC-8021
// Builder Code suffix (bc_vsdrc64m) so Base attributes the activity to the agent.
// Demo action: cheer() on the mainnet AmberBoard.
//
// Usage: PRIVATE_KEY=0x... node agent-tx.mjs

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";

const BUILDER_CODE = "bc_vsdrc64m"; // keep in sync with builderCode.ts
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });

const BOARD = "0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637";
const boardAbi = [
  { type: "function", name: "cheer", inputs: [], outputs: [], stateMutability: "nonpayable" },
];

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

console.log("agent wallet:", account.address);
const hash = await walletClient.writeContract({
  address: BOARD,
  abi: boardAbi,
  functionName: "cheer",
  dataSuffix: DATA_SUFFIX,
});
console.log("tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("status:", receipt.status, "block:", Number(receipt.blockNumber));

const tx = await publicClient.getTransaction({ hash });
console.log("calldata:", tx.input);
console.log("attribution present:", tx.input.endsWith(DATA_SUFFIX.slice(2)));
