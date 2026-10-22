import React from 'react';
import Logo from './Logo';
import {
  LayoutDashboard,
  Compass,
  TrendingUp,
  Clock,
  Plane,
  FileSearch,
  Cpu,
  Download,
  Activity,
  Radar,
  Building2,
  X
} from 'lucide-react';

export default function Navbar({
  onBookClick,
  onSearchClick,
  activeTab = 'deck',
  onNavigate,
  latestIndex = 138.08,
  changePct = 1.68,
  theme = 'dark',
  onThemeChange,
  isMobileOpen = false,
  onCloseMobile
}) {
  const navItems = [
    { id: 'deck', label: 'FLIGHT DECK', icon: LayoutDashboard },
    { id: 'spikes', label: 'AIR INTEL', icon: Activity },
    { id: 'airports3d', label: 'LIVE FLIGHT MAP', icon: Radar },
    { id: 'routes', label: 'ROUTE BASKET', icon: Compass },
    { id: 'trajectory', label: 'INDEX TREND', icon: TrendingUp },
    { id: 'windows', label: 'ADVANCE CURVE', icon: Clock },
    { id: 'airlines', label: 'AIRLINES & OTAs', icon: Plane },
    { id: 'quotes', label: 'LIVE QUOTES', icon: FileSearch },
    { id: 'scraper', label: 'CRAWLER HEALTH', icon: Cpu },
    { id: 'export', label: 'DATASETS & API', icon: Download }
  ];

  const handleNavClick = (e, item) => {
    e.preventDefault();
    if (onNavigate) onNavigate(item.id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleBackHome = () => {
    if (onNavigate) onNavigate('home');
    if (onCloseMobile) onCloseMobile();
  };

  const formattedChange = typeof changePct === 'number'
    ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
    : (changePct || '+0.22%');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-mobile-backdrop ${isMobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`left-sidebar-nav ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Close Button */}
        <button
          type="button"
          className="sidebar-mobile-close-btn"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>

        <div className="sidebar-top-section">
          {/* Brand Logo */}
          <div className="sidebar-brand-wrapper">
            <Logo onClick={handleBackHome} />
          </div>
        </div>

        {/* Navigation List on Left Side */}
        <nav className="sidebar-nav-menu">
          <div className="sidebar-section-label">MONITORING ARCHITECTURE</div>
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={(e) => handleNavClick(e, item)}
                    aria-label={`Go to ${item.label}`}
                  >
                    <Icon size={18} strokeWidth={1.65} className="sidebar-btn-icon" />
                    <span className="sidebar-btn-text">{item.label}</span>
                    {isActive && <span className="active-sharp-indicator"></span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer Action */}
        <div className="sidebar-bottom-section">
          <div className="sidebar-footer-note">
            <span>Airpulse • MoSPI CPI</span>
            <span className="sidebar-ver-tag">REV 2026.09</span>
          </div>
        </div>
      </aside>
    </>
  );
}
