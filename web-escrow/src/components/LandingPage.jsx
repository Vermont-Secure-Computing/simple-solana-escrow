import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBagShopping,
    faCartShopping,
    faShieldHalved,
    faLock,
    faCube,
    faCheck,
    faFileCirclePlus,
    faBoxOpen,
    faArrowsRotate,
    faWallet,
    faThumbsUp,
    faCircleCheck,
    faPeopleArrows,
    faScaleBalanced
  } from "@fortawesome/free-solid-svg-icons";
import logo from "../assets/logo.png"

export function LandingPage() {
    console.log("landing page")
    return (
        <div className="min-h-screen bg-[#020617] text-white">
        {/* HERO */}
        <section className="mx-auto max-w-6xl">
            <header className="flex items-center justify-between border-b border-slate-700 pb-6">
                <img
                    src={logo}
                    alt="Sol Escrow"
                    className="h-10 w-auto object-contain"
                />

                <Link
                  to="/escrow"
                  className="rounded-full border border-green-500/20 bg-black px-5 py-2 text-sm font-medium text-white transition hover:border-green-400/40 hover:bg-green-500/10"
                >
                  Open App
                </Link>
            </header>
  
            <div className="mx-auto mt-5 flex max-w-4xl flex-col items-center text-center">
                <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                    <span className="text-white">
                    Trustless Escrow for
                    </span>

                    <br />

                    <span className="text-green-400">
                    Safe & Fair
                    </span>{" "}

                    <span className="text-white">
                    Transactions
                    </span>
                </h1>

                <p className="mt-6 max-w-xl text-sm text-slate-400">
                    Our escrow system protects both buyer and seller with
                    bonded deposits and automatic, transparent execution.
                </p>
            </div>
  
          {/* BUY / SELL */}
          <div className="mx-auto mt-5 grid max-w-4xl gap-5 md:grid-cols-2">
            {/* BUYING */}
            <div className="rounded-2xl border border-blue-500/20 bg-linear-to-br from-blue-500/10 to-transparent p-5 shadow-2xl shadow-blue-500/10">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
                  <FontAwesomeIcon
                    icon={faCartShopping}
                    className="text-3xl text-blue-400"
                  />
                </div>
  
                <h2 className="mt-6 text-2xl font-bold">
                  I’m <span className="text-blue-400">Buying</span>
                </h2>
  
                <p className="mt-4 max-w-sm text-sm text-slate-300">
                  Buy with confidence. Your payment is protected until
                  you approve.
                </p>
  
                <div className="mt-8 space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-blue-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      Pay item price + security deposit
                    </p>
                  </div>
  
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-blue-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      Seller pays security deposit
                    </p>
                  </div>
  
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-blue-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      Approve to release payment
                    </p>
                  </div>
                </div>
  
                {/* <button className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-4 text-xl font-bold text-white transition hover:bg-blue-400">
                  I’m Buying
                  <FontAwesomeIcon icon={faArrowRight} />
                </button> */}
              </div>
            </div>
            {/* SELLING */}
            <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-green-500/10 to-transparent p-5 shadow-2xl shadow-green-500/10">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
                  <FontAwesomeIcon
                    icon={faBagShopping}
                    className="text-3xl text-green-400"
                  />
                </div>
  
                <h2 className="mt-6 text-2xl font-bold">
                  I’m <span className="text-green-400">Selling</span>
                </h2>
  
                <p className="mt-4 max-w-sm text-sm text-slate-300">
                  List your item or service and receive secure payments
                  from buyers.
                </p>
  
                <div className="mt-8 space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-green-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      Buyer pays + security deposit
                    </p>
                  </div>
  
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-green-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      You pay security deposit
                    </p>
                  </div>
  
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="text-sm text-green-400"
                      />
                    </div>
  
                    <p className="text-sm text-slate-300">
                      Get paid when terms are met
                    </p>
                  </div>
                </div>
  
                {/* <button className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-green-500 px-6 py-4 text-xl font-bold text-black transition hover:bg-green-400">
                  I’m Selling
                  <FontAwesomeIcon icon={faArrowRight} />
                </button> */}
              </div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div className="mx-auto mt-5 max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl">
                How Our{" "}
                <span className="text-green-400">
                  Escrow System
                </span>{" "}
                Works
              </h2>

              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-0.5 w-8 bg-green-400" />
                <div className="h-0.5 w-4 bg-green-400/60" />
                <div className="h-0.5 w-8 bg-green-400" />
              </div>
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3 xl:grid-cols-6">
              
              {/* STEP 1 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  1
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faFileCirclePlus}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Create Escrow
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Either party creates an escrow with agreed terms.
                </p>
              </div>

              {/* STEP 2 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  2
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faWallet}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Deposits Locked
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Buyer pays item price + deposit. Seller pays deposit.
                </p>
              </div>

              {/* STEP 3 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  3
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Escrow Active
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Funds are locked on-chain. Both parties are protected.
                </p>
              </div>

              {/* STEP 4 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  4
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faBoxOpen}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Complete Trade
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Deliver the item or service as agreed.
                </p>
              </div>

              {/* STEP 5 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  5
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faThumbsUp}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Release Funds
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Buyer approves release and seller gets paid.
                </p>
              </div>

              {/* STEP 6 */}
              <div className="relative text-center">
                <div className="absolute left-1/2 -top-4.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-green-500/40 bg-[#07140f] text-sm font-bold text-white">
                  6
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 shadow-lg shadow-green-500/10">
                  <FontAwesomeIcon
                    icon={faArrowsRotate}
                    className="text-4xl text-green-400"
                  />
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  Deposits Returned
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Both parties receive their deposits back.
                </p>
              </div>
            </div>
          </div>

          {/* INCENTIVIZED HONESTY */}
          <div className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-3xl border border-green-500/20 bg-gradient-to-r from-green-500/5 via-transparent to-transparent shadow-2xl shadow-green-500/5">
            <div className="grid items-center gap-10 p-8 lg:grid-cols-[220px_1fr_320px]">
              
              {/* LEFT ICON */}
              <div className="flex justify-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5">
                  <FontAwesomeIcon
                    icon={faPeopleArrows}
                    className="text-7xl text-green-400"
                  />
                </div>
              </div>

              {/* CENTER TEXT */}
              <div>
                <h3 className="text-3xl font-bold text-green-400">
                  Incentivized Honesty
                </h3>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Both parties put skin in the game. If someone acts unfairly
                  or disappears, the other party may receive the penalty
                  deposit according to the escrow rules or automatic
                  resolution logic.
                </p>
              </div>

              {/* RIGHT LIST */}
              <div className="border-green-500/10 lg:border-l lg:pl-10">
                <div className="space-y-6">
                  
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="text-green-400"
                      />
                    </div>

                    <p className="text-lg text-slate-200">
                      No central authority
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="text-green-400"
                      />
                    </div>

                    <p className="text-lg text-slate-200">
                      Funds never sit idle
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/30">
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="text-green-400"
                      />
                    </div>

                    <p className="text-lg text-slate-200">
                      Transparent & on-chain
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
  
          {/* FEATURES */}
          <div className="mt-20 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <FontAwesomeIcon
                  icon={faLock}
                  className="text-2xl text-green-400"
                />
              </div>
  
              <h3 className="mt-5 text-xl font-bold">
                Non-Custodial
              </h3>
  
              <p className="mt-3 text-slate-400">
                Funds are locked in a smart contract.
              </p>
            </div>
  
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <FontAwesomeIcon
                  icon={faScaleBalanced}
                  className="text-2xl text-green-400"
                />
              </div>
  
              <h3 className="mt-5 text-xl font-bold">
                Trustless
              </h3>
  
              <p className="mt-3 text-slate-400">
                Smart contract enforced escrow rules.
              </p>
            </div>
  
            {/* <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <FontAwesomeIcon
                  icon={faClock}
                  className="text-2xl text-green-400"
                />
              </div>
  
              <h3 className="mt-5 text-xl font-bold">
                Timelocked
              </h3>
  
              <p className="mt-3 text-slate-400">
                Automatic timeout protection.
              </p>
            </div> */}
  
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <FontAwesomeIcon
                  icon={faCube}
                  className="text-2xl text-green-400"
                />
              </div>
  
              <h3 className="mt-5 text-xl font-bold">
                Open & Transparent
              </h3>
  
              <p className="mt-3 text-slate-400">
                Fully on-chain and verifiable.
              </p>
            </div>
          </div>

          {/* BUILT ON SOLANA */}
          <div className="mx-auto mt-10 flex max-w-4xl items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-5 px-6 py-4">
              
              <div className="flex items-center gap-3">

                <span className="text-sm text-slate-300">
                  Built on Solana
                </span>
              </div>

              <div className="h-1 w-1 rounded-full bg-green-400/60" />

              <span className="text-sm text-slate-300">
                Fast
              </span>

              <div className="h-1 w-1 rounded-full bg-green-400/60" />

              <span className="text-sm text-slate-300">
                Secure
              </span>

              <div className="h-1 w-1 rounded-full bg-green-400/60" />

              <span className="text-sm text-slate-300">
                Decentralized
              </span>

            </div>
          </div>
        </section>
      </div>
    )
}