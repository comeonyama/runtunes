import { BrowserRouter, Routes, Route } from "react-router-dom";
import CallbackPage from "./pages/CallbackPage";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/callback" element={<CallbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
