import { afterEach, describe, expect, it, vi } from "vitest";
import { Attribution } from "ox/erc8021";

const BUILDER_CODE = "bc_mlikghsq";

// DATA_SUFFIX is computed at module load from NEXT_PUBLIC_BUILDER_CODE,
// so each case re-imports the module with a fresh env.
async function loadDataSuffix(code: string | undefined) {
  vi.resetModules();
  if (code === undefined) delete process.env.NEXT_PUBLIC_BUILDER_CODE;
  else process.env.NEXT_PUBLIC_BUILDER_CODE = code;
  const mod = await import("../attribution");
  return mod.DATA_SUFFIX;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BUILDER_CODE;
});

describe("DATA_SUFFIX", () => {
  it("is undefined when NEXT_PUBLIC_BUILDER_CODE is not set", async () => {
    expect(await loadDataSuffix(undefined)).toBeUndefined();
  });

  it("round-trips the builder code through the ERC-8021 suffix", async () => {
    const suffix = await loadDataSuffix(BUILDER_CODE);
    expect(suffix).toBeDefined();
    // fromData parses a full calldata blob; the suffix alone is a valid one.
    const parsed = Attribution.fromData(suffix!);
    expect(parsed.codes).toEqual([BUILDER_CODE]);
  });

  it("survives being appended to real calldata (cheer selector)", async () => {
    const suffix = await loadDataSuffix(BUILDER_CODE);
    const calldata = (`0x34e5a1f5` + suffix!.slice(2)) as `0x${string}`;
    const parsed = Attribution.fromData(calldata);
    expect(parsed.codes).toEqual([BUILDER_CODE]);
  });
});
