"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";

import { fetchRecentActivity, timeAgo } from "@/lib/activity";
import { fetchNetworkCost } from "@/lib/prices";

import {
  AMBERMIND_AGENT_ID,
  AMBERMIND_ENS,
  AMBR_ADDRESS,
  ANCHOR_ADDRESS,
  BOARD_ADDRESS,
  CUBES_ADDRESS,
  REGISTRY_ADDRESS,
  SENTINEL_ATTESTATION_URL,
  ambrAbi,
  anchorAbi,
  boardAbi,
  cubesAbi,
  registryAbi,
} from "@/lib/contracts";
import { DATA_SUFFIX } from "@/lib/attribution";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ActivityFeed({ you }: { you?: string }) {
  const client = usePublicClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchRecentActivity(client!),
    enabled: !!client,
    refetchInterval: 60_000,
  });

  return (
    <div className="panel">
      <table>
        <thead>
          <tr>
            <th colSpan={3}>recent activity</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={3} className="hint">
                reading logs from chain…
              </td>
            </tr>
          )}
          {items?.length === 0 && (
            <tr>
              <td colSpan={3} className="hint">
                nothing yet
              </td>
            </tr>
          )}
          {items?.map((item) => (
            <tr key={`${item.txHash}-${item.logIndex}`}>
              <td>
                {item.kind === "cheer" ? "📣" : "⬢"}{" "}
                <span className={item.who === you ? "you" : "addr"}>{short(item.who)}</span>
              </td>
              <td>
                <a
                  href={`https://basescan.org/tx/${item.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.detail}
                </a>
              </td>
              <td className="num hint">{timeAgo(item.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NetworkCostPanel() {
  const client = usePublicClient();
  const { data } = useQuery({
    queryKey: ["networkCost"],
    queryFn: () => fetchNetworkCost(client!),
    enabled: !!client,
    refetchInterval: 30_000,
  });

  return (
    <div className="panel">
      <table>
        <thead>
          <tr>
            <th colSpan={2}>live network cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ETH / USD (Chainlink)</td>
            <td className="num">
              {data ? (
                <>
                  ${data.ethUsd.toLocaleString()}
                  {data.stale && <span className="hint"> (stale, {Math.round(data.feedAgeS / 60)}m old)</span>}
                </>
              ) : (
                "—"
              )}
            </td>
          </tr>
          <tr>
            <td>base fee</td>
            <td className="num">{data ? `${data.baseFeeGwei.toFixed(4)} gwei` : "—"}</td>
          </tr>
          <tr>
            <td>cost to cheer right now</td>
            <td className="num">{data ? `$${data.cheerCostUsd.toFixed(4)}` : "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && chainId !== base.id;

  const { data: board, refetch: refetchBoard } = useReadContract({
    address: BOARD_ADDRESS,
    abi: boardAbi,
    functionName: "leaderboard",
  });
  const { data: totalCheers, refetch: refetchTotal } = useReadContract({
    address: BOARD_ADDRESS,
    abi: boardAbi,
    functionName: "totalCheers",
  });
  const { data: ambrSupply } = useReadContract({
    address: AMBR_ADDRESS,
    abi: ambrAbi,
    functionName: "totalSupply",
  });
  const { data: myCheers, refetch: refetchMine } = useReadContract({
    address: BOARD_ADDRESS,
    abi: boardAbi,
    functionName: "cheers",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: hasCube, refetch: refetchCube } = useReadContract({
    address: CUBES_ADDRESS,
    abi: cubesAbi,
    functionName: "minted",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: anchorRepo } = useReadContract({
    address: ANCHOR_ADDRESS,
    abi: anchorAbi,
    functionName: "REPO",
  });
  const { data: agentWallet } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "getAgentWallet",
    args: [AMBERMIND_AGENT_ID],
  });

  const { writeContract: cheer, data: cheerTx, isPending: cheering } = useWriteContract();
  const { writeContract: mint, data: mintTx, isPending: minting } = useWriteContract();

  const { isSuccess: cheerConfirmed } = useWaitForTransactionReceipt({ hash: cheerTx });
  const { isSuccess: mintConfirmed } = useWaitForTransactionReceipt({ hash: mintTx });

  if (cheerConfirmed || mintConfirmed) {
    refetchBoard();
    refetchTotal();
    refetchMine();
    refetchCube();
  }

  const rows = board
    ? board[0]
        .map((addr, i) => ({ addr, cheers: board[1][i], ambr: board[2][i] }))
        .sort((a, b) => (b.cheers > a.cheers ? 1 : -1))
    : [];

  const cheersNeeded = 3n - (myCheers ?? 0n);

  return (
    <main>
      <h1>⬢ AMBERBOARD</h1>
      <p className="sub">
        Onchain cheer leaderboard · Base ·{" "}
        <a
          href={`https://basescan.org/address/${BOARD_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          contract
        </a>
      </p>

      <div className="stats">
        <div className="stat">
          <div className="value">{totalCheers?.toString() ?? "—"}</div>
          <div className="label">total cheers</div>
        </div>
        <div className="stat">
          <div className="value">{rows.length}</div>
          <div className="label">players</div>
        </div>
        <div className="stat">
          <div className="value">
            {ambrSupply ? Number(formatUnits(ambrSupply, 18)).toLocaleString() : "—"}
          </div>
          <div className="label">AMBR supply</div>
        </div>
      </div>

      <div className="panel">
        {!isConnected ? (
          <div className="row">
            <span>Connect to play</span>
            <span>
              {connectors.map((c) => (
                <button key={c.uid} className="ghost" onClick={() => connect({ connector: c })}>
                  {c.name}
                </button>
              ))}
            </span>
          </div>
        ) : (
          <>
            <div className="row">
              <span className="you">{short(address!)}</span>
              <button className="ghost" onClick={() => disconnect()}>
                disconnect
              </button>
            </div>
            {wrongChain && (
              <div className="row" style={{ marginTop: 12 }}>
                <span className="you">wrong network</span>
                <button onClick={() => switchChain({ chainId: base.id })}>
                  SWITCH TO BASE
                </button>
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <span>
                your cheers: <b className="you">{myCheers?.toString() ?? "0"}</b>
              </span>
              <button
                disabled={cheering || wrongChain}
                onClick={() =>
                  cheer({
                    address: BOARD_ADDRESS,
                    abi: boardAbi,
                    functionName: "cheer",
                    chainId: base.id,
                    dataSuffix: DATA_SUFFIX,
                  })
                }
              >
                {cheering ? "cheering…" : "CHEER 📣"}
              </button>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <span>
                Amber Cube:{" "}
                {hasCube ? (
                  <b className="you">minted ✦</b>
                ) : cheersNeeded > 0n ? (
                  `${cheersNeeded} more cheer${cheersNeeded === 1n ? "" : "s"} to unlock`
                ) : (
                  "unlocked!"
                )}
              </span>
              <button
                disabled={minting || wrongChain || hasCube === true || (myCheers ?? 0n) < 3n}
                onClick={() =>
                  mint({
                    address: CUBES_ADDRESS,
                    abi: cubesAbi,
                    functionName: "mintCube",
                    chainId: base.id,
                    dataSuffix: DATA_SUFFIX,
                  })
                }
              >
                {minting ? "minting…" : "MINT CUBE ⬢"}
              </button>
            </div>
            {(cheerTx || mintTx) && (
              <p className="hint">
                last tx:{" "}
                <a
                  href={`https://basescan.org/tx/${mintTx ?? cheerTx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(mintTx ?? cheerTx!)}
                </a>
              </p>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>player</th>
              <th className="num">cheers</th>
              <th className="num">AMBR</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  no cheers yet — be the first
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.addr}>
                <td>{i + 1}</td>
                <td className={r.addr === address ? "you" : "addr"}>{short(r.addr)}</td>
                <td className="num">{r.cheers.toString()}</td>
                <td className="num">{Number(formatUnits(r.ambr, 18)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActivityFeed you={address} />

      <NetworkCostPanel />

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th colSpan={2}>onchain footprint</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>source (read from chain)</td>
              <td className="num">
                {anchorRepo ? (
                  <a href={anchorRepo} target="_blank" rel="noreferrer">
                    {anchorRepo.replace("https://", "")}
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
            <tr>
              <td>
                anchor contract{" "}
                <span className="hint">(CREATE2 — same address on any EVM chain)</span>
              </td>
              <td className="num">
                <a
                  href={`https://basescan.org/address/${ANCHOR_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(ANCHOR_ADDRESS)}
                </a>
              </td>
            </tr>
            <tr>
              <td>agent</td>
              <td className="num addr">{AMBERMIND_ENS}</td>
            </tr>
            <tr>
              <td>agent revenue wallet (ERC-8004)</td>
              <td className="num addr">{agentWallet ? short(agentWallet) : "—"}</td>
            </tr>
            <tr>
              <td>first autonomous run</td>
              <td className="num">
                <a href={SENTINEL_ATTESTATION_URL} target="_blank" rel="noreferrer">
                  EAS attestation ↗
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="hint">
        Part of the Amberforge learning project · AMBR token ·{" "}
        <a
          href={`https://basescan.org/address/${CUBES_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Amber Cubes
        </a>{" "}
        · agent: AmberMind (ERC-8004 #59020)
      </p>
    </main>
  );
}
