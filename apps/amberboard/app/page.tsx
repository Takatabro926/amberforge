"use client";

import { formatUnits } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";

import {
  AMBR_ADDRESS,
  BOARD_ADDRESS,
  CUBES_ADDRESS,
  ambrAbi,
  boardAbi,
  cubesAbi,
} from "@/lib/contracts";
import { DATA_SUFFIX } from "@/lib/attribution";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && chainId !== baseSepolia.id;

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
        Onchain cheer leaderboard · Base Sepolia ·{" "}
        <a
          href={`https://sepolia.basescan.org/address/${BOARD_ADDRESS}`}
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
                <button onClick={() => switchChain({ chainId: baseSepolia.id })}>
                  SWITCH TO BASE SEPOLIA
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
                    chainId: baseSepolia.id,
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
                    chainId: baseSepolia.id,
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
                  href={`https://sepolia.basescan.org/tx/${mintTx ?? cheerTx}`}
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

      <p className="hint">
        Part of the Amberforge learning project · AMBR token ·{" "}
        <a
          href={`https://sepolia.basescan.org/address/${CUBES_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Amber Cubes
        </a>{" "}
        · agent: AmberMind (ERC-8004 #8095)
      </p>
    </main>
  );
}
