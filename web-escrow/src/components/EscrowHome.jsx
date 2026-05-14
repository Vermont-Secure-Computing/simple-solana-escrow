import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateEscrow from "./CreateEscrow";
import MyEscrows from "./MyEscrows";
import LookupEscrow from "./LookupEscrow";

function EscrowHome() {
    const [tab, setTab] = useState("create");

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="border-b border-white/10 bg-slate-900/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div>
                        <h1 className="text-2xl font-bold !text-white">Sol Escrow</h1>
                        {/* <p className="text-sm text-slate-400">
                        Standalone two-party escrow on Solana
                        </p> */}
                    </div>

                    <WalletMultiButton />
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="mb-6 flex gap-3 bg-slate-950 text-white">
                    <button
                        onClick={() => setTab("create")}
                        className={`rounded-xl px-4 py-2 font-semibold ${
                        tab === "create" ? "bg-blue-600" : "bg-white/10"
                        }`}
                    >
                        Create Escrow
                    </button>

                    <button
                        onClick={() => setTab("myEscrows")}
                        className={`rounded-xl px-4 py-2 font-semibold ${
                        tab === "myEscrows" ? "bg-blue-600" : "bg-white/10"
                        }`}
                    >
                        My Escrows
                    </button>
                    <button
                        onClick={() => setTab("lookup")}
                        className={`rounded-xl px-4 py-2 font-semibold ${
                        tab === "lookup" ? "bg-blue-600" : "bg-white/10"
                        }`}
                    >
                        Look Up Escrow
                    </button>
                </div>

                {tab === "create" ? (
                    <CreateEscrow />
                ) : tab === "lookup" ? (
                    <LookupEscrow />
                ) : (
                    <MyEscrows />
                )}
            </main>
        </div>
    );
}

export default EscrowHome;