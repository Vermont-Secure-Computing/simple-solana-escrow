import { useState } from "react";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  fundEscrow,
  withdrawBeforeComplete,
  suggestFinalization,
  acceptFinalization,
  rejectFinalization,
} from "../lib/escrowClient";

function sol(value) {
    return Number(value) / LAMPORTS_PER_SOL;
}

function shortKey(key) {
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

function EscrowCard({ escrow, onFunded }) {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [loading, setLoading] = useState(false);

    const [showFinalizationForm, setShowFinalizationForm] = useState(false);
    const [payoutA, setPayoutA] = useState("");
    const [payoutB, setPayoutB] = useState("");
    const [finalizationNote, setFinalizationNote] = useState("");
    const [donationPercent, setDonationPercent] = useState(0);

    const myKey = wallet.publicKey?.toBase58();
    const nullKey = SystemProgram.programId.toBase58();

    const isPartyA = myKey && escrow.partyA === myKey;
    const isPartyB = myKey && escrow.partyB === myKey;
    const canBecomePartyA = escrow.partyA === nullKey && escrow.partyB !== myKey;
    const canBecomePartyB = escrow.partyB === nullKey && escrow.partyA !== myKey;

    let fundAmount = null;
    let fundLabel = "";

    if (isPartyA && Number(escrow.depositedA) === 0) {
        fundAmount = Number(escrow.requiredDepositA);
        fundLabel = `Fund as Party A (${sol(escrow.requiredDepositA)} SOL)`;
    } else if (isPartyB && Number(escrow.depositedB) === 0) {
        fundAmount = Number(escrow.requiredDepositB);
        fundLabel = `Fund as Party B (${sol(escrow.requiredDepositB)} SOL)`;
    } else if (canBecomePartyA && Number(escrow.depositedA) === 0) {
        fundAmount = Number(escrow.requiredDepositA);
        fundLabel = `Join & Fund as Party A (${sol(escrow.requiredDepositA)} SOL)`;
    } else if (canBecomePartyB && Number(escrow.depositedB) === 0) {
        fundAmount = Number(escrow.requiredDepositB);
        fundLabel = `Agree & Fund as Party B (${sol(escrow.requiredDepositB)} SOL)`;
    }

    /**
     * Logic for checking if a party can do a refund and close the escroe
     */
    const canRefundA =
        escrow.status === 0 && isPartyA && Number(escrow.depositedA) > 0;

    const canRefundB =
        escrow.status === 0 && isPartyB && Number(escrow.depositedB) > 0;

    const canRefund = canRefundA || canRefundB;


    const handleFund = async () => {
        try {
            setLoading(true);

            const sig = await fundEscrow({
                wallet,
                connection,
                escrowPda: escrow.pda,
                vaultPda: escrow.vault,
                amountLamports: fundAmount,
            });

            alert(`Escrow funded!\n\nTX:\n${sig}`);
            await onFunded?.();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    function fundingStatus(escrow) {
        const aFunded = Number(escrow.depositedA) === Number(escrow.requiredDepositA);
        const bFunded = Number(escrow.depositedB) === Number(escrow.requiredDepositB);

        if (aFunded && bFunded) return "Both parties funded. Deposits complete.";
        if (aFunded && !bFunded) return "Party A has funded. Waiting for Party B.";
        if (!aFunded && bFunded) return "Party B has funded. Waiting for Party A.";
        return "Waiting for both parties to fund.";
        }

        function statusLabel(status) {
        if (status === 0) return "Created / Funding";
        if (status === 1) return "Deposits Complete";
        if (status === 2) return "Finalization Suggested";
        if (status === 3) return "Completed";
        return "Unknown";
    }


    const handleRefund = async () => {
        try {
            setLoading(true);

            const sig = await withdrawBeforeComplete({
                wallet,
                connection,
                escrowPda: escrow.pda,
                vaultPda: escrow.vault,
                creator: escrow.creator,
            });

            alert(`Refund complete!\n\nTX:\n${sig}`);
            await onFunded?.();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };


    /**
     * Logic for Add Finalization suggestion
     */
    const totalLocked = Number(escrow.depositedA) + Number(escrow.depositedB);

    const canSuggestFinalization = escrow.status === 1 && (isPartyA || isPartyB);

    /**
     * Donation computation handler
     */
    const referenceAmount = Number(escrow.referenceAmount || 0);
    const donationLamports = Math.floor((referenceAmount * Number(donationPercent)) / 100);
    const payoutALamports = Math.round(Number(payoutA || 0) * LAMPORTS_PER_SOL);
    const payoutBLamports = Math.round(Number(payoutB || 0) * LAMPORTS_PER_SOL);
    const payoutTotalLamports = payoutALamports + payoutBLamports + donationLamports;
    const remainingLamports = totalLocked - payoutTotalLamports;
    const payoutIsValid = remainingLamports === 0;
    


    const handleSuggestFinalization = async () => {
        console.log("handleSuggestFinalization: ", finalizationNote)
        try {
            if (!payoutIsValid) {
                alert("Payout A + Payout B must equal total locked amount.");
                return;
            }

            setLoading(true);

            // const sig = await suggestFinalization({
            //     wallet,
            //     connection,
            //     escrowPda: escrow.pda,
            //     payoutA: Math.round(Number(payoutA) * LAMPORTS_PER_SOL),
            //     payoutB: Math.round(Number(payoutB) * LAMPORTS_PER_SOL),
            //     finalizationNote,
            // });
            const sig = await suggestFinalization({
                wallet,
                connection,
                escrowPda: escrow.pda,
                payoutA: payoutALamports,
                payoutB: payoutBLamports,
                proposedDonation: donationLamports,
                finalizationNote,
            });

            alert(`Finalization suggested!\n\nTX:\n${sig}`);

            setShowFinalizationForm(false);

            await onFunded?.();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };


    const isFinalizationSuggested = escrow.status === 2;
    const isFinalizationProposer = myKey && escrow.finalizationProposer === myKey;
    const canRespondToFinalization = isFinalizationSuggested && !isFinalizationProposer && (isPartyA || isPartyB);

    const handleAcceptFinalization = async () => {
        try {
            setLoading(true);

            const sig = await acceptFinalization({
            wallet,
            connection,
            escrowPda: escrow.pda,
            vaultPda: escrow.vault,
            partyA: escrow.partyA,
            partyB: escrow.partyB,
            });

            alert(`Finalization accepted!\n\nTX:\n${sig}`);

            await onFunded?.();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRejectFinalization = async () => {
        try {
            setLoading(true);

            const sig = await rejectFinalization({
            wallet,
            connection,
            escrowPda: escrow.pda,
            });

            alert(`Finalization rejected!\n\nTX:\n${sig}`);

            await onFunded?.();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    

    const openFinalizationForm = () => {
        setDonationPercent(0);

        setShowFinalizationForm(true);
    };

    const handleDonationChange = (percent) => {
        setDonationPercent(percent);

        const nextDonationLamports = Math.floor((referenceAmount * Number(percent)) / 100);

        const currentA = Math.round(Number(payoutA || 0) * LAMPORTS_PER_SOL);
        const currentB = Math.round(Number(payoutB || 0) * LAMPORTS_PER_SOL);

        const totalAvailableForParties = totalLocked - nextDonationLamports;

        let nextA = currentA;
        let nextB = currentB;

        if (currentB >= currentA) {
            nextB = totalAvailableForParties - currentA;
        } else {
            nextA = totalAvailableForParties - currentB;
        }

        if (nextA < 0) nextA = 0;
        if (nextB < 0) nextB = 0;

        setPayoutA(String(nextA / LAMPORTS_PER_SOL));
        setPayoutB(String(nextB / LAMPORTS_PER_SOL));
    };


    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 text-white">
            <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                    <h3 className="text-lg font-bold text-white">
                        {escrow.note || "Untitled Escrow"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 break-all">
                        Escrow: {escrow.pda}
                    </p>
                    </div>

                    <span className="w-fit rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    {statusLabel(escrow.status)}
                    </span>
                </div>

                {/* Status */}
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-sm font-semibold text-blue-200">Funding Status</p>
                    <p className="mt-1 text-sm text-slate-300">{fundingStatus(escrow)}</p>
                </div>

                {/* Parties */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Party A</p>
                    <p className="mt-2 font-mono text-sm text-white">
                        {escrow.partyA === nullKey ? "Unassigned" : shortKey(escrow.partyA)}
                    </p>
                    <p className="mt-3 text-sm text-slate-400">
                        Required: <span className="text-white">{sol(escrow.requiredDepositA)} SOL</span>
                    </p>
                    <p className="text-sm text-slate-400">
                        Deposited: <span className="text-white">{sol(escrow.depositedA)} SOL</span>
                    </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Party B</p>
                    <p className="mt-2 font-mono text-sm text-white">
                        {escrow.partyB === nullKey ? "Unassigned" : shortKey(escrow.partyB)}
                    </p>
                    <p className="mt-3 text-sm text-slate-400">
                        Required: <span className="text-white">{sol(escrow.requiredDepositB)} SOL</span>
                    </p>
                    <p className="text-sm text-slate-400">
                        Deposited: <span className="text-white">{sol(escrow.depositedB)} SOL</span>
                    </p>
                    </div>
                </div>

                {/* Vault / Totals */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Vault</p>
                        <code className="mt-2 block break-all text-sm text-slate-300">
                        {escrow.vault}
                        </code>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                        Total Locked
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-300">
                        {sol(Number(escrow.depositedA) + Number(escrow.depositedB))} SOL
                        </p>
                    </div>
                    </div>
                </div>
            </div>


            {fundAmount ? (
                <button
                    onClick={handleFund}
                    disabled={loading}
                    className="mt-4 rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                    {loading ? "Funding..." : fundLabel}
                </button>
            ) : (
                <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                {escrow.status === 0
                    ? Number(escrow.depositedA) > 0 || Number(escrow.depositedB) > 0
                    ? "Waiting for the other party to fund."
                    : "Escrow created. Waiting for funding."
                    : escrow.status === 1
                    ? "Deposits complete. Finalization is now available."
                    : escrow.status === 2
                    ? "Finalization suggested. Waiting for the other party to accept or reject."
                    : escrow.status === 3
                    ? "Escrow completed."
                    : "Unknown escrow status."}
                </p>
            )}

            {isFinalizationSuggested && (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-purple-200">
                            Finalization Suggested
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                            Proposed by:
                            </p>

                            <code className="text-xs text-slate-300">
                            {escrow.finalizationProposer}
                            </code>
                        </div>

                        <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">
                            Awaiting Response
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                            Party A receives
                            </p>

                            <p className="mt-2 text-2xl font-bold text-white">
                            {sol(escrow.proposedPayoutA)} SOL
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                            Party B receives
                            </p>

                            <p className="mt-2 text-2xl font-bold text-white">
                            {sol(escrow.proposedPayoutB)} SOL
                            </p>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                Website Donation
                            </p>
                            <p className="mt-2 text-2xl font-bold text-purple-300">
                                {sol(escrow.proposedDonation || 0)} SOL
                            </p>
                        </div>
                    </div>

                    {escrow.finalizationNote && (
                        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                            Reason / Note
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                            {escrow.finalizationNote}
                            </p>
                        </div>
                    )}

                    {canRespondToFinalization ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                            onClick={handleAcceptFinalization}
                            disabled={loading}
                            className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                            >
                            {loading ? "Processing..." : "Accept Finalization"}
                            </button>

                            <button
                            onClick={handleRejectFinalization}
                            disabled={loading}
                            className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                            >
                            {loading ? "Processing..." : "Reject Finalization"}
                            </button>
                        </div>
                        ) : (
                        <p className="mt-4 text-sm text-slate-400">
                            Waiting for the other party to respond.
                        </p>
                    )}
                </div>
            )}

            {canRefund && (
                <button
                    onClick={handleRefund}
                    disabled={loading}
                    className="mt-3 rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Refund / Withdraw"}
                </button>
            )}

            {canSuggestFinalization && !showFinalizationForm && (
                <button
                    onClick={openFinalizationForm}
                    className="mt-4 rounded-xl bg-purple-600 px-5 py-3 font-bold text-white"
                >
                    Suggest Finalization
                </button>
            )}

            {showFinalizationForm && (
                <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                    <h4 className="font-bold text-purple-300">Suggest Finalization</h4>

                    <p className="mt-2 text-sm text-slate-300">
                        Total locked: {sol(totalLocked)} SOL
                    </p>

                    

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                            Payout to Party A SOL
                            </label>
                            <input
                            value={payoutA}
                            onChange={(e) => setPayoutA(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                                Payout to Party B SOL
                            </label>
                            <input
                                value={payoutB}
                                onChange={(e) => setPayoutB(e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                            />
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-300">
                            Optional donation to website
                            </label>

                            <span className="text-sm font-bold text-purple-300">
                            {donationPercent}%
                            </span>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={donationPercent}
                            onChange={(e) => handleDonationChange(Number(e.target.value))}
                            className="mt-4 w-full"
                        />

                        <p className="mt-2 text-sm text-slate-400">
                            Donation amount: {sol(donationLamports)} SOL
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Donation is optional and requires acceptance by both parties.
                        </p>
                    </div>

                    <p className={`mt-3 text-sm ${payoutIsValid ? "text-green-300" : "text-red-300"}`}>
                        Payout + donation total: {sol(payoutTotalLamports)} SOL
                        {" "} / required {sol(totalLocked)} SOL
                    </p>
                    <p className={`mt-3 text-sm ${payoutIsValid ? "text-green-300" : "text-yellow-300"}`}>
                        Remaining to allocate: {sol(remainingLamports)} SOL
                    </p>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm text-slate-300">
                            Reason / note optional
                        </label>
                        <textarea
                            value={finalizationNote}
                            onChange={(e) => setFinalizationNote(e.target.value)}
                            maxLength={200}
                            placeholder="Example: Item arrived with minor damage. Requesting a small discount."
                            className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {finalizationNote.length}/200
                        </p>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleSuggestFinalization}
                            disabled={loading || !payoutIsValid}
                            className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Submit Suggestion"}
                        </button>

                        <button
                            onClick={() => setShowFinalizationForm(false)}
                            className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EscrowCard;