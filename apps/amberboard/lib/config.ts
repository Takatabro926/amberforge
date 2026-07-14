import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

// Builder Code (ERC-8021): every transaction sent through this wagmi config
// carries an attribution suffix so Base.dev credits activity to Amberforge.
const builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE;

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [coinbaseWallet({ appName: "Amberboard" }), injected()],
  transports: {
    [baseSepolia.id]: http(),
  },
  ...(builderCode ? { dataSuffix: Attribution.toDataSuffix({ codes: [builderCode] }) } : {}),
});
