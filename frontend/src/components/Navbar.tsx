import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, History, BarChart2, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ScanzoLogo } from './ScanzoLogo';
import { sounds } from '../lib/soundEffects';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (muted) {
      toast('Sound muted', { icon: '🔇' });
    } else {
      toast.success('Sound enabled!', { icon: '🔊' });
    }
  };

  const handleLogout = async () => {
    try {
      sounds.playClick();
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
        <Link
          to="/"
          className="navbar-logo floating-gentle"
          style={{ display: 'flex', alignItems: 'center' }}
          onClick={() => sounds.playClick()}
          onMouseEnter={() => sounds.playHover()}
        >
          <ScanzoLogo height={30} />
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          <NavLink
            to="/scan"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => sounds.playClick()}
            onMouseEnter={() => sounds.playHover()}
          >
            Scan QR
          </NavLink>
          <NavLink
            to="/check"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => sounds.playClick()}
            onMouseEnter={() => sounds.playHover()}
          >
            Check Link
          </NavLink>
          <NavLink
            to="/community"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => sounds.playClick()}
            onMouseEnter={() => sounds.playHover()}
          >
            Community Intel
          </NavLink>
        </div>

        {/* Right side */}
        <div className="navbar-actions flex items-center gap-3">
          {/* Sound FX Toggle Button */}
          <button
            type="button"
            className="audio-toggle-btn"
            onClick={toggleSound}
            title={isMuted ? 'Enable Sound FX' : 'Mute Sound FX'}
            aria-label="Toggle Sound Effects"
          >
            {isMuted ? (
              <>
                <VolumeX size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Muted</span>
              </>
            ) : (
              <>
                <div className="audio-wave">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Sound FX</span>
              </>
            )}
          </button>

          {user ? (
            <div className="user-menu-wrapper">
              <button
                id="user-menu-btn"
                className="user-menu-btn"
                onClick={() => { sounds.playClick(); setUserMenuOpen(v => !v); }}
              >
                <div className="avatar">{user.username[0].toUpperCase()}</div>
                <span className="username-text">{user.username}</span>
                <ChevronDown size={14} className={`chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown" onClick={() => setUserMenuOpen(false)}>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => sounds.playClick()}>
                    <BarChart2 size={15} /> Dashboard
                  </Link>
                  <Link to="/history" className="dropdown-item" onClick={() => sounds.playClick()}>
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
            <div className="desktop-auth-btns flex items-center gap-2">
              <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => sounds.playClick()} onMouseEnter={() => sounds.playHover()}>
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => sounds.playClick()} onMouseEnter={() => sounds.playHover()}>
                Get started
              </Link>
            </div>
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
