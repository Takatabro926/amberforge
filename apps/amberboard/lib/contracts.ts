// Base Mainnet (8453). Sepolia twins: AMBR 0x85bF…8382, board 0x3723…0647, cubes 0xEa50…6aD9.
export const AMBR_ADDRESS = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5" as const;
export const BOARD_ADDRESS = "0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637" as const;
export const CUBES_ADDRESS = "0x3C509A043C370b79bBd2F15fd5700a8695e348Ff" as const;

export const boardAbi = [
  {
    type: "function",
    name: "cheer",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cheers",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalCheers",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "leaderboard",
    inputs: [],
    outputs: [
      { name: "addrs", type: "address[]" },
      { name: "counts", type: "uint256[]" },
      { name: "ambrBalances", type: "uint256[]" },
    ],
    stateMutability: "view",
  },
] as const;

export const cubesAbi = [
  {
    type: "function",
    name: "mintCube",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "minted",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextId",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const ambrAbi = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// AmberAnchor — CREATE2-deterministic pointer to the project (same address on any EVM chain)
export const ANCHOR_ADDRESS = "0x7559EaCa8Eaa1705B5a7C9b25Fd508A41326E6A1" as const;
export const anchorAbi = [
  {
    type: "function",
    name: "REPO",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

// ERC-8004 Identity Registry (Base Mainnet) — AmberMind is agentId 59020
export const REGISTRY_ADDRESS = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
export const AMBERMIND_AGENT_ID = 59020n;
export const registryAbi = [
  {
    type: "function",
    name: "getAgentWallet",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

// Verifiable claim about AmberMind's first autonomous run (EAS, Base Mainnet)
export const SENTINEL_ATTESTATION_URL =
  "https://base.easscan.org/attestation/view/0x7b8d23cbe384df5f02ef23ede95b6d8744c33ed4064fa0e40bbc3be8dd02d9f2";
export const AMBERMIND_ENS = "ambermind.evmpirate.base.eth";
