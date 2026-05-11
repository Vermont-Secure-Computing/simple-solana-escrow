import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { fetchEscrowsForWallet } from "../lib/escrowClient";
import EscrowCard from "./EscrowCard";

function shortKey(key) {
  if (!key) return "";
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

function sol(value) {
  return Number(value) / LAMPORTS_PER_SOL;
}

function statusLabel(status) {
  if (status === 0) return "Created";
  if (status === 1) return "Deposits Complete";
  if (status === 2) return "Finalization Suggested";
  if (status === 3) return "Completed";
  return "Unknown";
}

function typeLabel(type) {
  if (type === 0) return "Payment Escrow";
  if (type === 1) return "Bet / Wager";
  if (type === 2) return "Mutual Bond";
  if (type === 3) return "Custom";
  return "Unknown";
}

function MyEscrows() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadEscrows = async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) return;

      setLoading(true);

      const result = await fetchEscrowsForWallet({
        wallet,
        connection,
      });

      setEscrows(result);
    } catch (error) {
      console.error("Failed to fetch escrows:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscrows();
  }, [wallet.publicKey?.toBase58()]);

  if (!wallet.connected) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold">My Escrows</h2>
        <p className="mt-2 text-slate-400">Connect your wallet to view escrows.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-white">My Escrows</h2>
          {/* <p className="mt-1 text-sm text-slate-400">
            Escrows where your wallet is Party A, Party B, or creator.
          </p> */}
        </div>

        <button
          onClick={loadEscrows}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {escrows.length === 0 ? (
        <div className="mt-6 rounded-xl bg-slate-900 p-4 text-slate-400">
          No escrows found for this wallet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {/* {escrows.map((escrow) => {
            const myKey = wallet.publicKey.toBase58();
            const nullKey = SystemProgram.programId.toBase58();

            const role =
              escrow.partyA === myKey
                ? "Party A"
                : escrow.partyB === myKey
                ? "Party B"
                : escrow.creator === myKey
                ? "Creator"
                : "Viewer";

            return (
              <div
                key={escrow.pda}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h3 className="font-bold">{escrow.note || "Untitled Escrow"}</h3>
                    <p className="text-sm text-slate-400">
                      {typeLabel(escrow.escrowType)} · {statusLabel(escrow.status)} · {role}
                    </p>
                  </div>

                  <a
                    href={`https://explorer.solana.com/address/${escrow.pda}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    View Explorer
                  </a>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Escrow PDA</p>
                    <code className="break-all">{escrow.pda}</code>
                  </div>

                  <div>
                    <p className="text-slate-500">Vault</p>
                    <code className="break-all">{escrow.vault}</code>
                  </div>

                  <div>
                    <p className="text-slate-500">Party A</p>
                    <p>
                      {escrow.partyA === nullKey
                        ? "Unassigned"
                        : `${shortKey(escrow.partyA)} ${
                            escrow.partyA === myKey ? "(you)" : ""
                          }`}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Party B</p>
                    <p>
                      {escrow.partyB === nullKey
                        ? "Unassigned"
                        : `${shortKey(escrow.partyB)} ${
                            escrow.partyB === myKey ? "(you)" : ""
                          }`}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Required Deposit A</p>
                    <p>{sol(escrow.requiredDepositA)} SOL</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Required Deposit B</p>
                    <p>{sol(escrow.requiredDepositB)} SOL</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Deposited A</p>
                    <p>{sol(escrow.depositedA)} SOL</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Deposited B</p>
                    <p>{sol(escrow.depositedB)} SOL</p>
                  </div>
                </div>
              </div>
            );
          })} */}

          {escrows.map((escrow) => (
            <EscrowCard
                key={escrow.pda}
                escrow={escrow}
                onFunded={loadEscrows}
            />
            ))}
        </div>
      )}
    </section>
  );
}

export default MyEscrows;