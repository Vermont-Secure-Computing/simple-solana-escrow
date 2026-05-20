import { useMemo, useState } from "react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faCartShopping,
} from "@fortawesome/free-solid-svg-icons";
import {
  createEscrow,
  ESCROW_TYPE_PAYMENT,
  ESCROW_TYPE_BET,
  ESCROW_TYPE_MUTUAL_BOND,
  ESCROW_TYPE_CUSTOM,
} from "../lib/escrowClient";

function toLamports(sol) {
  return Math.round(Number(sol) * LAMPORTS_PER_SOL);
}

function CreateEscrow() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [mode, setMode] = useState(null); // "buying" | "selling"
  const [template, setTemplate] = useState("payment");
  const [counterparty, setCounterparty] = useState("");

  const [price, setPrice] = useState("");
  const [yourBond, setYourBond] = useState("");
  const [otherBond, setOtherBond] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const escrowType =
    template === "payment"
      ? ESCROW_TYPE_PAYMENT
      : template === "bet"
      ? ESCROW_TYPE_BET
      : template === "bond"
      ? ESCROW_TYPE_MUTUAL_BOND
      : ESCROW_TYPE_CUSTOM;

  const preview = useMemo(() => {
    const priceNum = Number(price || 0);
    const yourBondNum = Number(yourBond || 0);
    const otherBondNum = Number(otherBond || 0);

    if (!mode) return null;

    if (mode === "buying") {
      return {
        partyARequired: priceNum + yourBondNum,
        partyBRequired: otherBondNum,
        partyALabel: "You / Buyer / Party A",
        partyBLabel: "Seller / Party B",
      };
    }

    return {
      partyARequired: priceNum + otherBondNum,
      partyBRequired: yourBondNum,
      partyALabel: "Buyer / Party A",
      partyBLabel: "You / Seller / Party B",
    };
  }, [mode, price, yourBond, otherBond]);

  const handleCreate = async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        alert("Please connect your wallet first.");
        return;
      }

      if (!mode) {
        alert("Please select: I'm Buying or I'm Selling.");
        return;
      }

      if (!price || !yourBond || !otherBond) {
        alert("Please enter price, your deposit, and other party deposit.");
        return;
      }

      if (Number(price) <= 0 || Number(yourBond) <= 0 || Number(otherBond) <= 0) {
        alert("All amounts must be greater than zero.");
        return;
      }

      let partyA;
      let partyB;

      const nullPubkey = SystemProgram.programId.toBase58();
      const counterpartyPubkey = counterparty.trim()
        ? new PublicKey(counterparty.trim()).toBase58()
        : nullPubkey;

      if (mode === "buying") {
        partyA = wallet.publicKey.toBase58();
        partyB = counterpartyPubkey;
      } else {
        partyA = counterpartyPubkey;
        partyB = wallet.publicKey.toBase58();
      }

      const requiredDepositA = toLamports(preview.partyARequired);
      const requiredDepositB = toLamports(preview.partyBRequired);

      setLoading(true);
      setResult(null);

      const escrowId = Date.now();

      const res = await createEscrow({
        wallet,
        connection,
        escrowType,
        partyA,
        partyB,
        escrowId,
        requiredDepositA,
        requiredDepositB,
        referenceAmount: toLamports(price),
        note,
      });

      setResult(res);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-xl">
      <h2 className="text-2xl font-bold !text-white">Create Escrow</h2>
      <p className="mt-1 text-sm text-slate-300">
        Start by choosing your role. The contract still stores neutral Party A and Party B fields.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setMode("buying")}
          className={`rounded-2xl border p-6 transition ${
            mode === "buying"
              ? "border-blue-500 bg-slate-950 ring-2 ring-blue-500 hover:bg-slate-800"
              : "border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/40">
              <FontAwesomeIcon
                icon={faCartShopping}
                className="text-4xl text-blue-400"
              />
            </div>

            <h3 className="mt-4 text-xl font-bold text-blue-400">
              I’m Buying
            </h3>

            <p className="mt-3 text-sm text-slate-300">
              You are Party A. You will later deposit
              price + your refundable deposit.
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode("selling")}
          className={`rounded-2xl border p-6 transition ${
            mode === "selling"
              ? "border-green-500 bg-slate-950 ring-2 ring-green-500 hover:bg-slate-800"
              : "border-green-500/40 bg-green-600/10 hover:bg-green-600/20"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 border border-green-500/40">
              <FontAwesomeIcon
                icon={faBagShopping}
                className="text-4xl text-green-400"
              />
            </div>

            <h3 className="mt-4 text-xl font-bold text-green-400">
              I’m Selling
            </h3>

            <p className="mt-3 text-sm text-slate-300">
              You are Party B. The buyer will later deposit
              price + buyer deposit.
            </p>
          </div>
        </button>
      </div>

      {mode && (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Price / Payment SOL
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.25"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Your refundable deposit SOL
              </label>
              <input
                value={yourBond}
                onChange={(e) => setYourBond(e.target.value)}
                placeholder="0.05"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Other party refundable deposit SOL
              </label>
              <input
                value={otherBond}
                onChange={(e) => setOtherBond(e.target.value)}
                placeholder="0.05"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {preview && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              <h3 className="mb-2 font-bold text-white">Deposit preview</h3>
              <p>
                <strong>{preview.partyALabel}:</strong>{" "}
                {preview.partyARequired.toFixed(4)} SOL required
              </p>
              <p>
                <strong>{preview.partyBLabel}:</strong>{" "}
                {preview.partyBRequired.toFixed(4)} SOL required
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Note / agreement
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Example: Website design project escrow"
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">{note.length}/200</p>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !wallet.connected}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Escrow"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-white">
          <h3 className="font-bold text-green-300">Escrow Created</h3>

          <p className="mt-3 text-sm text-slate-300">Escrow PDA</p>
          <code className="break-all text-sm">{result.escrowPda}</code>

          <div className="mt-2">
            <button
              onClick={() => navigator.clipboard.writeText(result.escrowPda)}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
            >
              Copy Escrow ID
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-300">Transaction</p>
          <code className="break-all text-sm">{result.signature}</code>
        </div>
      )}
    </section>
  );
}

export default CreateEscrow;