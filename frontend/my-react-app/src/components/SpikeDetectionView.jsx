import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  CloudRain,
  RefreshCw,
  Clock,
  Plane
} from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { getApiUrl, getAuthHeaders } from '../services/api';

function renderFormattedLine(text) {
  if (!text) return null;
  // Parse **bold** patterns
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function getOrCreateSessionId() {
  try {
    let sid = sessionStorage.getItem('airpulse_intel_session_id');
    if (!sid) {
      sid = 'intel_sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('airpulse_intel_session_id', sid);
    }
    return sid;
  } catch {
    return 'intel_sess_temp';
  }
}

export default function SpikeDetectionView({ routes = [], theme = 'dark', onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'spikes', 'news', 'predictions'
  const [feedItems, setFeedItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, spikes: 0, news: 0, predictions: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch live spikes feed from backend
  const loadFeed = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const endpoint = forceRefresh 
        ? getApiUrl('/intel/refresh')
        : getApiUrl('/intel/feed');

      const res = await fetch(endpoint, {
        method: forceRefresh ? 'POST' : 'GET',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setFeedItems(data.feed || []);
        setStats({
          total: data.total_active_alerts || (data.feed?.length || 0),
          spikes: data.breakdown?.scraper_spikes_count || 0,
          news: data.breakdown?.news_disruptions_count || 0,
          predictions: data.breakdown?.predictive_forecasts_count || 0
        });
      }
    } catch (err) {
      console.warn("Air Intel feed load notice:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  // Filter feed items
  const filteredFeed = feedItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'spikes') return item.type === 'SCRAPER_SPIKE';
    if (activeFilter === 'news') return item.type === 'NEWS_DISRUPTION';
    if (activeFilter === 'predictions') return item.type === 'PREDICTIVE_FORECAST';
    return true;
  });

  return (
    <div className={`spike-detection-container air-intel-root theme-${theme}`} data-theme={theme}>
      {/* 1. Header Telemetry HUD */}
      <div className="spike-hud-banner">
        <div className="hud-left-meta">
          <div className="hud-pills-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div className="hud-live-pill">
              <span className="hud-pulse-dot" />
              <span className="hud-live-text font-mono">LIVE AI RADAR ACTIVE</span>
            </div>
          </div>

          <h1 className="hud-title">AIR INTEL & DISRUPTION RADAR</h1>
          <p className="hud-subtitle">
            Autonomous multi-source intelligence: real-time news disruptions, live scraper anomaly spikes, machine learning price surge forecasts, and interactive AI Q&amp;A.
          </p>
        </div>

        <div className="hud-right-actions">
          <div className="hud-stats-grid font-mono">
            <div className="hud-stat-cell">
              <span className="stat-value text-accent"><AnimatedNumber value={stats.total} /></span>
              <span className="stat-label">ACTIVE ALERTS</span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-value"><AnimatedNumber value={stats.spikes} /></span>
              <span className="stat-label">SCRAPER SPIKES</span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-value"><AnimatedNumber value={stats.news} /></span>
              <span className="stat-label">NEWS DISRUPTIONS</span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-value"><AnimatedNumber value={stats.predictions} /></span>
              <span className="stat-label">ML FORECASTS</span>
            </div>
          </div>

          <button
            type="button"
            className="hud-refresh-btn"
            onClick={() => loadFeed(true)}
            disabled={refreshing || loading}
            title="Fetch fresh real-time RSS news and recompute spikes"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Radar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Tabs */}
      <div className="spike-controls-bar">
        <div className="filter-chips-wrap">
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All Intelligence</span>
            <span className="chip-count font-mono"><AnimatedNumber value={stats.total} /></span>
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'spikes' ? 'active' : ''}`}
            onClick={() => setActiveFilter('spikes')}
          >
            <Zap size={14} className="chip-icon text-amber" />
            <span>Scraper Spikes</span>
            <span className="chip-count font-mono"><AnimatedNumber value={stats.spikes} /></span>
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'news' ? 'active' : ''}`}
            onClick={() => setActiveFilter('news')}
          >
            <CloudRain size={14} className="chip-icon text-blue" />
            <span>Transport &amp; Weather News</span>
            <span className="chip-count font-mono"><AnimatedNumber value={stats.news} /></span>
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveFilter('predictions')}
          >
            <TrendingUp size={14} className="chip-icon text-accent" />
            <span>ML Future Forecasts</span>
            <span className="chip-count font-mono"><AnimatedNumber value={stats.predictions} /></span>
          </button>
        </div>
      </div>

      {/* 3. Main Full-Width Real-Time Radar Broadcast Stream */}
      <div className="broadcast-stream-full-layout">
        <div className="broadcast-stream-column">
          <div className="feed-column-header">
            <div className="header-label-wrap">
              <Activity size={18} className="text-accent" />
              <span className="feed-title">REAL-TIME RADAR BROADCAST STREAM</span>
            </div>
            <span className="feed-counter font-mono"><AnimatedNumber value={filteredFeed.length} /> EVENTS</span>
          </div>

          <div className="feed-cards-scroll">
            {loading && (
              <div className="feed-empty-state">
                <RefreshCw size={26} className="spin-icon text-accent" />
                <p>Retrieving real-time news disruptions &amp; computing scraper spikes...</p>
              </div>
            )}

            {!loading && filteredFeed.length === 0 && (
              <div className="feed-empty-state">
                <AlertTriangle size={28} className="text-amber" />
                <p>No active alerts match the selected filter criteria.</p>
              </div>
            )}

            {!loading && filteredFeed.map((item) => {
              // A. Scraper Spike Card
              if (item.type === 'SCRAPER_SPIKE') {
                return (
                  <div key={item.id} className="intel-card card-scraper-spike">
                    <div className="card-top-meta">
                      <div className="badge-pill badge-spike">
                        <Zap size={13} />
                        <span>SCRAPER DETECTED SPIKE</span>
                      </div>
                      <span className="badge-severity font-mono severity-critical">
                        <AnimatedNumber value={item.surge_pct} prefix="+" suffix="%" /> SURGE
                      </span>
                      <span className="card-time font-mono">
                        <Clock size={12} />
                        {item.detected_at}
                      </span>
                    </div>

                    <h3 className="card-main-title">
                      {item.title} — {item.airline} ({item.route_name || item.route})
                    </h3>

                    <div className="card-route-strip">
                      <span className="route-tag font-mono">
                        <Plane size={13} />
                        {item.route}
                      </span>
                      <span className="flight-number-tag font-mono">{item.flight_number}</span>
                      <span className="advance-tag font-mono">{item.advance_window}</span>
                      <span className="source-tag font-mono">{item.scraper_source}</span>
                    </div>

                    {/* Exact requested details format */}
                    <div className="spike-exact-details-box">
                      <div className="details-header font-mono">
                        Detected unusual spike
                      </div>
                      <div className="details-body font-mono">
                        <div className="detail-row">
                          <span className="detail-label">Details-</span>
                        </div>
                        <div className="detail-row indent">
                          <span className="detail-label">Airline -</span>
                          <span className="detail-value">{item.airline}</span>
                        </div>
                        <div className="detail-row indent">
                          <span className="detail-label">actual price-</span>
                          <span className="detail-value text-accent font-bold">
                            <AnimatedNumber value={item.details?.actual_price || item.actual_price} prefix="₹" />
                          </span>
                        </div>
                        <div className="detail-row indent">
                          <span className="detail-label">expected price-</span>
                          <span className="detail-value text-muted font-bold">
                            <AnimatedNumber value={item.details?.expected_price || item.expected_price} prefix="₹" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.text && (
                      <div className="spike-quote-callout">
                        &ldquo;{item.text}&rdquo;
                      </div>
                    )}

                    {item.details?.reason && (
                      <p className="card-summary-text">
                        <strong>Yield Analysis:</strong> {item.details.reason}
                      </p>
                    )}
                  </div>
                );
              }

              // B. News Transport Disruption Card
              if (item.type === 'NEWS_DISRUPTION') {
                return (
                  <div key={item.id} className="intel-card card-news-disruption">
                    <div className="card-top-meta">
                      <div className="badge-pill badge-news">
                        <CloudRain size={13} />
                        <span>TRANSPORT DISRUPTION NEWS</span>
                      </div>
                      <span className="badge-severity font-mono severity-news">
                        <AnimatedNumber value={item.projected_fare_impact_pct} prefix="+" suffix="%" /> FARE IMPACT
                      </span>
                      <span className="card-time font-mono">
                        <Clock size={12} />
                        {item.detected_at}
                      </span>
                    </div>

                    <h3 className="card-main-title">{item.headline}</h3>

                    {/* Prominent exact message callout */}
                    <div className="news-quote-callout">
                      &ldquo;{item.message}&rdquo;
                    </div>

                    <p className="card-detailed-desc">{item.detailed_impact}</p>

                    <div className="card-footer-meta">
                      <div className="meta-left">
                        <span className="meta-label font-mono">IMPACTED CORRIDORS:</span>
                        <div className="corridor-pills">
                          {item.impacted_routes?.map((r) => (
                            <span key={r} className="corridor-badge font-mono">{r}</span>
                          ))}
                        </div>
                      </div>
                      <div className="meta-right">
                        <span className="source-credit font-mono">SOURCE: {item.source}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // C. Predictive ML Surge Forecast Card
              if (item.type === 'PREDICTIVE_FORECAST') {
                return (
                  <div key={item.id} className="intel-card card-predictive-surge">
                    <div className="card-top-meta">
                      <div className="badge-pill badge-pred">
                        <TrendingUp size={13} />
                        <span>ML FUTURE PRICE PREDICTION</span>
                      </div>
                      <span className="badge-severity font-mono severity-pred">
                        <AnimatedNumber value={item.projected_increase_pct} prefix="+" suffix="%" /> FORECAST SURGE
                      </span>
                      <span className="card-time font-mono">
                        <Clock size={12} />
                        {item.detected_at}
                      </span>
                    </div>

                    <h3 className="card-main-title">{item.headline}</h3>

                    <div className="pred-meta-badges-row">
                      <span className="pred-meta-badge pred-meta-model font-mono">
                        Model: {item.model_type || 'Fourier-ARX Ridge Regression'}
                      </span>
                      {item.training_time_ms && (
                        <span className="pred-meta-badge pred-meta-latency font-mono">
                          Train Latency: {item.training_time_ms}ms (Closed-Form Solve)
                        </span>
                      )}
                      {item.timeframe && (
                        <span className="pred-meta-badge pred-meta-horizon font-mono">
                          Horizon: {item.timeframe}
                        </span>
                      )}
                    </div>

                    {/* Prominent predictive quote */}
                    <div className="predictive-quote-callout">
                      &ldquo;{item.message}&rdquo;
                    </div>

                    <p className="card-detailed-desc">{item.detailed_prediction}</p>

                    <div className="pred-stats-strip font-mono">
                      <div className="stat-unit">
                        <span className="unit-label">BASELINE FARE</span>
                        <span className="unit-val"><AnimatedNumber value={item.baseline_fare} /></span>
                      </div>
                      <div className="stat-unit">
                        <span className="unit-label">PROJECTED SURGE</span>
                        <span className="unit-val text-accent">+<AnimatedNumber value={item.projected_increase_pct} suffix="%" /> (<AnimatedNumber value={item.predicted_fare} />)</span>
                      </div>
                      <div className="stat-unit">
                        <span className="unit-label">CONFIDENCE</span>
                        <span className="unit-val text-green">{item.confidence}</span>
                      </div>
                      <div className="stat-unit">
                        <span className="unit-label">TRAINING DATA</span>
                        <span className="unit-val"><AnimatedNumber value={item.training_samples} /></span>
                      </div>
                    </div>

                    {item.key_drivers && (
                      <div className="pred-drivers-list">
                        <span className="drivers-label font-mono">KEY DRIVERS:</span>
                        <div className="driver-chips">
                          {item.key_drivers.map((d, idx) => (
                            <span key={idx} className="driver-chip font-mono">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
