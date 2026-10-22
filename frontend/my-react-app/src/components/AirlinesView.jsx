import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plane,
  ExternalLink,
  ShieldCheck,
  Database,
  CheckCircle,
  Award,
  RefreshCw,
  Play,
  Pause,
  Filter,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { apiService } from '../services/api';
import AnimatedNumber from './AnimatedNumber';

const DGCA_CORRIDORS = [
  { code: '', label: 'All 10 DGCA Corridors (Weighted Basket)' },
  { code: 'DEL-BOM', label: 'DEL-BOM (Delhi ➔ Mumbai • 22.35%)' },
  { code: 'DEL-BLR', label: 'DEL-BLR (Delhi ➔ Bengaluru • 14.91%)' },
  { code: 'BOM-BLR', label: 'BOM-BLR (Mumbai ➔ Bengaluru • 11.08%)' },
  { code: 'DEL-CCU', label: 'DEL-CCU (Delhi ➔ Kolkata • 9.49%)' },
  { code: 'BLR-HYD', label: 'BLR-HYD (Bengaluru ➔ Hyderabad • 8.49%)' },
  { code: 'MAA-DEL', label: 'MAA-DEL (Chennai ➔ Delhi • 7.95%)' },
  { code: 'DEL-HYD', label: 'DEL-HYD (Delhi ➔ Hyderabad • 7.56%)' },
  { code: 'BOM-GOI', label: 'BOM-GOI (Mumbai ➔ Goa • 6.63%)' },
  { code: 'BOM-MAA', label: 'BOM-MAA (Mumbai ➔ Chennai • 5.96%)' },
  { code: 'CCU-BLR', label: 'CCU-BLR (Kolkata ➔ Bengaluru • 5.57%)' }
];

const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Live';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
};

export default function AirlinesView({ airlines: initialAirlines = [] }) {
  const [airlines, setAirlines] = useState(initialAirlines);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Fetch real-time airlines and OTAs data from database
  const fetchAirlinesData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const params = {};
      if (selectedRoute) params.route_code = selectedRoute;
      const res = await apiService.getAirlines(params);
      if (res && Array.isArray(res) && res.length > 0) {
        setAirlines(res);
        setLastRefreshedAt(Date.now());
      }
    } catch (e) {
      console.error('Failed to fetch dynamic airlines data:', e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedRoute]);

  // Fetch on mount and when corridor changes
  useEffect(() => {
    fetchAirlinesData(true);
  }, [fetchAirlinesData]);

  // Live Auto-Refresh Polling every 4 seconds
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      fetchAirlinesData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isStreaming, fetchAirlinesData]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  const carriers = useMemo(() => airlines.filter(a => a.type === 'AIRLINE'), [airlines]);
  const otas = useMemo(() => airlines.filter(a => a.type === 'OTA'), [airlines]);

  // Dynamic KPI calculations
  const totalCarrierQuotes = useMemo(() => {
    return airlines.reduce((sum, a) => sum + (a.quotes_recorded || a.active_quotes || 0), 0);
  }, [airlines]);

  const avgIndustryFare = useMemo(() => {
    const valid = carriers.filter(c => typeof c.average_fare === 'number' && c.average_fare > 0);
    if (!valid.length) return null;
    const total = valid.reduce((sum, c) => sum + c.average_fare, 0);
    return Math.round(total / valid.length);
  }, [carriers]);

  const dominantCarrier = useMemo(() => {
    if (!carriers.length) return { share: null, code: '—', name: '—' };
    const sorted = [...carriers].sort((a, b) => (b.market_share_pct || b.market_share || 0) - (a.market_share_pct || a.market_share || 0));
    const top = sorted[0];
    return {
      share: top.market_share_pct || top.market_share || 0,
      code: top.code,
      name: top.name
    };
  }, [carriers]);

  return (
    <div className="airlines-view">
      {/* Header Row */}
      <div className="section-header-row">
        <div>
          <div className="badge-pill">
            <Award size={13} />
            <span>REAL-TIME DGCA MARKET COVERAGE & AIRLINE INTELLIGENCE</span>
          </div>
          <h2 className="section-title">Monitored Airlines & OTAs Coverage</h2>
          <p className="section-subtitle">
            Covers 90%+ of Indian domestic aviation capacity across direct scheduled carrier web portals and leading Online Travel Aggregators (OTAs).
          </p>
        </div>
      </div>

      {/* Real-time Stream & Corridor Control Toolbar */}
      <div className="crawler-stream-bar" style={{ marginBottom: '20px' }}>
        <div className="crawler-stream-status">
          <span className={`live-pulse-dot ${isStreaming ? '' : 'dot-paused'}`} />
          <span className="live-stream-pill">
            {isStreaming ? '● LIVE DATABASE CARRIER INTELLIGENCE ACTIVE' : '○ CARRIER STREAM PAUSED'}
          </span>
          <span className="crawler-live-time">
            {secondsAgo <= 3 ? 'Just now' : `${secondsAgo}s ago`}
          </span>
        </div>

        <div className="crawler-stream-actions">
          {/* Corridor Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: 'var(--accent)' }} />
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="filter-select-xs"
              title="Filter carrier metrics by DGCA corridor"
              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
            >
              {DGCA_CORRIDORS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Stream Pause / Resume Toggle */}
          <button
            type="button"
            className="btn-stream-toggle"
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? 'Pause auto-polling stream' : 'Resume live 4s auto-polling stream'}
          >
            {isStreaming ? <Pause size={12} /> : <Play size={12} />}
            <span>{isStreaming ? 'Streaming (4s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            className="btn-stream-toggle"
            onClick={() => fetchAirlinesData(true)}
            disabled={loading}
            title="Force immediate query from database"
          >
            <RefreshCw size={12} className={loading ? 'calc-spinner' : ''} />
            <span>Sync Airlines</span>
          </button>
        </div>
      </div>

      {/* Dynamic Top KPI Summary Strip */}
      <div className="overview-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Monitored Fleet</span>
            <Plane size={16} className="text-accent" />
          </div>
          <div className="kpi-value val-gold">{carriers.length} Carriers + {otas.length} OTAs</div>
          <div className="kpi-caption">
            All 5 major scheduled Indian airlines + 7 OTAs
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Carrier Quotes Ingested</span>
            <Database size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div className="kpi-value font-mono"><AnimatedNumber value={totalCarrierQuotes} /></div>
          <div className="kpi-caption">
            Live observations across {selectedRoute || 'all 10 corridors'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Benchmark Average Fare</span>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value font-mono">
            {avgIndustryFare != null ? <AnimatedNumber value={avgIndustryFare} prefix="₹" /> : '—'}
          </div>
          <div className="kpi-caption">
            Unweighted cross-carrier average for {selectedRoute || 'All Corridors'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Market Dominance</span>
            <Award size={16} style={{ color: '#E5B54F' }} />
          </div>
          <div className="kpi-value font-mono">
            {dominantCarrier.share != null ? (
              <><AnimatedNumber value={dominantCarrier.share} suffix="%" /> ({dominantCarrier.code})</>
            ) : '—'}
          </div>
          <div className="kpi-caption">
            {dominantCarrier.name} DGCA domestic passenger traffic share
          </div>
        </div>
      </div>

      {/* Primary Scheduled Commercial Carriers */}
      <h3 className="subgroup-title">Primary Scheduled Commercial Carriers</h3>
      <div className="airlines-grid">
        {carriers.map((airline) => {
          const hasFare = typeof airline.average_fare === 'number' && airline.average_fare > 0;
          const quotesCount = airline.quotes_recorded || airline.active_quotes || 0;

          return (
            <div key={airline.code} className="airline-card">
              <div className="airline-card-header">
                <div className="airline-badge" style={{ backgroundColor: airline.color_hex || '#1E3A8A' }}>
                  {airline.code}
                </div>
                <div className="airline-title-wrap">
                  <h4 className="airline-name">{airline.name}</h4>
                  <span className="airline-type-tag">Direct Carrier Portal</span>
                </div>
                <a
                  href={airline.base_url}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-link-btn"
                  title={`Visit ${airline.name} Portal`}
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              {/* DGCA Market Share */}
              <div className="market-share-block">
                <div className="share-labels">
                  <span>Domestic Market Share</span>
                  <strong><AnimatedNumber value={airline.market_share_pct || 0} suffix="%" /></strong>
                </div>
                <div className="share-track">
                  <div
                    className="share-fill"
                    style={{
                      width: `${airline.market_share_pct || 0}%`,
                      backgroundColor: airline.color_hex || '#E5B54F'
                    }}
                  ></div>
                </div>
              </div>

              {/* Dynamic Live Price Intelligence */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '4px',
                padding: '10px 12px',
                marginTop: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Avg Fare ({selectedRoute || 'Basket'})
                  </span>
                  <span className="font-mono font-bold" style={{ fontSize: '1.05rem', color: hasFare ? 'var(--accent)' : 'var(--muted-fg)' }}>
                    {hasFare ? <AnimatedNumber value={Math.round(airline.average_fare)} prefix="₹" /> : '--'}
                  </span>
                </div>
                {hasFare && airline.min_fare && airline.max_fare && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--muted-fg)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    <span>Min: <AnimatedNumber value={Math.round(airline.min_fare)} prefix="₹" /></span>
                    <span>Max: <AnimatedNumber value={Math.round(airline.max_fare)} prefix="₹" /></span>
                  </div>
                )}
              </div>

              {/* Quotes & Crawler Telemetry */}
              <div className="airline-metrics-row">
                <div className="air-metric">
                  <Database size={13} />
                  <span><AnimatedNumber value={quotesCount} /> Quotes Ingested</span>
                </div>
                <div className="air-metric live-status">
                  <CheckCircle size={13} style={{ color: '#10b981' }} />
                  <span>
                    {airline.avg_latency_ms ? `${airline.avg_latency_ms}ms` : 'Active'} • {getTimeAgo(airline.last_scraped_at)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href="#scraper"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '5px 10px', fontSize: '0.75rem', textAlign: 'center', textDecoration: 'none' }}
                >
                  Inspect Proof
                </a>
                <a
                  href="#quotes"
                  className="btn-primary"
                  style={{ flex: 1, padding: '5px 10px', fontSize: '0.75rem', textAlign: 'center', textDecoration: 'none' }}
                >
                  Browse Fares
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Online Travel Aggregators (OTAs) */}
      <h3 className="subgroup-title" style={{ marginTop: '36px' }}>Online Travel Aggregators (OTAs) Cross-Validation</h3>
      <div className="airlines-grid ota-grid">
        {otas.map((ota) => {
          const quotesCount = ota.quotes_recorded || ota.active_quotes || 0;

          return (
            <div key={ota.code} className="airline-card ota-card">
              <div className="airline-card-header">
                <div className="airline-badge" style={{ backgroundColor: ota.color_hex || '#0084FF' }}>
                  {ota.code}
                </div>
                <div className="airline-title-wrap">
                  <h4 className="airline-name">{ota.name}</h4>
                  <span className="airline-type-tag">Aggregator Cross-Validation</span>
                </div>
                <a
                  href={ota.base_url}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-link-btn"
                  title={`Visit ${ota.name} Portal`}
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              <p className="ota-role-desc">
                Audits convenience fee variations, platform-exclusive fare surcharges, and secondary seat inventory distribution for consumer price index fidelity.
              </p>

              {/* Live Crawler Telemetry for OTAs */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '10px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--muted-fg)' }}>Audit Protocol:</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>Dual-Headless Resilient</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted-fg)' }}>Avg Probe Latency:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{ota.avg_latency_ms ? `${ota.avg_latency_ms}ms` : '—'}</span>
                </div>
              </div>

              <div className="airline-metrics-row">
                <div className="air-metric">
                  <Database size={13} />
                  <span>{quotesCount.toLocaleString()} Quotes Audited</span>
                </div>
                <div className="air-metric live-status">
                  <CheckCircle size={13} style={{ color: '#10b981' }} />
                  <span>Audited {getTimeAgo(ota.last_scraped_at)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href="#scraper"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '5px 10px', fontSize: '0.75rem', textAlign: 'center', textDecoration: 'none' }}
                >
                  Inspect Proof
                </a>
                <a
                  href="#quotes"
                  className="btn-primary"
                  style={{ flex: 1, padding: '5px 10px', fontSize: '0.75rem', textAlign: 'center', textDecoration: 'none' }}
                >
                  Browse Fares
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
