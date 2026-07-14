import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

// Builder Code attribution is applied per write call (see lib/attribution.ts) —
// wagmi 2.19 silently drops an unknown config-level `dataSuffix`.
export const config = createConfig({
  chains: [base],
  connectors: [coinbaseWallet({ appName: "Amberboard" }), injected()],
  transports: {
    [base.id]: http(),
  },
});
