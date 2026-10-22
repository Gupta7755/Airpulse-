import React from 'react';
import localLogo from '../assets/airpulse_logo.png';

// Optional CDN override via VITE_CLOUDINARY_LOGO_URL; empty means use the bundled local logo
export const CLOUDINARY_LOGO_URL = import.meta.env?.VITE_CLOUDINARY_LOGO_URL || '';

export default function Logo({ onClick, showTagline = true }) {
  const logoSrc = CLOUDINARY_LOGO_URL || localLogo;


  return (
    <a
      href="#home"
      className="brand-logo airpulse-brand"
      onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
      aria-label="Airpulse - MoSPI Airfare Price Index Home"
    >
      <div className="logo-icon-wrap airpulse-icon-wrap">
        <img
          src={logoSrc}
          alt="Airpulse Logo"
          className="airpulse-logo-img"
          loading="eager"
        />
      </div>
      <div className="brand-text-col">
        <span className="brand-name">
          Air<span className="brand-accent">pulse</span>
        </span>
        {showTagline && (
          <span className="brand-tagline font-mono">
            MoSPI Airpulse
          </span>
        )}
      </div>
    </a>
  );
}

