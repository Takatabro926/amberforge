// EIP-7702 + Pimlico paymaster demo (Base Sepolia):
// the tester EOA delegates to Simple7702Account code and sends a SPONSORED
// (gasless) userOperation calling cheer() on the Sepolia AmberBoard.
//
// Usage: PIMLICO_API_KEY=... TESTER_PRIVATE_KEY=0x... node eip7702-gasless.mjs

import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { toSimple7702SmartAccount } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";

const BOARD = "0x3723A33249C07CC5336aC778Da3fFab85a2d0647"; // Sepolia AmberBoard
const boardAbi = [
  { type: "function", name: "cheer", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cheers", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
];

const owner = privateKeyToAccount(process.env.TESTER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

console.log("EOA (owner):", owner.address);
console.log("ETH before:", (await publicClient.getBalance({ address: owner.address })).toString());
console.log("code before:", await publicClient.getCode({ address: owner.address }) ?? "0x (none)");

const account = await toSimple7702SmartAccount({ client: publicClient, owner });
console.log("7702 implementation:", account.authorization.address);

const pimlicoUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({ transport: http(pimlicoUrl) });

const smartAccountClient = createSmartAccountClient({
  account,
  chain: baseSepolia,
  bundlerTransport: http(pimlicoUrl),
  paymaster: pimlicoClient, // Pimlico sponsors the gas
  userOperation: {
    estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
  },
});

const authorization = await owner.signAuthorization({
  address: account.authorization.address,
  chainId: baseSepolia.id,
  nonce: await publicClient.getTransactionCount({ address: owner.address }),
});

const hash = await smartAccountClient.sendTransaction({
  to: BOARD,
  data: "0x34e5a1f5", // cheer()
  authorization,
});
console.log("tx (via bundler):", hash);
await publicClient.waitForTransactionReceipt({ hash });

console.log("code after:", await publicClient.getCode({ address: owner.address }));
console.log("ETH after:", (await publicClient.getBalance({ address: owner.address })).toString());
console.log(
  "cheers(EOA):",
  (await publicClient.readContract({ address: BOARD, abi: boardAbi, functionName: "cheers", args: [owner.address] })).toString()
);
