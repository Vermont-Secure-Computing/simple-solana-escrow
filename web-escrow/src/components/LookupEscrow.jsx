import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { fetchEscrowByPda } from "../lib/escrowClient";
import EscrowCard from "./EscrowCard";

function LookupEscrow() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [pda, setPda] = useState("");
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    try {
      if (!wallet.connected) {
        alert("Connect wallet first.");
        return;
      }

      setLoading(true);
      setEscrow(null);

      const result = await fetchEscrowByPda({
        wallet,
        connection,
        escrowPda: pda.trim(),
      });

      setEscrow(result);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white">
      <h2 className="text-2xl font-bold text-white">Look Up Escrow</h2>
      <p className="mt-1 text-sm text-slate-300">
        Paste an Escrow PDA shared by the creator.
      </p>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <input
          value={pda}
          onChange={(e) => setPda(e.target.value)}
          placeholder="Escrow PDA"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
        />

        <button
          onClick={handleLookup}
          disabled={loading || !pda.trim()}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {escrow && (
        <div className="mt-6">
          <EscrowCard escrow={escrow} onFunded={handleLookup} />
        </div>
      )}
    </section>
  );
}

export default LookupEscrow;