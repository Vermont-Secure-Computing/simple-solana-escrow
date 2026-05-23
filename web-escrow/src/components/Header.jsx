import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Header() {
    const location = useLocation();

    const isEscrowPage = location.pathname.startsWith("/escrow");

    return (
        <header
            className={ isEscrowPage ? "border-b border-white/10 bg-slate-900/80 backdrop-blur" : "border-b border-slate-700"
        }
        >
            <div
                className={ isEscrowPage
                    ? "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6"
                    : "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-6 sm:px-6"
                }
            >
                {/* Logo */}
                <Link
                    to="/"
                    className="flex min-w-0 items-start gap-3 rounded-xl transition hover:opacity-80"
                >
                    <img
                        src={logo}
                        alt="SSScrow"
                        className="h-9 w-auto shrink-0 object-contain sm:h-10"
                    />

                    <div className="min-w-0 text-left leading-tight">
                        <span className="block truncate text-lg font-bold text-white sm:text-2xl">
                            ssscrow
                        </span>

                        <span className="block truncate text-xs text-slate-400 sm:text-sm">
                            Simple Solana Escrow
                        </span>
                    </div>
                </Link>

                {/* Right side */}
                {isEscrowPage ? (
                    <div className="shrink-0 scale-90 origin-right sm:scale-100">
                        <WalletMultiButton />
                    </div>
                    ) : (
                    <Link
                        to="/escrow"
                        className="rounded-full border border-green-500/20 bg-black px-5 py-2 text-sm font-medium text-white transition hover:border-green-400/40 hover:bg-green-500/10"
                    >
                        Open App
                    </Link>
                )}
            </div>
        </header>
    );
}