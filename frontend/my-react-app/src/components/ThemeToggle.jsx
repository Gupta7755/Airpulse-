import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ theme = 'dark', onThemeChange, size = 'normal' }) {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isCompact = size === 'compact';
  const isSidebar = size === 'sidebar';

  return (
    <div
      className={`airpulse-theme-toggle-group ${isCompact ? 'compact-toggle' : ''} ${isSidebar ? 'sidebar-toggle' : ''}`}
      role="group"
      aria-label="Color Theme Selection"
    >
      {/* 1. Dark Mode Button */}
      <button
        type="button"
        className={`theme-mode-btn ${isDark ? 'active-mode' : ''}`}
        onClick={() => onThemeChange && onThemeChange('dark')}
        aria-pressed={isDark}
        title="Switch to Dark Mode"
      >
        <Moon size={isCompact ? 12 : 14} strokeWidth={isDark ? 2.2 : 1.8} className="theme-btn-icon" />
        <span className="theme-btn-text">Dark</span>
        {isDark && <span className="theme-active-dot" aria-hidden="true" />}
      </button>

      {/* 2. Light Mode Button */}
      <button
        type="button"
        className={`theme-mode-btn ${isLight ? 'active-mode' : ''}`}
        onClick={() => onThemeChange && onThemeChange('light')}
        aria-pressed={isLight}
        title="Switch to Light Mode"
      >
        <Sun size={isCompact ? 12 : 14} strokeWidth={isLight ? 2.2 : 1.8} className="theme-btn-icon" />
        <span className="theme-btn-text">Light</span>
        {isLight && <span className="theme-active-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
