import React from 'react';
import localLogo from '../assets/airpulse_logo.png';
import { CLOUDINARY_LOGO_URL } from './Logo';

export default function HeroTitle() {
  const logoSrc = CLOUDINARY_LOGO_URL || localLogo;

  return (
    <div className="hero-title-section">
      <div className="hero-brand-badge">
        <img src={logoSrc} alt="Airpulse Emblem" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
        <span className="hero-brand-text">
          Airpulse <span className="hero-brand-sub">• Official MoSPI Portal</span>
        </span>
      </div>

      <h1 className="hero-main-heading">
        <span className="hero-line-1">REAL-TIME</span>
        <span className="hero-line-2">
          AIRFARE <span className="hero-accent-word">PRICE INDEX</span>
        </span>
      </h1>

      <p className="hero-subheading">
        Automated retail fare ingestion across <span className="mono-stat">10 high-density corridors</span> and <span className="mono-stat">12 airline &amp; OTA feeds</span>. Providing high-frequency CPI transport price relatives via Laspeyres fixed-base basket methodology.
      </p>
    </div>
  );
}
