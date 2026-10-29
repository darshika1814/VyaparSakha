import City from "./components/City";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Transaction from "./components/Transaction";
import Account from "./components/Account";
import Cityaccount from "./components/Cityaccount";
import Bill from "./components/Bill";
import Image from "./components/Image";
import About from "./components/About";
import Login from "./components/Login";
import Register from "./components/Register";
import Report from "./components/Report";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <>
        <Router>
          <AuthProvider>
            <Navbar></Navbar>
            <Routes>
              {/* Public pages */}
              <Route path="/" element={<Home></Home>}></Route>
              <Route path="/about" element={<About></About>}></Route>
              <Route path="/login" element={<Login></Login>}></Route>
              <Route path="/register" element={<Register></Register>}></Route>

              {/* Pages that need a logged-in shopkeeper */}
              <Route path="/bills" element={<ProtectedRoute><Bill></Bill></ProtectedRoute>}></Route>
              <Route path="/accounts" element={<ProtectedRoute><Account></Account></ProtectedRoute>}></Route>
              <Route path="/city" element={<ProtectedRoute><City></City></ProtectedRoute>}></Route>
              <Route path="/city-view" element={<ProtectedRoute><Cityaccount></Cityaccount></ProtectedRoute>}></Route>
              <Route path="/transaction" element={<ProtectedRoute><Transaction></Transaction></ProtectedRoute>}></Route>
              <Route path="/report" element={<ProtectedRoute><Report></Report></ProtectedRoute>}></Route>
              <Route path="/image" element={<ProtectedRoute><Image></Image></ProtectedRoute>}></Route>
            </Routes>
          </AuthProvider>
        </Router>
    </>
  );
}

export default App;
