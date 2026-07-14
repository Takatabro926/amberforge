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
