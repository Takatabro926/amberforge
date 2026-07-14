export const AMBR_ADDRESS = "0x85bFC3Cd262D8eFDA7d299BaBf446f054D938382" as const;
export const BOARD_ADDRESS = "0x3723A33249C07CC5336aC778Da3fFab85a2d0647" as const;
export const CUBES_ADDRESS = "0xEa501373F771eAaC2F6d93230815c2B389426aD9" as const;

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
