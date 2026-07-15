import { describe, expect, it } from "vitest";
import { encodeFunctionData, getAddress, toFunctionSelector } from "viem";
import {
  AMBERMIND_AGENT_ID,
  AMBR_ADDRESS,
  ANCHOR_ADDRESS,
  BOARD_ADDRESS,
  CUBES_ADDRESS,
  REGISTRY_ADDRESS,
  ambrAbi,
  anchorAbi,
  boardAbi,
  cubesAbi,
  registryAbi,
} from "../contracts";

describe("addresses", () => {
  const addresses = {
    AMBR_ADDRESS,
    BOARD_ADDRESS,
    CUBES_ADDRESS,
    ANCHOR_ADDRESS,
    REGISTRY_ADDRESS,
  };

  it.each(Object.entries(addresses))("%s is checksummed", (_name, addr) => {
    expect(getAddress(addr)).toBe(addr);
  });

  it("registry matches the canonical ERC-8004 mainnet deployment", () => {
    // A one-character typo here once pointed us at a dead registry (…b432).
    expect(REGISTRY_ADDRESS).toBe("0x8004A169FB4a3325136EB29fA0ceB6D2e539a432");
  });
});

describe("ABIs", () => {
  it("cheer() selector matches the raw 0x34e5a1f5 used by agent scripts", () => {
    expect(toFunctionSelector(boardAbi[0])).toBe("0x34e5a1f5");
    expect(encodeFunctionData({ abi: boardAbi, functionName: "cheer" })).toBe("0x34e5a1f5");
  });

  it("read functions are views with the expected shapes", () => {
    const leaderboard = boardAbi.find((f) => f.name === "leaderboard")!;
    expect(leaderboard.stateMutability).toBe("view");
    expect(leaderboard.outputs.map((o) => o.type)).toEqual([
      "address[]",
      "uint256[]",
      "uint256[]",
    ]);
    expect(cubesAbi.find((f) => f.name === "minted")?.stateMutability).toBe("view");
    expect(ambrAbi.find((f) => f.name === "totalSupply")?.stateMutability).toBe("view");
    expect(anchorAbi.find((f) => f.name === "REPO")?.stateMutability).toBe("view");
  });

  it("getAgentWallet encodes for AmberMind's agent id", () => {
    const data = encodeFunctionData({
      abi: registryAbi,
      functionName: "getAgentWallet",
      args: [AMBERMIND_AGENT_ID],
    });
    expect(data.startsWith(toFunctionSelector(registryAbi[0]))).toBe(true);
    expect(BigInt(`0x${data.slice(10)}`)).toBe(59020n);
  });
});
