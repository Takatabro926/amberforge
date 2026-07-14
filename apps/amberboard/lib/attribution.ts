import { Attribution } from "ox/erc8021";

// Builder Code (ERC-8021) attribution suffix, appended to write-call calldata
// so Base.dev credits Amberboard's onchain activity to its builder.
// NOTE: config-level `dataSuffix` is not supported by wagmi 2.19 — pass this
// per write call instead (viem's writeContract accepts `dataSuffix`).
const code = process.env.NEXT_PUBLIC_BUILDER_CODE;

export const DATA_SUFFIX = code ? Attribution.toDataSuffix({ codes: [code] }) : undefined;
