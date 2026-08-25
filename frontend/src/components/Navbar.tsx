import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, LogOut, History, BarChart2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner container-wide">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <Shield size={20} />
          </div>
          <span>QR<strong>Guard</strong></span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          <NavLink to="/scan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Scan QR
          </NavLink>
          <NavLink to="/check" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Check Link
          </NavLink>
          <NavLink to="/community" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Community Intel
          </NavLink>
        </div>

        {/* Right side */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-menu-wrapper">
              <button
                id="user-menu-btn"
                className="user-menu-btn"
                onClick={() => setUserMenuOpen(v => !v)}
              >
                <div className="avatar">{user.username[0].toUpperCase()}</div>
                <span className="username-text">{user.username}</span>
                <ChevronDown size={14} className={`chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown" onClick={() => setUserMenuOpen(false)}>
                  <Link to="/dashboard" className="dropdown-item">
                    <BarChart2 size={15} /> Dashboard
                  </Link>
                  <Link to="/history" className="dropdown-item">
                    <History size={15} /> Scan History
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-btn"
            className="hamburger"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <NavLink to="/scan" className="mobile-nav-link">Scan QR</NavLink>
          <NavLink to="/check" className="mobile-nav-link">Check Link</NavLink>
          <NavLink to="/community" className="mobile-nav-link">Community Intel</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="mobile-nav-link">Dashboard</NavLink>
              <NavLink to="/history" className="mobile-nav-link">History</NavLink>
              <button className="mobile-nav-link danger-text" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link">Sign in</Link>
              <Link to="/register" className="mobile-nav-link highlight">Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
