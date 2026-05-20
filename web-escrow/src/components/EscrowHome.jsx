import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link } from "react-router-dom";
import CreateEscrow from "./CreateEscrow";
import MyEscrows from "./MyEscrows";
import LookupEscrow from "./LookupEscrow";
import logo from "../assets/logo.png"

function EscrowHome() {
    const [tab, setTab] = useState("create");

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <Link
                        to="/"
                        className="flex min-w-0 items-center gap-3 rounded-xl transition hover:opacity-80"
                    >
                        <img
                            src={logo}
                            alt="Sol Escrow"
                            className="h-9 w-auto shrink-0 object-contain sm:h-10"
                        />

                        <span className="truncate text-lg font-bold text-white sm:text-2xl">
                            SSScrow
                        </span>
                    </Link>

                    <div className="shrink-0 scale-90 origin-right sm:scale-100">
                        <WalletMultiButton />
                    </div>
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