import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LandingPage } from './components/LandingPage';
import EscrowHome from './components/EscrowHome';
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