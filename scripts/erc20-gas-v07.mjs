// Pay-gas-in-USDC demo on EntryPoint v0.7 (SimpleAccount owned by the tester EOA).
// Isolates whether the ERC-20 paymaster issue is specific to EPv0.8/7702.
//
// Usage: PIMLICO_API_KEY=... TESTER_PRIVATE_KEY=0x... node erc20-gas-v07.mjs

import { createPublicClient, http, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { prepareUserOperationForErc20Paymaster } from "permissionless/experimental/pimlico";

const BOARD = "0x3723A33249C07CC5336aC778Da3fFab85a2d0647";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const owner = privateKeyToAccount(process.env.TESTER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const account = await toSimpleSmartAccount({
  client: publicClient,
  owner,
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});
console.log("SimpleAccount (v0.7):", account.address);

const usdcBal = (a) => publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [a] });
console.log("account USDC:", (await usdcBal(account.address)).toString());
console.log("account ETH:", (await publicClient.getBalance({ address: account.address })).toString());

const pimlicoUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({
  transport: http(pimlicoUrl),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});

const smartAccountClient = createSmartAccountClient({
  account,
  chain: baseSepolia,
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
console.log("cheer tx (gas in USDC, v0.7):", hash);
await publicClient.waitForTransactionReceipt({ hash });
console.log("account USDC after:", (await usdcBal(account.address)).toString());