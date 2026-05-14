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
      <div className="w-full mx-auto p-0 sm:p-4">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/escrow" element={<EscrowHome />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;