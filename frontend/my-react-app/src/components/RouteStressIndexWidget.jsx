import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Sliders,
  Scale,
  Zap
} from 'lucide-react';
import { apiService } from '../services/api';
import AnimatedNumber from './AnimatedNumber';

export default function RouteStressIndexWidget({
  onSelectRoute,
  selectedRoute,
  externalRsiData = null
}) {
  const [rsiData, setRsiData] = useState(externalRsiData);
  const [loading, setLoading] = useState(!externalRsiData);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [sortBy, setSortBy] = useState('stress'); // 'stress' | 'fare' | 'name'
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const fetchRSI = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRSI();
      if (data && data.corridors) {
        setRsiData(data);
      }
    } catch (err) {
      console.error('Failed to fetch RSI data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!externalRsiData) {
      fetchRSI();
    } else {
      setRsiData(externalRsiData);
    }
  }, [externalRsiData]);

  const composite = rsiData?.national_composite || {
    rsi: null,
    level: 'COMPUTING',
    color: '#6B7280',
    summary: 'Evaluating real-time multi-corridor market stress from price quotes...',
    top_stressed_route: '—',
    lowest_stressed_route: '—'
  };

  const rawCorridors = rsiData?.corridors || [];

  const sortedCorridors = [...rawCorridors].sort((a, b) => {
    if (sortBy === 'fare') return b.avg_fare - a.avg_fare;
    if (sortBy === 'name') return a.route_code.localeCompare(b.route_code);
    return b.rsi - a.rsi; // default 'stress'
  });

  const toggleExpand = (routeCode, e) => {
    e.stopPropagation();
    setExpandedRoute(expandedRoute === routeCode ? null : routeCode);
  };

  const handleRouteClick = (routeCode) => {
    if (onSelectRoute) {
      onSelectRoute(routeCode);
    }
  };

  return (
    <div className="rsi-widget-container">
      {/* Widget Header & Title */}
      <div className="rsi-widget-header">
        <div className="rsi-title-wrap">
          <div className="rsi-badge-live">
            <span className="live-pulse-dot" style={{ background: composite.color, boxShadow: `0 0 8px ${composite.color}` }} />
            <span>ROUTE STRESS INDEX (RSI)</span>
            <span className="rsi-model-tag">DYNAMIC 5-FACTOR MODEL</span>
          </div>
          <h2 className="rsi-section-heading">DGCA Corridor Stress & Capacity Vulnerability Index</h2>
          <p className="rsi-section-sub">
            Real-time multi-dimensional pricing pressure, seat availability compression, and cross-source market concordance across India's top 10 domestic corridors.
          </p>
        </div>

        <div className="rsi-header-actions">
          <button
            type="button"
            className="rsi-btn-formula"
            onClick={() => setShowFormulaModal(!showFormulaModal)}
            title="Inspect Mathematical Formula & Factor Weights"
          >
            <Scale size={14} />
            <span>Formula & Weights</span>
          </button>

          <button
            type="button"
            className="rsi-btn-refresh"
            onClick={fetchRSI}
            disabled={loading}
            title="Recalculate dynamic RSI"
          >
            <RefreshCw size={13} className={loading ? 'spin-pulse' : ''} />
            <span>{loading ? 'Calculating...' : 'Recalculate'}</span>
          </button>
        </div>
      </div>

      {/* Formula & Weighting Capsule Bar */}
      <div className="rsi-formula-capsule">
        <div className="rsi-formula-equation font-mono">
          <span className="eq-label">FORMULATION:</span>
          <span className="eq-term term-rsi">RSI</span>
          <span className="eq-sym">=</span>
          <span className="eq-term term-fare">0.30·(Fare Anomaly)</span>
          <span className="eq-sym">+</span>
          <span className="eq-term term-avail">0.20·(Availability Drop)</span>
          <span className="eq-sym">+</span>
          <span className="eq-term term-vol">0.20·(Volatility)</span>
          <span className="eq-sym">+</span>
          <span className="eq-term term-dem">0.15·(Demand Proxy)</span>
          <span className="eq-sym">+</span>
          <span className="eq-term term-agree">0.15·(Cross-Source Agreement)</span>
        </div>
        <span className="rsi-zero-hardcoded font-mono">✓ 100% Calculated from MongoDB Quotes</span>
      </div>

      {/* Mathematical Factor Legend Dropdown / Drawer */}
      {showFormulaModal && (
        <div className="rsi-formula-explainer-panel">
          <div className="explainer-grid">
            <div className="explainer-item">
              <div className="explainer-item-header">
                <span className="factor-pill fare">w₁ = 0.30</span>
                <strong>Fare Anomaly</strong>
              </div>
              <p>Deviation of route's current scraped mean fare relative to DGCA 2024-Q1 baseline anchor. Scaled 0–100.</p>
            </div>

            <div className="explainer-item">
              <div className="explainer-item-header">
                <span className="factor-pill avail">w₂ = 0.20</span>
                <strong>Availability Drop</strong>
              </div>
              <p>Yield curve steepness between immediate departure windows (T+0, T+1) vs advance planning windows (T+30, T+45). Acute ratio indicates seat scarcity.</p>
            </div>

            <div className="explainer-item">
              <div className="explainer-item-header">
                <span className="factor-pill vol">w₃ = 0.20</span>
                <strong>Volatility</strong>
              </div>
              <p>Intra-corridor quote price dispersion measured by Coefficient of Variation (CV = σ / μ) across carriers and departures.</p>
            </div>

            <div className="explainer-item">
              <div className="explainer-item-header">
                <span className="factor-pill dem">w₄ = 0.15</span>
                <strong>Demand Proxy</strong>
              </div>
              <p>Route passenger traffic volume from official DGCA annual statistics combined with high-frequency near-term quote density.</p>
            </div>

            <div className="explainer-item">
              <div className="explainer-item-header">
                <span className="factor-pill agree">w₅ = 0.15</span>
                <strong>Cross-Source Agreement</strong>
              </div>
              <p>Concordance between direct scheduled carrier quotes (IndiGo, Air India, Akasa, SpiceJet) and OTA channels (EaseMyTrip). High agreement corroborates systemic stress.</p>
            </div>
          </div>
        </div>
      )}

      {/* National Macro Stress Banner */}
      <div className="rsi-macro-summary-bar">
        <div className="rsi-macro-gauge-box">
          <div className="rsi-dial-value-wrap">
            <span className="rsi-dial-num font-mono" style={{ color: composite.color }}>
              <AnimatedNumber value={composite.rsi} decimals={1} />
            </span>
            <span className="rsi-dial-scale">/ 100</span>
          </div>
          <div className="rsi-level-badge-wrap">
            <span className="rsi-status-pill font-mono" style={{ borderColor: composite.color, color: composite.color }}>
              {composite.level} STRESS
            </span>
            <span className="rsi-gauge-subtext">National Weighted Composite</span>
          </div>
        </div>

        <div className="rsi-macro-meta-col">
          <div className="rsi-macro-narrative">
            <span className="narrative-tag">MoSPI MACRO STATUS:</span> {composite.summary}
          </div>
          <div className="rsi-macro-pills-row font-mono">
            <span className="macro-pill">
              🔥 Highest Stress: <strong>{composite.top_stressed_route}</strong>
            </span>
            <span className="macro-pill">
              🛡️ Most Stable: <strong>{composite.lowest_stressed_route}</strong>
            </span>
            <span className="macro-pill">
              📊 Analyzed: <strong>{rawCorridors.length} Corridors</strong>
            </span>
            <span className="macro-pill">
              ✈️ Microdata: <strong>{rsiData?.total_quotes_evaluated != null ? <AnimatedNumber value={rsiData.total_quotes_evaluated} /> : '—'} Quotes</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Corridor Sorting Controls & Table Header */}
      <div className="rsi-corridors-toolbar">
        <div className="rsi-corridors-title font-mono">
          <span>MONITORED DGCA CORRIDOR STRESS BREAKDOWN</span>
          <span className="rsi-corridor-count">({sortedCorridors.length} Sectors)</span>
        </div>

        <div className="rsi-sort-group">
          <span className="sort-label">Sort:</span>
          <button
            type="button"
            className={`rsi-sort-btn ${sortBy === 'stress' ? 'active' : ''}`}
            onClick={() => setSortBy('stress')}
          >
            Highest Stress
          </button>
          <button
            type="button"
            className={`rsi-sort-btn ${sortBy === 'fare' ? 'active' : ''}`}
            onClick={() => setSortBy('fare')}
          >
            Average Fare
          </button>
          <button
            type="button"
            className={`rsi-sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => setSortBy('name')}
          >
            Corridor
          </button>
        </div>
      </div>

      {/* Corridors Grid */}
      <div className="rsi-corridors-list">
        {sortedCorridors.map((c, idx) => {
          const isSelected = selectedRoute === c.route_code;
          const isExpanded = expandedRoute === c.route_code;

          return (
            <div
              key={c.route_code}
              className={`rsi-corridor-card ${isSelected ? 'is-selected' : ''} ${isExpanded ? 'is-expanded' : ''}`}
              onClick={() => handleRouteClick(c.route_code)}
              title="Click to inspect this corridor across dashboard"
            >
              <div className="rsi-corridor-summary-row">
                {/* Col 1: Rank & Route Codes */}
                <div className="rsi-col-route">
                  <span className="rsi-rank-pill font-mono">#{idx + 1}</span>
                  <div className="rsi-route-text-wrap">
                    <span className="rsi-route-code font-mono">
                      {c.origin_code} → {c.destination_code}
                    </span>
                    <span className="rsi-route-cities">
                      {c.origin_city} to {c.destination_city}
                    </span>
                  </div>
                </div>

                {/* Col 2: Price Telemetry */}
                <div className="rsi-col-fare">
                  <span className="rsi-fare-val font-mono"><AnimatedNumber value={c.avg_fare} prefix="₹" decimals={0} /></span>
                  <span className={`rsi-fare-delta font-mono ${c.fare_delta_pct >= 0 ? 'pos' : 'neg'}`}>
                    <AnimatedNumber value={c.fare_delta_pct} prefix={c.fare_delta_pct >= 0 ? '+' : ''} suffix="%" decimals={1} /> vs base
                  </span>
                </div>

                {/* Col 3: Stress Meter Bar */}
                <div className="rsi-col-meter">
                  <div className="rsi-meter-track">
                    <div
                      className="rsi-meter-fill"
                      style={{
                        width: `${Math.min(100, Math.max(8, c.rsi))}%`,
                        backgroundColor: c.color
                      }}
                    />
                  </div>
                  <div className="rsi-meter-labels font-mono">
                    <span>0</span>
                    <span style={{ color: c.color, fontWeight: 800 }}>RSI <AnimatedNumber value={c.rsi} decimals={1} /></span>
                    <span>100</span>
                  </div>
                </div>

                {/* Col 4: Level Badge & Primary Driver */}
                <div className="rsi-col-status">
                  <span className="rsi-level-tag font-mono" style={{ borderColor: c.color, color: c.color }}>
                    {c.level}
                  </span>
                  <span className="rsi-driver-tag" title="Primary driver influencing this route's stress score">
                    ⚡ {c.primary_driver}
                  </span>
                </div>

                {/* Col 5: Expand Factor Breakdown Toggle */}
                <div className="rsi-col-expand">
                  <button
                    type="button"
                    className="rsi-expand-btn"
                    onClick={(e) => toggleExpand(c.route_code, e)}
                    aria-label="Toggle 5-factor breakdown"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expandable 5-Factor Mathematical Decomposition */}
              {isExpanded && (
                <div className="rsi-factor-breakdown-drawer">
                  <div className="drawer-header font-mono">
                    <span>5-FACTOR MATHEMATICAL DECOMPOSITION FOR {c.route_code}</span>
                    <span className="drawer-sub">Weighted sum yields corridor RSI <AnimatedNumber value={c.rsi} decimals={1} /></span>
                  </div>

                  <div className="rsi-factors-grid">
                    {/* Factor 1: Fare Anomaly */}
                    <div className="factor-breakdown-card">
                      <div className="factor-header">
                        <span className="factor-name">Fare Anomaly</span>
                        <span className="factor-weight font-mono">w₁ = 0.30</span>
                      </div>
                      <div className="factor-meter-wrap">
                        <div className="factor-track">
                          <div
                            className="factor-fill"
                            style={{ width: `${c.factors?.fare_anomaly?.score || 50}%`, backgroundColor: '#FF5722' }}
                          />
                        </div>
                        <span className="factor-score font-mono"><AnimatedNumber value={c.factors?.fare_anomaly?.score} /></span>
                      </div>
                      <span className="factor-detail font-mono">{c.factors?.fare_anomaly?.metric_detail}</span>
                      <span className="factor-contrib font-mono"><AnimatedNumber value={c.factors?.fare_anomaly?.weighted_score || 0} prefix="+" suffix=" pts" decimals={1} /></span>
                    </div>

                    {/* Factor 2: Availability Drop */}
                    <div className="factor-breakdown-card">
                      <div className="factor-header">
                        <span className="factor-name">Availability Drop</span>
                        <span className="factor-weight font-mono">w₂ = 0.20</span>
                      </div>
                      <div className="factor-meter-wrap">
                        <div className="factor-track">
                          <div
                            className="factor-fill"
                            style={{ width: `${c.factors?.availability_drop?.score || 50}%`, backgroundColor: '#F59E0B' }}
                          />
                        </div>
                        <span className="factor-score font-mono"><AnimatedNumber value={c.factors?.availability_drop?.score} /></span>
                      </div>
                      <span className="factor-detail font-mono">{c.factors?.availability_drop?.metric_detail}</span>
                      <span className="factor-contrib font-mono"><AnimatedNumber value={c.factors?.availability_drop?.weighted_score || 0} prefix="+" suffix=" pts" decimals={1} /></span>
                    </div>

                    {/* Factor 3: Volatility */}
                    <div className="factor-breakdown-card">
                      <div className="factor-header">
                        <span className="factor-name">Volatility</span>
                        <span className="factor-weight font-mono">w₃ = 0.20</span>
                      </div>
                      <div className="factor-meter-wrap">
                        <div className="factor-track">
                          <div
                            className="factor-fill"
                            style={{ width: `${c.factors?.volatility?.score || 50}%`, backgroundColor: '#38BDF8' }}
                          />
                        </div>
                        <span className="factor-score font-mono"><AnimatedNumber value={c.factors?.volatility?.score} /></span>
                      </div>
                      <span className="factor-detail font-mono">{c.factors?.volatility?.metric_detail}</span>
                      <span className="factor-contrib font-mono"><AnimatedNumber value={c.factors?.volatility?.weighted_score || 0} prefix="+" suffix=" pts" decimals={1} /></span>
                    </div>

                    {/* Factor 4: Demand Proxy */}
                    <div className="factor-breakdown-card">
                      <div className="factor-header">
                        <span className="factor-name">Demand Proxy</span>
                        <span className="factor-weight font-mono">w₄ = 0.15</span>
                      </div>
                      <div className="factor-meter-wrap">
                        <div className="factor-track">
                          <div
                            className="factor-fill"
                            style={{ width: `${c.factors?.demand_proxy?.score || 50}%`, backgroundColor: '#A855F7' }}
                          />
                        </div>
                        <span className="factor-score font-mono"><AnimatedNumber value={c.factors?.demand_proxy?.score} /></span>
                      </div>
                      <span className="factor-detail font-mono">{c.factors?.demand_proxy?.metric_detail}</span>
                      <span className="factor-contrib font-mono"><AnimatedNumber value={c.factors?.demand_proxy?.weighted_score || 0} prefix="+" suffix=" pts" decimals={1} /></span>
                    </div>

                    {/* Factor 5: Cross-Source Agreement */}
                    <div className="factor-breakdown-card">
                      <div className="factor-header">
                        <span className="factor-name">Cross-Source Agreement</span>
                        <span className="factor-weight font-mono">w₅ = 0.15</span>
                      </div>
                      <div className="factor-meter-wrap">
                        <div className="factor-track">
                          <div
                            className="factor-fill"
                            style={{ width: `${c.factors?.cross_source_agreement?.score || 50}%`, backgroundColor: '#10B981' }}
                          />
                        </div>
                        <span className="factor-score font-mono"><AnimatedNumber value={c.factors?.cross_source_agreement?.score} /></span>
                      </div>
                      <span className="factor-detail font-mono">{c.factors?.cross_source_agreement?.metric_detail}</span>
                      <span className="factor-contrib font-mono"><AnimatedNumber value={c.factors?.cross_source_agreement?.weighted_score || 0} prefix="+" suffix=" pts" decimals={1} /></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

