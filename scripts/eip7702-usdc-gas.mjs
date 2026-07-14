// EIP-7702 + Pimlico ERC-20 paymaster demo (Base Sepolia):
// the (already delegated) tester EOA sends a userOperation whose gas is paid
// in USDC — zero ETH spent. Batch: [approve(paymaster, 1 USDC), cheer()].
//
// Usage: PIMLICO_API_KEY=... TESTER_PRIVATE_KEY=0x... node eip7702-usdc-gas.mjs

import { createPublicClient, http, erc20Abi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { toSimple7702SmartAccount } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { prepareUserOperationForErc20Paymaster } from "permissionless/experimental/pimlico";

const BOARD = "0x3723A33249C07CC5336aC778Da3fFab85a2d0647";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const owner = privateKeyToAccount(process.env.TESTER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const usdcBal = () => publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [owner.address] });
const ethBal = () => publicClient.getBalance({ address: owner.address });

console.log("EOA:", owner.address);
console.log("USDC before:", (await usdcBal()).toString(), "| ETH before:", (await ethBal()).toString());

const account = await toSimple7702SmartAccount({ client: publicClient, owner });
const pimlicoUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({ transport: http(pimlicoUrl) });

console.log("account entryPoint:", account.entryPoint.address, "v" + account.entryPoint.version);
const quotes = await pimlicoClient.getTokenQuotes({
  tokens: [USDC],
  chain: baseSepolia,
  entryPointAddress: account.entryPoint.address,
});
const paymaster = quotes[0].paymaster;
console.log("ERC-20 paymaster (for this entryPoint):", paymaster, "| exchangeRate:", quotes[0].exchangeRate?.toString?.());

const smartAccountClient = createSmartAccountClient({
  account,
  chain: baseSepolia,
  bundlerTransport: http(pimlicoUrl),
  paymaster: pimlicoClient,
  paymasterContext: { token: USDC },
  userOperation: {
    // Official helper: injects the paymaster approval into the userOp and
    // handles estimation quirks of the ERC-20 paymaster.
    prepareUserOperation: prepareUserOperationForErc20Paymaster(pimlicoClient),
    estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
  },
});

// EOA already delegated (code set in the gasless demo) — no authorization needed this time.
const hash = await smartAccountClient.sendTransaction({
  calls: [{ to: BOARD, data: "0x34e5a1f5" }], // cheer()
});
console.log("cheer tx (gas in USDC):", hash);
await publicClient.waitForTransactionReceipt({ hash });

console.log("USDC after:", (await usdcBal()).toString(), "| ETH after:", (await ethBal()).toString());
