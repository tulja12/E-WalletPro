import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Success from "./pages/Success";
import AddMoney from "./pages/AddMoney";
import Dashboard from "./pages/Dashboard";
import MFA from "./pages/MFA";
import MFASetup from "./pages/MFASetup";
import Transactions from "./pages/Transactions";
import Transfer from "./pages/Transfer";
import Profile from "./pages/Profile";
import Accounts from "./pages/Accounts";
import SidebarLayout from "./components/SidebarLayout";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/success" element={<Success />} />
        <Route path="/mfa" element={<MFA />} />
        <Route path="/mfa-setup" element={<MFASetup />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        
        {/* Protected Routes with Sidebar Layout */}
        <Route element={<SidebarLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/addmoney" element={<AddMoney />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/profile" element={<Profile/>}/>
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/add-account" element={<Navigate to="/accounts" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
