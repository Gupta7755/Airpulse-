import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  ArrowRight,
  Clock,
  Car,
  AlertOctagon,
  CheckCircle2,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Search,
  Filter
} from 'lucide-react';
import { apiService } from '../services/api';
import AnimatedNumber from './AnimatedNumber';

// Comprehensive registry of all major commercial hub airports in India
const ALL_HUBS = [
  { code: 'DEL', name: 'Delhi IGI', city: 'Delhi', region: 'North', isMetro: true },
  { code: 'BOM', name: 'Mumbai CSMI', city: 'Mumbai', region: 'West', isMetro: true },
  { code: 'BLR', name: 'Bengaluru KIA', city: 'Bengaluru', region: 'South', isMetro: true },
  { code: 'HYD', name: 'Hyderabad RGIA', city: 'Hyderabad', region: 'South', isMetro: true },
  { code: 'CCU', name: 'Kolkata NSCB', city: 'Kolkata', region: 'East & NE', isMetro: true },
  { code: 'MAA', name: 'Chennai Int\'l', city: 'Chennai', region: 'South', isMetro: true },
  { code: 'GOI', name: 'Goa Dabolim', city: 'Goa', region: 'West' },
  { code: 'GOX', name: 'Goa Mopa', city: 'Goa', region: 'West' },
  { code: 'PNQ', name: 'Pune Lohegaon', city: 'Pune', region: 'West' },
  { code: 'AMD', name: 'Ahmedabad SVP', city: 'Ahmedabad', region: 'West' },
  { code: 'COK', name: 'Kochi CIAL', city: 'Kochi', region: 'South' },
  { code: 'JAI', name: 'Jaipur Int\'l', city: 'Jaipur', region: 'North' },
  { code: 'LKO', name: 'Lucknow CCS', city: 'Lucknow', region: 'North' },
  { code: 'GAU', name: 'Guwahati LGBI', city: 'Guwahati', region: 'East & NE' },
  { code: 'PAT', name: 'Patna JPN', city: 'Patna', region: 'East & NE' },
  { code: 'IXC', name: 'Chandigarh SBS', city: 'Chandigarh', region: 'North' },
  { code: 'BBI', name: 'Bhubaneswar BPI', city: 'Bhubaneswar', region: 'East & NE' },
  { code: 'SXR', name: 'Srinagar Int\'l', city: 'Srinagar', region: 'North' },
  { code: 'ATQ', name: 'Amritsar SGRDJ', city: 'Amritsar', region: 'North' },
  { code: 'IDR', name: 'Indore DABH', city: 'Indore', region: 'Central' },
  { code: 'NAG', name: 'Nagpur DBA', city: 'Nagpur', region: 'Central' },
  { code: 'VNS', name: 'Varanasi LBS', city: 'Varanasi', region: 'North' },
  { code: 'IXB', name: 'Bagdogra Int\'l', city: 'Bagdogra', region: 'East & NE' },
  { code: 'TRV', name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', region: 'South' },
  { code: 'IXE', name: 'Mangaluru Int\'l', city: 'Mangaluru', region: 'South' },
  { code: 'CJB', name: 'Coimbatore Int\'l', city: 'Coimbatore', region: 'South' }
];

export default function AirportSubstitutionWidget() {
  const [activeTab, setActiveTab] = useState('intelligence'); // 'intelligence' | 'simulation'
  const [substitutionData, setSubstitutionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Catchment Matrix Filtering
  const [catchmentZone, setCatchmentZone] = useState('All');
  const [catchmentSearch, setCatchmentSearch] = useState('');

  // Simulation Controls State
  const [simHub, setSimHub] = useState('DEL');
  const [simHubZone, setSimHubZone] = useState('All');
  const [simHubSearch, setSimHubSearch] = useState('');
  const [simCapacityCut, setSimCapacityCut] = useState(30);
  const [simWeather, setSimWeather] = useState(50);
  const [simDemandSurge, setSimDemandSurge] = useState(25);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const fetchSubstitutionData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAirportSubstitution();
      if (data && data.pairs) {
        setSubstitutionData(data);
      }
    } catch (err) {
      console.error('Failed to fetch airport substitution intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutionData();
  }, []);

  const handleRunSimulation = async (targetHub = simHub) => {
    setSimLoading(true);
    try {
      const result = await apiService.runAirportSimulation({
        hub_code: targetHub,
        capacity_reduction_pct: simCapacityCut,
        weather_severity_pct: simWeather,
        demand_surge_pct: simDemandSurge
      });
      if (result && result.simulation_results) {
        setSimResult(result);
      }
    } catch (err) {
      console.error('Failed to run simulation:', err);
    } finally {
      setSimLoading(false);
    }
  };

  // Run initial simulation on load for DEL
  useEffect(() => {
    if (!simResult) {
      handleRunSimulation('DEL');
    }
  }, []);

  const handleSelectSimHub = (code) => {
    setSimHub(code);
    handleRunSimulation(code);
  };

  const rawPairs = substitutionData?.pairs || [];

  // Filtered Catchment Pairs
  const filteredPairs = useMemo(() => {
    return rawPairs.filter((p) => {
      // Zone filter
      const matchesZone = catchmentZone === 'All' || p.zone === catchmentZone;
      // Search filter
      const q = catchmentSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        p.primary.code.toLowerCase().includes(q) ||
        p.primary.name.toLowerCase().includes(q) ||
        p.substitute.code.toLowerCase().includes(q) ||
        p.substitute.name.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        (p.substitute.best_for && p.substitute.best_for.toLowerCase().includes(q))
      );
      return matchesZone && matchesSearch;
    });
  }, [rawPairs, catchmentZone, catchmentSearch]);

  // Filtered Hubs for Simulation
  const filteredHubs = useMemo(() => {
    return ALL_HUBS.filter((hub) => {
      const matchesZone =
        simHubZone === 'All' ? true :
        simHubZone === 'Metros' ? hub.isMetro :
        hub.region === simHubZone;

      const q = simHubSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        hub.code.toLowerCase().includes(q) ||
        hub.name.toLowerCase().includes(q) ||
        hub.city.toLowerCase().includes(q)
      );
      return matchesZone && matchesSearch;
    });
  }, [simHubZone, simHubSearch]);

  return (
    <div className="airport-sub-widget-container">
      {/* Header with Dual-Mode Tabs */}
      <div className="airport-sub-header">
        <div className="sub-title-wrap">
          <div className="sub-badge-tag font-mono">
            <Compass size={13} />
            <span>NATIONWIDE CATCHMENT SUBSTITUTION & OPERATIONAL SIMULATOR</span>
          </div>
          <h2 className="sub-main-heading">All-Airports Substitution Intelligence & Operational Simulation</h2>
          <p className="sub-heading-desc">
            Dual-airport catchment price arbitrage across 24 national corridors, ground-transit trade-offs, and interactive what-if disruption shock modeling for all 26 major Indian commercial airports.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="airport-sub-tab-switch">
          <button
            type="button"
            className={`sub-tab-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveTab('intelligence')}
          >
            Catchment Substitution Matrix ({rawPairs.length || 24} Corridors)
          </button>
          <button
            type="button"
            className={`sub-tab-btn ${activeTab === 'simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulation')}
          >
            ⚡ Airport Shock Simulator ({ALL_HUBS.length} Hubs)
          </button>
        </div>
      </div>

      {/* MODE 1: Catchment Substitution Intelligence Matrix */}
      {activeTab === 'intelligence' && (
        <div className="substitution-intelligence-view">
          <div className="sub-info-banner font-mono">
            <span>METROPOLITAN DUAL-AIRPORT CATCHMENT ARBITRAGE ({filteredPairs.length} of {rawPairs.length} Pairs)</span>
            <span className="sub-svi-formula">SVI = Net Savings / Primary Fare - Ground Transit Penalty</span>
          </div>

          {/* Catchment Filters & Search Toolbar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '16px',
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--muted-fg)', textTransform: 'uppercase', marginRight: '4px' }}>
                Zone:
              </span>
              {['All', 'North', 'South', 'West', 'East & NE', 'Central'].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setCatchmentZone(z)}
                  className={`rsi-sort-btn ${catchmentZone === z ? 'active' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '3px 9px' }}
                >
                  {z}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <Search size={14} style={{ color: 'var(--muted-fg)' }} />
              <input
                type="text"
                placeholder="Search airport, city, or pair (e.g. Pune, Jewar, Mopa)..."
                value={catchmentSearch}
                onChange={(e) => setCatchmentSearch(e.target.value)}
                className="search-input"
                style={{ fontSize: '0.75rem', padding: '4px 10px', height: '30px', width: '100%' }}
              />
            </div>
          </div>

          <div className="substitution-pairs-grid">
            {filteredPairs.map((p) => {
              const arb = p.arbitrage;
              return (
                <div key={p.pair_id} className="sub-pair-card">
                  <div className="pair-card-header">
                    <span className="pair-region font-mono">{p.region}</span>
                    <span
                      className="pair-svi-badge font-mono"
                      style={{ borderColor: arb.viability_color, color: arb.viability_color }}
                    >
                      SVI <AnimatedNumber value={arb.svi_score} /> • {arb.viability_level}
                    </span>
                  </div>

                  {/* Primary vs Secondary Visual Comparison */}
                  <div className="pair-airports-comparison">
                    {/* Primary Hub */}
                    <div className="airport-col primary-col">
                      <div className="airport-type-tag">PRIMARY HUB</div>
                      <div className="airport-code font-mono">{p.primary.code}</div>
                      <div className="airport-fullname">{p.primary.name}</div>
                      <div className="airport-fare font-mono"><AnimatedNumber value={p.primary.avg_fare} prefix="₹" decimals={0} /></div>
                      <span className="fare-sub font-mono">Avg Sector Fare</span>
                    </div>

                    <div className="versus-divider">
                      <span className="vs-circle">VS</span>
                      <ArrowRight size={14} className="vs-arrow" />
                    </div>

                    {/* Secondary Substitute */}
                    <div className="airport-col substitute-col">
                      <div className="airport-type-tag sub-tag">SECONDARY ALTERNATE</div>
                      <div className="airport-code font-mono text-emerald">{p.substitute.code}</div>
                      <div className="airport-fullname">{p.substitute.name}</div>
                      <div className="airport-fare font-mono text-emerald">
                        <AnimatedNumber value={p.substitute.avg_fare} prefix="₹" decimals={0} />
                      </div>
                      <span className="fare-sub font-mono text-emerald">
                        Save <AnimatedNumber value={arb.savings_pct} suffix="%" />
                      </span>
                    </div>
                  </div>

                  {/* Ground Transit & Net Savings Metrics */}
                  <div className="pair-metrics-strip font-mono">
                    <div className="metric-cell">
                      <Clock size={12} />
                      <span><AnimatedNumber value={p.substitute.transit_time_mins} /> mins transit</span>
                    </div>
                    <div className="metric-cell">
                      <Car size={12} />
                      <span><AnimatedNumber value={p.substitute.distance_from_hub_km} /> km surface distance</span>
                    </div>
                    <div className="metric-cell highlight-green">
                      <span>Net Savings: <AnimatedNumber value={arb.net_savings_inr} prefix="₹" decimals={0} /></span>
                    </div>
                  </div>

                  {/* Strategic Commuter Advice */}
                  <div className="pair-advice-box">
                    <div className="advice-label font-mono">💡 COMMUTER / AIRLINE RECOMMENDATION</div>
                    <div className="advice-text">{arb.recommendation}</div>
                    <div className="best-for-text">🎯 <strong>Optimal catchment:</strong> {p.substitute.best_for}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPairs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-fg)' }}>
              No catchment pairs match the selected filters.
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Airport Disruption & Scenario Simulator */}
      {activeTab === 'simulation' && (
        <div className="airport-simulation-view">
          <div className="sim-layout-grid">
            {/* Left Control Panel: Sliders & Parameter Inputs */}
            <div className="sim-controls-panel">
              <div className="controls-header font-mono">
                <Sliders size={14} />
                <span>SCENARIO SHOCK PARAMETERS</span>
              </div>

              {/* Parameter 1: Airport Hub Selector across ALL 26 Hubs */}
              <div className="control-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="control-label font-mono" style={{ margin: 0 }}>
                    TARGET COMMERCIAL HUB ({filteredHubs.length} HUBS)
                  </label>
                  <span className="font-mono text-accent" style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>
                    Active: {simHub} ({ALL_HUBS.find(h => h.code === simHub)?.city || simHub})
                  </span>
                </div>

                {/* Hub Region Filter Tabs */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {['All', 'Metros', 'North', 'South', 'West', 'East & NE', 'Central'].map((rz) => (
                    <button
                      key={rz}
                      type="button"
                      onClick={() => setSimHubZone(rz)}
                      className={`rsi-sort-btn ${simHubZone === rz ? 'active' : ''}`}
                      style={{ fontSize: '0.68rem', padding: '2px 7px' }}
                    >
                      {rz}
                    </button>
                  ))}
                </div>

                {/* Search Bar for Hubs */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search hub code or city (e.g. AMD, Kochi, Jaipur)..."
                    value={simHubSearch}
                    onChange={(e) => setSimHubSearch(e.target.value)}
                    className="search-input"
                    style={{ fontSize: '0.74rem', padding: '4px 8px', height: '28px', width: '100%' }}
                  />
                </div>

                {/* Comprehensive Hubs Grid with Scroll */}
                <div
                  className="hub-chips-row font-mono"
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    gridTemplateColumns: 'repeat(2, 1fr)'
                  }}
                >
                  {filteredHubs.map((hub) => (
                    <button
                      key={hub.code}
                      type="button"
                      className={`hub-chip-btn ${simHub === hub.code ? 'active' : ''}`}
                      onClick={() => handleSelectSimHub(hub.code)}
                      title={`Select ${hub.name} for disruption simulation`}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', width: '100%' }}>
                        <span className="chip-code">{hub.code}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--muted-fg)', textTransform: 'uppercase' }}>
                          {hub.region}
                        </span>
                      </div>
                      <span className="chip-name">{hub.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 2: Capacity Reduction Slider */}
              <div className="control-group">
                <div className="slider-label-row font-mono">
                  <span>CAPACITY CONTRACTION (RUNWAY / GATES)</span>
                  <span className="slider-val text-vermillion">-{simCapacityCut}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={simCapacityCut}
                  onChange={(e) => setSimCapacityCut(Number(e.target.value))}
                  className="sim-slider"
                />
                <span className="slider-hint">Simulates runway maintenance, ATC flow restrictions, or aircraft groundings.</span>
              </div>

              {/* Parameter 3: Weather Severity Slider */}
              <div className="control-group">
                <div className="slider-label-row font-mono">
                  <span>WEATHER DISRUPTION (FOG / SMOG / MONSOON)</span>
                  <span className="slider-val text-amber">{simWeather}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={simWeather}
                  onChange={(e) => setSimWeather(Number(e.target.value))}
                  className="sim-slider"
                />
                <span className="slider-hint">Dense CAT III-B fog, winter low visibility, or monsoon coastal gale delays.</span>
              </div>

              {/* Parameter 4: Demand Surge Slider */}
              <div className="control-group">
                <div className="slider-label-row font-mono">
                  <span>DEMAND SURGE (FESTIVE / HOLIDAY RUSH)</span>
                  <span className="slider-val text-purple">+{simDemandSurge}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={simDemandSurge}
                  onChange={(e) => setSimDemandSurge(Number(e.target.value))}
                  className="sim-slider"
                />
                <span className="slider-hint">Spike in holiday travel demand (Diwali, Chhath, Christmas, New Year).</span>
              </div>

              {/* Execute Simulation Button */}
              <button
                type="button"
                className="btn-run-simulation font-mono"
                onClick={() => handleRunSimulation(simHub)}
                disabled={simLoading}
              >
                <Play size={14} className={simLoading ? 'spin-pulse' : ''} />
                <span>{simLoading ? 'Computing Scenario Shock...' : `RUN SHOCK SIMULATION FOR ${simHub}`}</span>
              </button>
            </div>

            {/* Right Output Panel: Projected Shock Outcomes */}
            <div className="sim-results-panel">
              {simResult?.simulation_results ? (
                <>
                  <div className="results-hero-strip">
                    <div className="result-kpi-card fare-shock">
                      <span className="kpi-label font-mono">PROJECTED FARE IMPACT</span>
                      <span className="kpi-num font-mono text-vermillion">
                        <AnimatedNumber value={simResult.simulation_results.projected_fare_impact_pct} prefix="+" suffix="%" />
                      </span>
                      <span className="kpi-sub">Across sectors touching {simResult.hub_code}</span>
                    </div>

                    <div className="result-kpi-card rsi-shock">
                      <span className="kpi-label font-mono">SHOCKED ROUTE STRESS</span>
                      <div className="rsi-shock-transition font-mono">
                        <span className="baseline-rsi"><AnimatedNumber value={simResult.simulation_results.baseline_avg_rsi} decimals={1} /></span>
                        <ArrowRight size={14} />
                        <span className="shocked-rsi text-vermillion"><AnimatedNumber value={simResult.simulation_results.shocked_avg_rsi} decimals={1} /></span>
                      </div>
                      <span className="kpi-sub font-mono text-vermillion">
                        {simResult.simulation_results.shock_level} STRESS STATUS
                      </span>
                    </div>

                    <div className="result-kpi-card pax-shock">
                      <span className="kpi-label font-mono">DISPLACED SEAT CAPACITY</span>
                      <span className="kpi-num font-mono text-amber">
                        <AnimatedNumber value={simResult.simulation_results.daily_displaced_passengers} decimals={0} />
                      </span>
                      <span className="kpi-sub">Estimated daily stranded/diverted pax</span>
                    </div>
                  </div>

                  {/* Optimal Substitution Strategy Rerouting Box */}
                  <div className="substitution-recommendation-card">
                    <div className="sub-rec-header font-mono">
                      <ShieldCheck size={16} className="text-emerald" />
                      <span>OPTIMAL CATCHMENT REROUTING MITIGATION</span>
                    </div>
                    <div className="sub-rec-body">
                      <p className="rec-text">{simResult.simulation_results.recommended_substitution?.mitigation_strategy}</p>
                      <div className="rec-badges-row font-mono">
                        <span className="rec-badge primary">Primary Bottleneck: {simResult.simulation_results.recommended_substitution?.primary_hub}</span>
                        <span className="rec-badge alternate">Alternate Hub: {simResult.simulation_results.recommended_substitution?.alternate_hub} ({simResult.simulation_results.recommended_substitution?.alternate_name})</span>
                        <span className="rec-badge time">Ground Transit: <AnimatedNumber value={simResult.simulation_results.recommended_substitution?.transit_time_mins} /> mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Corridor Shock Projections Table */}
                  <div className="corridors-shock-table-wrap">
                    <div className="table-header font-mono">
                      <span>PROJECTED SECTOR-BY-SECTOR DISRUPTION ({simResult.hub_code} CORRIDORS)</span>
                    </div>
                    <table className="sim-corridors-table font-mono">
                      <thead>
                        <tr>
                          <th>CORRIDOR</th>
                          <th>BASELINE FARE</th>
                          <th>SHOCKED FARE</th>
                          <th>BASELINE RSI</th>
                          <th>SHOCKED RSI</th>
                          <th>RISK TIER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResult.simulation_results.corridor_projections?.map((cp) => (
                          <tr key={cp.route_code}>
                            <td className="corridor-cell font-bold">{cp.route_code}</td>
                            <td><AnimatedNumber value={cp.baseline_fare} prefix="₹" decimals={0} /></td>
                            <td className="text-vermillion font-bold">
                              <AnimatedNumber value={cp.projected_fare} prefix="₹" decimals={0} />
                            </td>
                            <td><AnimatedNumber value={cp.baseline_rsi} decimals={1} /></td>
                            <td className="text-vermillion font-bold"><AnimatedNumber value={cp.shocked_rsi} decimals={1} /></td>
                            <td>
                              <span className="table-risk-pill" style={{ borderColor: cp.color, color: cp.color }}>
                                {cp.level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="sim-placeholder-wrap">
                  <div className="loading-spinner" />
                  <span>Computing simulated operational shock for {simHub}...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
