import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Plane,
  ChevronRight,
  Flame,
  Snowflake,
  RefreshCw
} from 'lucide-react';
import IndiaAirfareHeatmap from './IndiaAirfareHeatmap';
import RouteStressIndexWidget from './RouteStressIndexWidget';
import AirportSubstitutionWidget from './AirportSubstitutionWidget';
import AnimatedNumber from './AnimatedNumber';
import localLogo from '../assets/airpulse_logo.png';
import { CLOUDINARY_LOGO_URL } from './Logo';

export default function MoSPIMacroDashboard({
  overviewData,
  routes = [],
  selectedRoute,
  onSelectRoute,
  lastRefreshed = new Date(),
  isRefreshing = false,
  onRefreshData,
  onInspectEngine,
  theme = 'dark',
  onThemeChange
}) {
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [deckSectionTab, setDeckSectionTab] = useState('rsi'); // 'rsi' | 'substitution'

  // Dynamic MoSPI Macro values computed directly from live database
  const latestIndex = overviewData?.latest_index;
  const apixVal = latestIndex?.value != null ? Number(latestIndex.value).toFixed(2) : '—';
  const dailyChange = latestIndex?.change_pct_d1 != null ? Number(latestIndex.change_pct_d1).toFixed(2) : '—';
  const weeklyChange = latestIndex?.change_pct_w1 != null ? Number(latestIndex.change_pct_w1).toFixed(2) : '—';
  const monthlyChange = latestIndex?.change_pct_m1 != null ? Number(latestIndex.change_pct_m1).toFixed(2) : '—';

  const calcDateStr = latestIndex?.calculation_date
    ? (latestIndex.calculation_date.length === 10
        ? new Date(latestIndex.calculation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : latestIndex.calculation_date)
    : null;

  const isRisingDaily = !isNaN(parseFloat(dailyChange)) && parseFloat(dailyChange) >= 0;
  const isRisingWeekly = !isNaN(parseFloat(weeklyChange)) && parseFloat(weeklyChange) >= 0;
  const isRisingMonthly = !isNaN(parseFloat(monthlyChange)) && parseFloat(monthlyChange) >= 0;

  // Format time (e.g. "02:15 AM" or current local time)
  const formatTime = (date) => {
    try {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '02:15 AM';
    }
  };

  const formattedTime = formatTime(lastRefreshed);

  // Top Rising & Top Falling Routes dynamically computed from MongoDB price quotes
  const risingRoutes = (latestIndex?.top_rising_routes && Array.isArray(latestIndex.top_rising_routes))
    ? latestIndex.top_rising_routes
    : [];

  const fallingRoutes = (latestIndex?.top_falling_routes && Array.isArray(latestIndex.top_falling_routes))
    ? latestIndex.top_falling_routes
    : [];

  const handleRouteClick = (routeCode) => {
    if (!onSelectRoute) return;
    const match = routes.find(r => r.route_code === routeCode);
    if (match) {
      onSelectRoute(match);
    } else {
      onSelectRoute({
        code: routeCode.replace('-', ' ✈ '),
        route_code: routeCode,
        name: routeCode
      });
    }
  };

  return (
    <div className="mospi-official-board">
      {/* 1. Official MoSPI Header Banner (Single Unified Page Heading & Control Architecture) */}
      <div className="mospi-official-banner">
        {/* Top Tier: Agency Metadata on Left, Unified Telemetry Capsule on Right */}
        <div className="mospi-banner-meta-bar">
          <div className="mospi-header-eyebrow">
            <span className="mospi-ashoka-pill">AIRPULSE • OFFICIAL MACRO RELEASE</span>
            <span className="mospi-sub-agency">National Statistical Office • MoSPI</span>
            <span className="deck-version-tag font-mono">v2.4.0</span>
          </div>

          <div className="mospi-telemetry-strip">
            <div className="telemetry-pill-item live-pulse">
              <span className="live-pulse-dot"></span>
              <span className="telemetry-label">Pipeline Active</span>
              <span className="telemetry-badge">Live Microdata</span>
            </div>
            <span className="telemetry-divider">/</span>
            <div className="telemetry-pill-item">
              <Clock size={12} className="telemetry-icon" />
              <span className="telemetry-sub">Updated</span>
              <span className="telemetry-val font-mono">{formattedTime}</span>
            </div>
            <span className="telemetry-divider">/</span>
            <div className="telemetry-pill-item health">
              <span className="health-dot-pulse"></span>
              <span className="telemetry-label text-emerald">Data Healthy</span>
            </div>
          </div>
        </div>

        {/* Main Tier: Authoritative Title & Subtitle on Left, Action Buttons on Right */}
        <div className="mospi-banner-main-bar">
          <div className="mospi-banner-title-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '120px',
                height: '76px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <img
                  src={CLOUDINARY_LOGO_URL || localLogo}
                  alt="Airpulse Emblem"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 14px rgba(255, 61, 0, 0.35))'
                  }}
                />
              </div>
              <div>
                <h1 className="mospi-main-title" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', margin: 0 }}>
                  <span>Air<span style={{ color: '#FF5722' }}>pulse</span></span>
                  <span style={{ fontSize: '0.62em', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em' }}>
                    • AIRFARE PRICE INDEX
                  </span>
                </h1>
                <p className="mospi-page-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Real-time Laspeyres Airfare Price Index (Airpulse), high-frequency DGCA basket monitoring & multi-source web-scraped microdata.
                </p>
              </div>
            </div>
          </div>

          <div className="mospi-header-actions-group">
            <button
              type="button"
              className={`mospi-action-btn sync-btn ${isRefreshing ? 'is-syncing' : ''}`}
              onClick={onRefreshData}
              title={`Last synced: ${formattedTime}`}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-pulse' : ''} />
              <span>{isRefreshing ? 'Updating...' : 'Sync Scraped Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Macro Inflation Metrics 4-Card Bar */}
      <div className="mospi-kpi-grid">
        {/* Card 1: Headline APIx */}
        <div className="mospi-kpi-card apix-primary-card">
          <div className="mospi-kpi-card-header">
            <span className="mospi-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>AIRFARE Airpulse</span>
              {calcDateStr && (
                <span className="font-mono" style={{ fontSize: '0.78em', opacity: 0.75, fontWeight: 500, letterSpacing: '0.02em' }}>
                  • {calcDateStr}
                </span>
              )}
            </span>
            <Activity size={16} className="text-vermillion" />
          </div>
          <div className="mospi-kpi-number-row">
            <span className="mospi-kpi-big font-mono"><AnimatedNumber value={apixVal} /></span>
          </div>
          <div className="mospi-kpi-sub-row">
            <span className={`mospi-delta-pill ${isRisingMonthly ? 'positive' : 'negative'}`}>
              <span className="arrow-triangle">{isRisingMonthly ? '▲' : '▼'}</span> <AnimatedNumber value={monthlyChange} prefix={isRisingMonthly ? '+' : ''} suffix="%" />
            </span>
            <span className="mospi-delta-sub">vs Base Period</span>
          </div>
        </div>

        {/* Card 2: Daily Change */}
        <div className="mospi-kpi-card">
          <div className="mospi-kpi-card-header">
            <span className="mospi-kpi-label">DAILY CHANGE</span>
            {isRisingDaily ? <TrendingUp size={16} className="text-vermillion" /> : <TrendingDown size={16} className="text-emerald" />}
          </div>
          <div className="mospi-kpi-number-row">
            <span className={`mospi-kpi-big font-mono ${isRisingDaily ? 'text-vermillion' : 'text-emerald'}`}>
              <AnimatedNumber value={dailyChange} prefix={isRisingDaily ? '+' : ''} suffix="%" />
            </span>
          </div>
          <div className="mospi-kpi-sub-row">
            <span className={`mospi-status-badge ${isRisingDaily ? 'rising' : 'falling'}`}>
              {isRisingDaily ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{isRisingDaily ? 'Rising' : 'Cooling'}</span>
            </span>
            <span className="mospi-delta-sub">24h delta</span>
          </div>
        </div>

        {/* Card 3: Weekly Change */}
        <div className="mospi-kpi-card">
          <div className="mospi-kpi-card-header">
            <span className="mospi-kpi-label">WEEKLY CHANGE</span>
            {isRisingWeekly ? <TrendingUp size={16} className="text-vermillion" /> : <TrendingDown size={16} className="text-emerald" />}
          </div>
          <div className="mospi-kpi-number-row">
            <span className={`mospi-kpi-big font-mono ${isRisingWeekly ? 'text-vermillion' : 'text-emerald'}`}>
              <AnimatedNumber value={weeklyChange} prefix={isRisingWeekly ? '+' : ''} suffix="%" />
            </span>
          </div>
          <div className="mospi-kpi-sub-row">
            <span className={`mospi-status-badge ${isRisingWeekly ? 'rising' : 'falling'}`}>
              {isRisingWeekly ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{isRisingWeekly ? 'Rising' : 'Cooling'}</span>
            </span>
            <span className="mospi-delta-sub">7-day rolling</span>
          </div>
        </div>

        {/* Card 4: Monthly Change */}
        <div className="mospi-kpi-card">
          <div className="mospi-kpi-card-header">
            <span className="mospi-kpi-label">MONTHLY CHANGE</span>
            {isRisingMonthly ? <TrendingUp size={16} className="text-vermillion" /> : <TrendingDown size={16} className="text-emerald" />}
          </div>
          <div className="mospi-kpi-number-row">
            <span className={`mospi-kpi-big font-mono ${isRisingMonthly ? 'text-vermillion' : 'text-emerald'}`}>
              <AnimatedNumber value={monthlyChange} prefix={isRisingMonthly ? '+' : ''} suffix="%" />
            </span>
          </div>
          <div className="mospi-kpi-sub-row">
            <span className={`mospi-status-badge ${isRisingMonthly ? 'rising' : 'falling'}`}>
              {isRisingMonthly ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{isRisingMonthly ? 'Rising' : 'Cooling'}</span>
            </span>
            <span className="mospi-delta-sub">MoM inflation</span>
          </div>
        </div>
      </div>

      {/* 2.5. Intelligent Operational Modules: Route Stress Index (RSI) & Airport Substitution Studio */}
      <div className="deck-modules-wrapper">
        <div className="deck-modules-tab-bar font-mono">
          <button
            type="button"
            className={`deck-module-tab-btn ${deckSectionTab === 'rsi' ? 'active' : ''}`}
            onClick={() => setDeckSectionTab('rsi')}
          >
            <Activity size={15} />
            <span>ROUTE STRESS INDEX (RSI)</span>
            <span className="deck-tab-tag">5-FACTOR DYNAMIC MODEL</span>
          </button>

          <button
            type="button"
            className={`deck-module-tab-btn ${deckSectionTab === 'substitution' ? 'active' : ''}`}
            onClick={() => setDeckSectionTab('substitution')}
          >
            <Compass size={15} />
            <span>AIRPORT SUBSTITUTION & SIMULATION</span>
            <span className="deck-tab-tag">CATCHMENT ARBITRAGE</span>
          </button>
        </div>

        <div className="deck-module-content">
          {deckSectionTab === 'rsi' ? (
            <RouteStressIndexWidget
              selectedRoute={selectedRoute?.route_code}
              onSelectRoute={handleRouteClick}
            />
          ) : (
            <AirportSubstitutionWidget />
          )}
        </div>
      </div>

      {/* 3. Two-Column Routes Matrix: Top Rising vs Top Falling Routes */}
      <div className="mospi-routes-section">
        {/* Left Column: Top Rising */}
        <div className="mospi-route-card rising-card">
          <div className="mospi-route-card-header">
            <div className="header-left-wrap">
              <Flame size={18} className="text-vermillion" />
              <h3 className="route-matrix-title">TOP RISING ROUTES</h3>
            </div>
            <span className="matrix-badge rising">High Inflation Sectors</span>
          </div>

          <div className="mospi-route-list">
            {risingRoutes.map((r, idx) => {
              const isSelected = selectedRoute?.route_code === r.route_code;
              return (
                <div
                  key={r.route_code ? `rising-${r.route_code}-${idx}` : `rising-${idx}`}
                  className={`mospi-route-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleRouteClick(r.route_code)}
                  title={`Click to inspect corridor ${r.route_code}`}
                >
                  <div className="route-codes-wrap">
                    <span className="route-pill font-mono">{r.origin_code} → {r.dest_code}</span>
                    <span className="route-cities-text">{r.origin_city} to {r.dest_city}</span>
                  </div>
                  <div className="route-change-wrap">
                    <span className="route-fare font-mono"><AnimatedNumber value={r.avg_fare} /></span>
                    <span className="route-change-badge positive font-mono"><AnimatedNumber value={r.change} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Top Falling */}
        <div className="mospi-route-card falling-card">
          <div className="mospi-route-card-header">
            <div className="header-left-wrap">
              <Snowflake size={18} className="text-emerald" />
              <h3 className="route-matrix-title">TOP FALLING ROUTES</h3>
            </div>
            <span className="matrix-badge falling">Price Deflation Sectors</span>
          </div>

          <div className="mospi-route-list">
            {fallingRoutes.map((r, idx) => {
              const isSelected = selectedRoute?.route_code === r.route_code;
              return (
                <div
                  key={r.route_code ? `falling-${r.route_code}-${idx}` : `falling-${idx}`}
                  className={`mospi-route-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleRouteClick(r.route_code)}
                  title={`Click to inspect corridor ${r.route_code}`}
                >
                  <div className="route-codes-wrap">
                    <span className="route-pill font-mono">{r.origin_code} → {r.dest_code}</span>
                    <span className="route-cities-text">{r.origin_city} to {r.dest_city}</span>
                  </div>
                  <div className="route-change-wrap">
                    <span className="route-fare font-mono"><AnimatedNumber value={r.avg_fare} /></span>
                    <span className="route-change-badge negative font-mono"><AnimatedNumber value={r.change} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. India Airfare Heatmap Grid (All 10 DGCA Corridors & GitHub Contribution Calendar) */}
      <IndiaAirfareHeatmap
        routes={routes}
        selectedRoute={selectedRoute}
        onSelectRoute={onSelectRoute}
        overviewData={overviewData}
        theme={theme}
      />
    </div>
  );
}
