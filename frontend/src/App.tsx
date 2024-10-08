import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./page/Signup";
import Signin from "./page/Signin";
import Dashboard from "./page/Dashboard";
import HandleBoard from "./page/HandleBoard";
import Landing from "./page/Landing";
import { Navbar } from "./components/Navbar";

function App() {
  return (
    <div className="w-screen h-screen">
      <BrowserRouter>
      <Navbar />
        <Routes>
          <Route path={'/'} element={<Landing />} />
          <Route path={"/signup"} element={<Signup />} />
          <Route path={"/signin"} element={<Signin />} />
          <Route path={"/dashboard"} element={<Dashboard />} />
          <Route path={"/user/*"} element={<HandleBoard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
