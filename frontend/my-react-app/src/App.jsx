import React, { useState, useEffect, useCallback } from 'react';
import Logo from './components/Logo';
import Navbar from './components/Navbar';
import HeroTitle from './components/HeroTitle';
import BookingBar from './components/BookingBar';
import BookingModal from './components/BookingModal';
import Grainient from './components/Grainient';
import MapModal from './components/MapModal';
import IndiaRouteMap from './components/IndiaRouteMap';
import IndexTrendChart from './components/IndexTrendChart';
import AdvanceWindowsView from './components/AdvanceWindowsView';
import AirlinesView from './components/AirlinesView';
import QuotesExplorer from './components/QuotesExplorer';
import ScraperHealthView from './components/ScraperHealthView';
import NsoExportView from './components/NsoExportView';
import MoSPIMacroDashboard from './components/MoSPIMacroDashboard';
import SpikeDetectionView from './components/SpikeDetectionView';
import Airport3DDigitalTwin from './components/Airport3DDigitalTwin';
import ThemeToggle from './components/ThemeToggle';
import VolumeReaderButton from './components/VolumeReaderButton';
import SearchNavButton from './components/SearchNavButton';
import QuickSearchModal from './components/QuickSearchModal';
import AirIntelFloatingChat from './components/AirIntelFloatingChat';
import { togglePageReader } from './services/speechReader';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Compass,
  Clock,
  Plane,
  FileSearch,
  Cpu,
  Download,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';

import { apiService } from './services/api';
import AnimatedBorderFrame from './components/AnimatedBorderFrame';
import ErrorBoundary from './components/ErrorBoundary';
import planeBg from './assets/plane-hero.jpg';
import './App.css';


function App() {
  // Navigation State: Always land at poster page ('home') whenever website is opened
  const [activeTab, setActiveTab] = useState('home');

  // Enforce landing on poster page on initial page load / refresh
  useEffect(() => {
    if (window.location.hash) {
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}
    }
  }, []);

  // Mobile menu drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Color Theme State: 'dark' | 'light' (Persisted in localStorage)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('airpulse_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('airpulse_theme', theme);
    } catch {
      // Ignore if localStorage unavailable
    }
  }, [theme]);

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (tabId === 'home') {
      window.location.hash = '';
    } else {
      window.location.hash = tabId;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setMobileMenuOpen(false);
      if (['deck', 'routes', 'trajectory', 'windows', 'airlines', 'quotes', 'scraper', 'export'].includes(hash)) {
        setActiveTab(hash);
      } else if (!hash) {
        setActiveTab('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Airfare Price Index Query State
  const [selectedRoute, setSelectedRoute] = useState({
    code: 'DEL ✈ BOM',
    route_code: 'DEL-BOM',
    name: 'Delhi (DEL) → Mumbai (BOM)',
    trafficWeight: '— DGCA Basket',
    avgFare: '—',
    distance: 1148,
    pax: '—'
  });
  const [advanceWindow, setAdvanceWindow] = useState('T+7 Days');
  const [indexFrequency, setIndexFrequency] = useState('Daily Real-time');
  const [dataSource, setDataSource] = useState('5 Airlines + 7 OTAs');

  // Motion & Modal state
  const [isFlightActive, setIsFlightActive] = useState(true);
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Quick Search Shortcut (Ctrl+K, Cmd+K, or /)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Backend Data States
  const [overviewData, setOverviewData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [windowsData, setWindowsData] = useState([]);
  const [indexSeries, setIndexSeries] = useState([]);
  const [scraperLogs, setScraperLogs] = useState([]);

  // Real-time synchronization state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Master refresh function to update entire frontend data suite from backend
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [overview, routesData, airlinesData, windows, series, logs] = await Promise.all([
        apiService.getOverview(),
        apiService.getRoutes(),
        apiService.getAirlines(),
        apiService.getAdvanceWindows(),
        apiService.getIndexSeries(),
        apiService.getScraperLogs()
      ]);
      if (overview) setOverviewData(overview);
      if (routesData && routesData.length > 0) setRoutes(routesData);
      if (airlinesData && airlinesData.length > 0) setAirlines(airlinesData);
      if (windows && windows.length > 0) setWindowsData(windows);
      if (series && series.length > 0) setIndexSeries(series);
      if (logs && logs.length > 0) setScraperLogs(logs);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Error refreshing whole frontend data:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load + automatic 30s background sync
  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 30000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Synchronize active corridor details from live backend route data
  useEffect(() => {
    if (routes && routes.length > 0) {
      const active = routes.find(r => r.route_code === selectedRoute.route_code) || routes[0];
      setSelectedRoute({
        code: `${active.origin_code} ✈ ${active.destination_code}`,
        route_code: active.route_code,
        name: `${active.origin_city} (${active.origin_code}) → ${active.destination_city} (${active.destination_code})`,
        trafficWeight: active.weight_pct_str ? `${active.weight_pct_str} DGCA Basket` : (active.weight != null ? `${(active.weight * 100).toFixed(2)}% DGCA Basket` : '— DGCA Basket'),
        avgFare: active.average_fare != null ? `₹${Math.round(active.average_fare).toLocaleString()}` : '—',
        distance: active.distance_km,
        pax: active.annual_passengers != null ? active.annual_passengers.toLocaleString() : '—'
      });
    }
  }, [routes]);

  const handleOpenIndexModal = () => {
    setIsIndexModalOpen(true);
  };

  const handleSelectRouteFromMap = (routeObj) => {
    setSelectedRoute({
      code: `${routeObj.origin_code} ✈ ${routeObj.destination_code}`,
      route_code: routeObj.route_code,
      name: `${routeObj.origin_city} (${routeObj.origin_code}) → ${routeObj.destination_city} (${routeObj.destination_code})`,
      trafficWeight: routeObj.weight_pct_str ? `${routeObj.weight_pct_str} DGCA Basket` : (routeObj.weight != null ? `${(routeObj.weight * 100).toFixed(2)}% DGCA Basket` : '— DGCA Basket'),
      avgFare: routeObj.average_fare != null ? `₹${Math.round(routeObj.average_fare).toLocaleString()}` : '—',
      distance: routeObj.distance_km,
      pax: routeObj.annual_passengers != null ? routeObj.annual_passengers.toLocaleString() : '—'
    });
  };

  // Intro Animation State: 'bg-only' -> 'border-drawing' -> 'revealing-elements' -> 'done'
  const [introDone, setIntroDone] = useState(false);
  const [introBorderComplete, setIntroBorderComplete] = useState(false);
  const [introKey, setIntroKey] = useState(0);

  useEffect(() => {
    if (activeTab === 'home' && !introDone) {
      // Border line draws from ~0.1s to ~1.2s (1.1s duration)
      const borderTimer = setTimeout(() => {
        setIntroBorderComplete(true);
      }, 1250);

      // Elements finish popping up by ~2.3s
      const finishTimer = setTimeout(() => {
        setIntroDone(true);
      }, 2350);

      return () => {
        clearTimeout(borderTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [activeTab, introDone, introKey]);

  const handleBorderComplete = useCallback(() => {
    setIntroBorderComplete(true);
  }, []);

  const handleReplayIntro = () => {
    setIntroBorderComplete(false);
    setIntroDone(false);
    setIntroKey(prev => prev + 1);
  };

  const latestIndexVal = overviewData?.latest_index?.value != null ? overviewData.latest_index.value : '—';
  const isHomeScreen = activeTab === 'home';
  const isDeckScreen = activeTab === 'deck';

  return (
    <div className={`harmont-page-root bold-typography-root theme-${theme}`} data-theme={theme}>
      {/* React Bits Grainient Background on Home Page */}
      {isHomeScreen && (
        <div className="home-grainient-bg" aria-hidden="true">
          <Grainient
            color1="#FF3D00"
            color2="#080808"
            color3="#161616"
            timeSpeed={0.12}
            warpStrength={1.1}
            warpFrequency={4.0}
            warpSpeed={1.0}
            warpAmplitude={50.0}
            blendSoftness={0.08}
            rotationAmount={320.0}
            noiseScale={1.8}
            grainAmount={0.07}
            grainScale={2.5}
            grainAnimated={true}
            contrast={1.3}
            gamma={1.0}
            saturation={1.15}
            zoom={0.9}
            lightMode={theme === 'light'}
          />
        </div>
      )}

      {/* Subtle Typographic Backdrop Watermark Layer */}
      {isHomeScreen && (
        <div className="bold-backdrop-watermark" aria-hidden="true">
          Airpulse
        </div>
      )}

      {/* Main Viewport Inset Frame - Sharp 0px Border */}
      <div className={`harmont-viewport-frame ${isHomeScreen ? 'home-simple-frame' : 'dashboard-viewport-frame'} ${isHomeScreen && introBorderComplete ? 'border-completed' : ''}`}>
        {/* Animated Sharp Rectangular Border Frame on Home Screen */}
        {isHomeScreen && (
          <AnimatedBorderFrame
            key={`border-${introKey}`}
            isIntroActive={!introDone}
            onBorderComplete={handleBorderComplete}
          />
        )}

        {/* Left Sidebar Navigation (Docked on Left for Deck and all Monitoring views) */}
        {!isHomeScreen && (
          <Navbar
            activeTab={activeTab}
            onNavigate={handleNavigate}
            onBookClick={handleOpenIndexModal}
            onSearchClick={() => setIsSearchOpen(true)}
            latestIndex={latestIndexVal}
            changePct={overviewData?.latest_index?.change_pct_d1 ?? null}
            theme={theme}
            onThemeChange={setTheme}
            isMobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        )}

        {/* 1. Home Screen: Editorial Typographic Poster Spread */}
        {isHomeScreen && (
          <div
            key={`home-container-${introKey}`}
            className={`home-simple-container bold-home-container ${!introDone ? 'home-intro-active' : 'home-intro-completed'}`}
          >
            {/* Top Section: Editorial Topbar + Direct Suite Links */}
            <div className="home-top-section">
              <header className="home-simple-topbar bold-home-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Logo onClick={isHomeScreen ? handleReplayIntro : () => handleNavigate('home')} />
                <div className="home-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <VolumeReaderButton activeTab="home" size="normal" />
                  <ThemeToggle theme={theme} onThemeChange={setTheme} />
                  <SearchNavButton onClick={() => setIsSearchOpen(true)} size="normal" placeholder="Search" />
                </div>
              </header>

              {/* Massive Typographic Headline */}
              <div className="home-title-top-area">
                <HeroTitle />
              </div>
            </div>

            {/* High-Impact Real-Time Statistics Row */}
            <div className="home-poster-stats-grid">
              <div className="poster-stat-cell">
                <span className="stat-label">DOMESTIC CORRIDORS</span>
                <span className="stat-num text-accent">{overviewData?.basket_stats?.total_corridors || routes.length || 10}</span>
                <span className="stat-sub">High-Density DGCA Routes</span>
              </div>
              <div className="poster-stat-cell">
                <span className="stat-label">ANNUAL PASSENGERS</span>
                <span className="stat-num font-mono">
                  {overviewData?.basket_stats?.tracked_annual_passengers ? `${(overviewData.basket_stats.tracked_annual_passengers / 1e6).toFixed(1)}M` : '—'}
                </span>
                <span className="stat-sub">Tracked Basket Volume</span>
              </div>
              <div className="poster-stat-cell">
                <span className="stat-label">ACTIVE QUOTES</span>
                <span className="stat-num font-mono">
                  {overviewData?.quotes_stats?.total_stored_quotes ? overviewData.quotes_stats.total_stored_quotes.toLocaleString() : (overviewData?.heatmap_stats?.total_quotes_tracked ? overviewData.heatmap_stats.total_quotes_tracked.toLocaleString() : '—')}
                </span>
                <span className="stat-sub">Scraped Price Corpus</span>
              </div>
              <div className="poster-stat-cell highlight-cell">
                <span className="stat-label">BENCHMARK Airpulse</span>
                <span className="stat-num text-accent font-mono">
                  {typeof latestIndexVal === 'number' ? latestIndexVal.toFixed(2) : latestIndexVal}
                </span>
                <span className="stat-sub">Base Period {overviewData?.latest_index?.base_period || '2024-Q1'} = 100.00</span>
              </div>
            </div>

            {/* Get Started Action Button */}
            <div className="home-get-started-container">
              <button
                type="button"
                className="btn-get-started-cta"
                onClick={() => handleNavigate('deck')}
                aria-label="Get Started"
              >
                <span>GET STARTED</span>
                <ArrowRight size={18} strokeWidth={2.5} className="btn-get-started-arrow" />
              </button>
            </div>
          </div>
        )}

        {/* Right Main Content Area (Dashboard & Analytics Suite on White Background) */}
        {!isHomeScreen && (
          <div className="harmont-content-area">
            {/* Sticky Mobile Header Bar (Only visible on screens <= 860px) */}
            <header className="mobile-app-header">
              <button
                type="button"
                className="mobile-hamburger-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
              >
                <Menu size={20} strokeWidth={2} />
              </button>

              <div className="mobile-header-title-wrap" onClick={() => handleNavigate('home')}>
                <span className="mobile-header-brand">Airpulse</span>
                <span className="mobile-header-accent font-mono">Airpulse</span>
                <span className="mobile-active-tab-badge">
                  {activeTab.toUpperCase()}
                </span>
              </div>

              <div className="mobile-header-right">
                <VolumeReaderButton activeTab={activeTab} size="compact" showFullText={false} />
                <ThemeToggle theme={theme} onThemeChange={setTheme} size="compact" />
                <SearchNavButton onClick={() => setIsSearchOpen(true)} size="compact" placeholder="Search" />
              </div>
            </header>

            {/* Desktop Unified Header Bar (Visible on screens > 860px) */}
            <header className="desktop-app-header">
              <div className="desktop-header-left">
                <span className="desktop-header-brand">Airpulse</span>
                <span className="desktop-header-divider font-mono">/</span>
                <span className="desktop-header-tab-name font-mono">{activeTab.toUpperCase()}</span>
                <span className="desktop-header-badge font-mono">
                  {activeTab === 'spikes' ? 'AIR INTEL RADAR' :
                   activeTab === 'deck' ? 'EXECUTIVE FLIGHT DECK' :
                   activeTab === 'routes' ? 'DGCA CORRIDOR BASKET' :
                   activeTab === 'trajectory' ? 'Airpulse BENCHMARK TRENDS' :
                   activeTab === 'windows' ? 'ADVANCE BOOKING CURVES' :
                   activeTab === 'airlines' ? 'AIRLINES & OTAs' :
                   activeTab === 'quotes' ? 'LIVE FARE MICRODATA' :
                   activeTab === 'scraper' ? 'CRAWLER HEALTH' :
                   activeTab === 'export' ? 'DATASETS & API KEYS' : 'DASHBOARD'}
                </span>
              </div>

              <div className="desktop-header-right">
                <VolumeReaderButton activeTab={activeTab} size="normal" showFullText={true} />
                <ThemeToggle theme={theme} onThemeChange={setTheme} size="normal" />
                <SearchNavButton onClick={() => setIsSearchOpen(true)} size="normal" placeholder="Search" />
              </div>
            </header>

            {/* Tab 1: Executive Flight Deck (White Dashboard, No Co-relation to Home Screen) */}
            {activeTab === 'deck' && (
              <div className="deck-white-dashboard">
                {/* Official MoSPI / NSO Macro Architecture Header & Wireframe */}
                <ErrorBoundary title="MoSPI Flight Deck Dashboard" onReset={refreshAllData}>
                  <MoSPIMacroDashboard
                    overviewData={overviewData}
                    routes={routes}
                    selectedRoute={selectedRoute}
                    onSelectRoute={handleSelectRouteFromMap}
                    lastRefreshed={lastRefreshed}
                    isRefreshing={isRefreshing}
                    onRefreshData={refreshAllData}
                    onInspectEngine={handleOpenIndexModal}
                    theme={theme}
                    onThemeChange={setTheme}
                  />
                </ErrorBoundary>

                {/* Section Divider: Extended Basket Telemetry & Operational Controls */}
                <div className="deck-telemetry-divider">
                  <div className="divider-line"></div>
                  <div className="divider-badge">
                    <span>EXTENDED DGCA BASKET TELEMETRY & FLIGHT DECK CONTROLS</span>
                  </div>
                  <div className="divider-line"></div>
                </div>

                {/* 2. Operational Basket KPI Cards (3 Cards Grid) */}
                <div className="deck-kpi-grid">
                  {/* KPI 1: Primary Corridor Anchor */}
                  <div className="deck-kpi-card">
                    <div className="kpi-card-top">
                      <span className="kpi-label">PRIMARY CORRIDOR ANCHOR</span>
                      <span className="kpi-icon-wrap blue"><Compass size={18} /></span>
                    </div>
                    <div className="kpi-value-row">
                      <span className="kpi-text-val">{selectedRoute.code}</span>
                      <span className="kpi-pill-badge neutral">{selectedRoute.trafficWeight || '— Basket'}</span>
                    </div>
                    <div className="kpi-footer-text">
                      <span>Avg Fare: {selectedRoute.avgFare || '—'}</span>
                      <span className="kpi-bullet">•</span>
                      <span>{selectedRoute.pax || '—'} annual pax</span>
                    </div>
                  </div>

                  {/* KPI 2: Advance Booking Window */}
                  <div className="deck-kpi-card">
                    <div className="kpi-card-top">
                      <span className="kpi-label">ADVANCE BOOKING WINDOW</span>
                      <span className="kpi-icon-wrap purple"><Clock size={18} /></span>
                    </div>
                    <div className="kpi-value-row">
                      <span className="kpi-text-val">{advanceWindow}</span>
                      <span className="kpi-pill-badge blue">Spot Curve</span>
                    </div>
                    <div className="kpi-footer-text">
                      <span>6 Horizons: T+0 to T+45 days</span>
                      <span className="kpi-bullet">•</span>
                      <span>Lead Time Weights</span>
                    </div>
                  </div>

                  {/* KPI 3: Microdata Ingestion */}
                  <div className="deck-kpi-card">
                    <div className="kpi-card-top">
                      <span className="kpi-label">MICRODATA INGESTION</span>
                      <span className="kpi-icon-wrap green"><Cpu size={18} /></span>
                    </div>
                    <div className="kpi-value-row">
                      <span className="kpi-number">
                        {overviewData?.quotes_stats?.total_stored_quotes ? overviewData.quotes_stats.total_stored_quotes.toLocaleString() : '—'}
                      </span>
                      <span className="kpi-pill-badge green">Live MongoDB</span>
                    </div>
                    <div className="kpi-footer-text">
                      <span>
                        {overviewData?.airline_stats ? `${overviewData.airline_stats.carriers_count} Airlines + ${overviewData.airline_stats.otas_count} OTAs` : '5 Airlines + 7 OTAs'}
                      </span>
                      <span className="kpi-bullet">•</span>
                      <span>Real-time Ingestion</span>
                    </div>
                  </div>
                </div>

                {/* 3. Interactive Corridor Configuration Bar */}
                <div className="deck-search-section">
                  <div className="deck-section-title-row">
                    <div>
                      <h3 className="deck-section-title">Query Corridor Basket & Calculate Airpulse</h3>
                      <p className="deck-section-desc">Select DGCA corridor, advance horizon, frequency aggregation, and portal sources.</p>
                    </div>
                  </div>
                  <div className="deck-booking-bar-wrapper">
                    <BookingBar
                      selectedRoute={selectedRoute}
                      setSelectedRoute={setSelectedRoute}
                      advanceWindow={advanceWindow}
                      setAdvanceWindow={setAdvanceWindow}
                      indexFrequency={indexFrequency}
                      setIndexFrequency={setIndexFrequency}
                      dataSource={dataSource}
                      setDataSource={setDataSource}
                      onGenerateIndex={handleOpenIndexModal}
                      routes={routes}
                    />
                  </div>
                </div>

                {/* 4. Telemetry & Analytics Grid */}
                <div className="deck-lower-grid">
                  {/* Left Card: Top DGCA Corridors Quick Matrix */}
                  <div className="deck-card corridor-table-card">
                    <div className="deck-card-header">
                      <div>
                        <h4 className="card-heading">DGCA Representative Corridor Basket</h4>
                        <p className="card-subtext">Official passenger traffic weights ($w_r$) and live sector pricing</p>
                      </div>
                      <button
                        type="button"
                        className="deck-link-btn"
                        onClick={() => handleNavigate('routes')}
                      >
                        <span>Full Basket Map</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="deck-mini-table-wrap">
                      <table className="deck-mini-table">
                        <thead>
                          <tr>
                            <th>Corridor</th>
                            <th>Route Name</th>
                            <th>Basket Weight</th>
                            <th>Avg Fare</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routes.slice(0, 5).map((r, idx) => (
                            <tr key={r.route_code ? `${r.route_code}-${idx}` : idx} className={r.route_code === selectedRoute.route_code ? 'active-corridor-row' : ''}>
                              <td>
                                <span className="route-tag-pill">{r.route_code}</span>
                              </td>
                              <td>{r.origin_city} ➔ {r.destination_city}</td>
                              <td className="font-semibold text-gold">{(r.weight * 100).toFixed(2)}%</td>
                              <td className="font-mono">{r.average_fare != null ? `₹${Math.round(r.average_fare).toLocaleString()}` : '—'}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-select-deck-route"
                                  onClick={() => handleSelectRouteFromMap(r)}
                                >
                                  {r.route_code === selectedRoute.route_code ? 'Selected' : 'Select'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Card: Quick Laspeyres & Horizon Telemetry */}
                  <div className="deck-card telemetry-insights-card">
                    <div className="deck-card-header">
                      <div>
                        <h4 className="card-heading">Index Telemetry & Advance Horizons</h4>
                        <p className="card-subtext">Laspeyres formulation & dynamic purchase curves</p>
                      </div>
                      <button
                        type="button"
                        className="deck-link-btn"
                        onClick={() => handleNavigate('trajectory')}
                      >
                        <span>Inflation Trend</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Laspeyres Formula Snippet */}
                    <div className="formula-preview-box">
                      <div className="math-equation math-equation-sm">
                        <span className="math-var">APIx</span><sub>t</sub>
                        <span className="math-op">=</span>
                        <span className="math-const">100</span>
                        <span className="math-op">×</span>
                        <div className="math-sigma-wrap">
                          <span className="sigma-limit-top">10</span>
                          <span className="sigma-symbol">∑</span>
                          <span className="sigma-limit-bot"><span className="math-var">r</span>=1</span>
                        </div>
                        <span className="math-bracket">[</span>
                        <span className="math-var">w</span><sub>r</sub>
                        <span className="math-op">×</span>
                        <div className="math-fraction">
                          <span className="math-num"><span className="math-var">P</span><sub>r,t</sub></span>
                          <span className="math-denom"><span className="math-var">P</span><sub>r,0</sub></span>
                        </div>
                        <span className="math-bracket">]</span>
                      </div>
                      <div className="formula-caption">
                        Official Laspeyres index algorithm: passenger traffic weighted sum of corridor price relatives (Base: 2024-Q1 = 100.0).
                      </div>
                    </div>

                    {/* Advance Windows Progress Bars (Live Dynamic from MongoDB) */}
                    <div className="advance-horizons-mini-list">
                      {windowsData.slice(0, 5).map((win, idx) => {
                        const colorClass = idx === 0 ? 'fill-red' : idx === 1 ? 'fill-gold' : idx === 2 ? 'fill-blue' : 'fill-emerald';
                        const validFares = windowsData.map(w => w.average_fare).filter(f => f != null);
                        const maxVal = validFares.length > 0 ? Math.max(...validFares) : 1;
                        const pct = win.average_fare != null ? Math.min(100, Math.max(0, Math.round((win.average_fare / maxVal) * 100))) : 0;
                        const multiplierText = win.surge_multiplier ? ` • ${win.surge_multiplier}x` : '';
                        return (
                          <div className="horizon-item" key={win.advance_window ? `${win.advance_window}-${idx}` : idx}>
                            <div className="horizon-labels">
                              <span className="h-name">{win.label || win.advance_window}</span>
                              <span className="h-val font-mono">
                                {win.average_fare != null ? `₹${Math.round(win.average_fare).toLocaleString()}` : '—'}{multiplierText} • {win.quote_count || 0} quotes
                              </span>
                            </div>
                            <div className="horizon-bar-track">
                              <div className={`horizon-bar-fill ${colorClass}`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Spike Detection & AI Disruption Radar */}
            {activeTab === 'spikes' && (
              <SpikeDetectionView
                routes={routes}
                theme={theme}
                onNavigate={handleNavigate}
              />
            )}

            {/* Tab: Live Flight Map & Radar Hub (Major 20 DGCA Airports) */}
            {activeTab === 'airports3d' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap" style={{ maxWidth: '1440px' }}>
                  <Airport3DDigitalTwin theme={theme} />
                </div>
              </div>
            )}

            {/* Tab 2: DGCA Route Basket & Interactive Indian Map */}
            {activeTab === 'routes' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <IndiaRouteMap
                    routes={routes}
                    onSelectRoute={handleSelectRouteFromMap}
                    selectedRouteCode={selectedRoute.route_code}
                  />

                  {/* DGCA Normalized Basket Weights Table */}
                  <div className="basket-weights-card">
                    <div className="card-header-flex">
                      <div>
                        <h3 className="subgroup-title">Official DGCA Route Basket & Statistical Weights (Σ w_r = 1.000000)</h3>
                        <p className="subgroup-sub">Based on official Directorate General of Civil Aviation domestic passenger traffic statistics.</p>
                      </div>
                      <button className="btn-table-action" onClick={() => setActiveTab('deck')}>
                        Configure in Deck
                      </button>
                    </div>

                    <div className="table-responsive-wrapper">
                      <table className="quotes-table">
                        <thead>
                          <tr>
                            <th>Corridor</th>
                            <th>City Pair</th>
                            <th>Distance (km)</th>
                            <th>Annual Passengers</th>
                            <th>Traffic Share</th>
                            <th>Basket Weight ($w_r$)</th>
                            <th>Avg Sector Fare</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routes.map((r, idx) => (
                            <tr key={r.route_code ? `${r.route_code}-${idx}` : idx} className={r.route_code === selectedRoute.route_code ? 'highlighted-row' : ''}>
                              <td className="font-mono font-bold">
                                <span className="route-badge-sm">{r.route_code}</span>
                              </td>
                              <td>{r.origin_city} ➔ {r.destination_city}</td>
                              <td className="font-mono">{r.distance_km} km</td>
                              <td className="font-mono">{(r.annual_passengers || 0).toLocaleString()}</td>
                              <td className="font-mono">{((r.passenger_share || 0) * 100).toFixed(2)}%</td>
                              <td className="font-bold val-gold">{r.weight_pct_str || `${((r.weight || 0) * 100).toFixed(2)}%`}</td>
                              <td className="font-mono">{r.average_fare != null ? `₹${Math.round(r.average_fare).toLocaleString()}` : '—'}</td>
                              <td>
                                <button
                                  className="btn-select-route-sm"
                                  onClick={() => {
                                    handleSelectRouteFromMap(r);
                                    setIsIndexModalOpen(true);
                                  }}
                                >
                                  Inspect Fares
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: APIx Inflation Trajectory */}
            {activeTab === 'trajectory' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <IndexTrendChart indexSeries={indexSeries} overviewData={overviewData} />
                </div>
              </div>
            )}

            {/* Tab 4: Advance Purchase Windows */}
            {activeTab === 'windows' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <AdvanceWindowsView windowsData={windowsData} />
                </div>
              </div>
            )}

            {/* Tab 5: Monitored Airlines & OTAs */}
            {activeTab === 'airlines' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <AirlinesView airlines={airlines} />
                </div>
              </div>
            )}

            {/* Tab 6: Live Quotes Explorer & Proof of Source */}
            {activeTab === 'quotes' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <QuotesExplorer refreshTrigger={lastRefreshed} />
                </div>
              </div>
            )}

            {/* Tab 7: Scraper Health & Crawler Logs */}
            {activeTab === 'scraper' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <ScraperHealthView
                    logs={scraperLogs}
                    scraperStats={overviewData?.scraper_health || {}}
                    theme={theme}
                  />
                </div>
              </div>
            )}

            {/* Tab 8: MoSPI / NSO CPI Export */}
            {activeTab === 'export' && (
              <div className="analytics-scroll-container">
                <div className="analytics-inner-wrap">
                  <NsoExportView
                    routes={routes}
                    indexSeries={indexSeries}
                    overviewData={overviewData}
                    theme={theme}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Airfare Price Index & CPI Report Modal */}
      <BookingModal
        isOpen={isIndexModalOpen}
        onClose={() => setIsIndexModalOpen(false)}
        route={selectedRoute}
        advanceWindow={advanceWindow}
        indexFrequency={indexFrequency}
        dataSource={dataSource}
      />

      {/* Flight Radar & ADS-B Telemetry Modal */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />

      {/* Quick Search & Command Navigation Modal */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
        onSelectRoute={handleSelectRouteFromMap}
        onOpenIndexModal={handleOpenIndexModal}
        onToggleSpeech={togglePageReader}
        routes={routes}
      />

      {/* Global Airpulse Intelligence Q&A Floating Assistant */}
      <AirIntelFloatingChat theme={theme} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
