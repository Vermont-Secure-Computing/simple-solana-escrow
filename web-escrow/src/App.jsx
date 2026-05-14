import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateEscrow from "./components/CreateEscrow";
import MyEscrows from "./components/MyEscrows";
import LookupEscrow from "./components/LookupEscrow";
import logo from "./assets/logo.png";

function App() {
  const [tab, setTab] = useState("create");

  return (
    <BrowserRouter>
      <div className="min-h-screen text-white">
        <header className="border-b border-white/10 bg-slate-900/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <img
                src={logo}
                alt="Sol Escrow"
                className="h-10 w-auto object-contain"
              />
            </div>
  
            {/* <WalletMultiButton /> */}
          </div>
        </header>
  
        <div className="w-full mx-auto p-0 sm:p-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
  
            <Route
              path="/escrow"
              element={
                <main className="mx-auto max-w-6xl px-6 py-8">
                  <h2 className="!text-white text-4xl">
                    Trustless Escrow for
                  </h2>
  
                  <h2 className="text-4xl">
                    <span className="text-green-400">
                      Safe and Fair
                    </span>{" "}
                    <span className="!text-white">
                      Transactions
                    </span>
                  </h2>
  
                  <p className="!text-white">
                    Our escrow system protects both buyer and seller.
                  </p>
                </main>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;