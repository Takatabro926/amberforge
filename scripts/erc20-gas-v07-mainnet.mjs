// Pay-gas-in-USDC on Base MAINNET — EntryPoint v0.7 SimpleAccount owned by the helper EOA.
// Mainnet finał of the Sepolia erc20-gas-v07.mjs run (same flow, real USDC).
//
// Usage: PIMLICO_API_KEY=... HELPER_PRIVATE_KEY=0x... node erc20-gas-v07-mainnet.mjs [--address-only]

import { createPublicClient, http, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { prepareUserOperationForErc20Paymaster } from "permissionless/experimental/pimlico";

const BOARD = "0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const owner = privateKeyToAccount(process.env.HELPER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

const account = await toSimpleSmartAccount({
  client: publicClient,
  owner,
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});
console.log("SimpleAccount (v0.7, mainnet):", account.address);
if (process.argv.includes("--address-only")) process.exit(0);

const usdcBal = (a) => publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [a] });
console.log("account USDC:", (await usdcBal(account.address)).toString());
console.log("account ETH:", (await publicClient.getBalance({ address: account.address })).toString());

const pimlicoUrl = `https://api.pimlico.io/v2/base/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({
  transport: http(pimlicoUrl),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});

const smartAccountClient = createSmartAccountClient({
  account,
  chain: base,
  bundlerTransport: http(pimlicoUrl),
  paymaster: pimlicoClient,
  paymasterContext: { token: USDC },
  userOperation: {
    prepareUserOperation: prepareUserOperationForErc20Paymaster(pimlicoClient),
    estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
  },
});

const hash = await smartAccountClient.sendTransaction({
  calls: [{ to: BOARD, data: "0x34e5a1f5" }], // cheer()
});
console.log("cheer tx (gas in USDC, v0.7, mainnet):", hash);
await publicClient.waitForTransactionReceipt({ hash });
console.log("account USDC after:", (await usdcBal(account.address)).toString());
