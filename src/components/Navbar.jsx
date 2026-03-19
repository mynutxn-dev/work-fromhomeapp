import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  Users,
  ScanFace,
  LogOut,
  Menu,
  X,
  Command
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
    { to: '/checkin', icon: ClipboardCheck, label: 'เช็คอิน' },
    { to: '/history', icon: CalendarDays, label: 'ประวัติ' },
  ];

  if (currentUser?.role === 'admin') {
    links.push({ to: '/admin', icon: Users, label: 'ผู้ดูแลระบบ' });
    links.push({ to: '/face-register', icon: ScanFace, label: 'สแกนหน้า' });
  }

  return (
    <>
      <header className={`apple-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="apple-navbar-container">
          <button 
            className="apple-mobile-menu-btn" 
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="apple-navbar-brand">
            <img src="/logo.png" alt="Company Logo" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
            <span className="brand-text">WFH Check-in</span>
          </div>

          <nav className="apple-navbar-links desktop-only">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `apple-nav-link ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="apple-navbar-actions">
            <div className="apple-nav-user" title={currentUser?.name}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
            <button className="apple-nav-logout" onClick={logout} title="ออกจากระบบ">
              <LogOut size={16} />
              <span className="desktop-only text-sm">ออกระบบ</span>
            </button>
          </div>
        </div>

        <div className={`apple-mobile-menu ${mobileOpen ? 'open' : ''}`}>
          <div className="apple-mobile-links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `apple-mobile-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <link.icon size={18} />
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="apple-mobile-user">
            <div className="apple-nav-user">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser?.name}</div>
              <div className="user-department">{currentUser?.employee_code} • {[currentUser?.branchName, currentUser?.departmentName].filter(Boolean).join(' / ')}</div>
            </div>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <div className="apple-mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
