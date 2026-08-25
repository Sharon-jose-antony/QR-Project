import { Link } from 'react-router-dom';
import { Globe, ExternalLink } from 'lucide-react';
import { ScanzoLogo } from './ScanzoLogo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-wide footer-inner">
        <div className="footer-brand">
          <ScanzoLogo height={26} />
          <p className="footer-tagline">Community Digital Safety Gateway — Scan it. Check it. Then open it.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h5>Tools</h5>
            <Link to="/scan">Scan QR</Link>
            <Link to="/check">Check Link</Link>
            <Link to="/community">Community Intel</Link>
          </div>
          <div className="footer-col">
            <h5>Account</h5>
            <Link to="/register">Sign up free</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div className="footer-col">
            <h5>Info</h5>
            <a href="#" onClick={e => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={e => e.preventDefault()}>Terms</a>
          </div>
        </div>

        <div className="footer-socials">
          <a href="https://github.com" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
            <Globe size={18} />
          </a>
          <a href="#" aria-label="Contact" onClick={e => e.preventDefault()}>
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Scanzo. Open-source threat intelligence.</p>
      </div>
    </footer>
  );
}
