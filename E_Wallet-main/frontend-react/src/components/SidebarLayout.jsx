import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

function SidebarLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      navigate("/");
      return;
    }

    if (role === "ADMIN") {
      navigate("/admin/users");
    }
  }, [navigate]);
  
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    borderRadius: '12px',
    color: isActive ? '#fff' : '#475569',
    background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
    textDecoration: 'none',
    marginBottom: '8px',
    fontWeight: isActive ? '600' : '500',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 52%, #f3f8ff 100%)', fontFamily: "'Inter', sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '280px', background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', borderRight: '1px solid #dbe4ef', padding: '30px 20px', display: 'flex', flexDirection: 'column', boxShadow: '18px 0 40px rgba(148, 163, 184, 0.08)' }}>
        
        {/* LOGO */}
        <div className="mb-5 px-3">
          <h2 className="fw-bold m-0" style={{ color: '#0f172a', letterSpacing: '-1px' }}>
            E-Wallet<span style={{ color: '#3b82f6' }}>Pro</span>
          </h2>
        </div>

        {/* NAV LINKS */}
        <div style={{ flex: 1 }}>
          <NavLink to="/dashboard" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-grid-fill me-3" style={{ fontSize: '1.2rem' }}></i> Dashboard
          </NavLink>
          <NavLink to="/addmoney" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-wallet2 me-3" style={{ fontSize: '1.2rem' }}></i> Add Wallet Funds
          </NavLink>
          <NavLink to="/transfer" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-send-fill me-3" style={{ fontSize: '1.2rem' }}></i> Send Payment
          </NavLink>
          <NavLink to="/transactions" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-receipt me-3" style={{ fontSize: '1.2rem' }}></i> Payment History
          </NavLink>
          <NavLink to="/accounts" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-credit-card-fill me-3" style={{ fontSize: '1.2rem' }}></i> Linked Cards
          </NavLink>
          <NavLink to="/profile" style={({ isActive }) => navItemStyle(isActive)}>
            <i className="bi bi-person-fill me-3" style={{ fontSize: '1.2rem' }}></i> My Profile
          </NavLink>
        </div>

        {/* LOGOUT */}
        <div className="mt-auto">
          <button onClick={handleLogout} className="btn w-100 d-flex align-items-center justify-content-center" style={{ padding: '12px', borderRadius: '12px', background: '#fff1f2', color: '#dc2626', border: '1px solid #fecdd3', fontWeight: '600', transition: 'all 0.3s' }}>
            <i className="bi bi-box-arrow-right me-2"></i> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </div>

    </div>
  );
}

export default SidebarLayout;
