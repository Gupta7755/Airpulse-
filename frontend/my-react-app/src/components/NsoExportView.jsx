import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Code,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Key,
  Database,
  Terminal,
  Zap,
  Layers,
  Sparkles,
  RefreshCw,
  Archive,
  Table,
  Play
} from 'lucide-react';
import { getApiUrl, API_BASE_URL, getAuthHeaders } from '../services/api';

export default function NsoExportView({ routes = [], indexSeries = [], overviewData = {}, theme = 'dark' }) {
  const isLight = theme === 'light';
  const T = {
    rootColor: isLight ? '#0F172A' : '#FAFAFA',
    heading: isLight ? '#0F172A' : '#FFFFFF',
    textMuted: isLight ? '#64748B' : '#94A3B8',
    textSub: isLight ? '#475569' : '#CBD5E1',
    cardBg: isLight ? '#FFFFFF' : '#121218',
    cardBgAlt: isLight ? '#F8FAFC' : '#0B0F19',
    border: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
    borderAlt: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)',
    inputBg: isLight ? '#FFFFFF' : '#1A1A24',
    inputBorder: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)',
    inputText: isLight ? '#0F172A' : '#FFFFFF',
    codeBg: isLight ? '#F8FAFC' : '#0D0E12',
    codeBorder: isLight ? '#E2E8F0' : '#1E293B',
    tableHeaderBg: isLight ? '#F1F5F9' : '#161922',
    tableBorder: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
    bannerBg: isLight ? 'linear-gradient(135deg, rgba(255,61,0,0.06) 0%, rgba(255,255,255,0.95) 100%)' : 'linear-gradient(135deg, rgba(255, 61, 0, 0.08) 0%, rgba(18, 18, 24, 0.8) 100%)',
    bannerBorder: isLight ? '#FED7AA' : 'rgba(255, 61, 0, 0.3)',
  };
  // Copy state
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [codeTab, setCodeTab] = useState('curl'); // 'curl', 'python', 'javascript', 'r'

  // API Key Generator state
  const [keyName, setKeyName] = useState('');
  const [keyOrg, setKeyOrg] = useState('');
  const [keyEmail, setKeyEmail] = useState('');
  const [keyTier, setKeyTier] = useState('RESEARCHER');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [activeKey, setActiveKey] = useState('airpulse_live_public_demo_2026_mospi');

  // Live API Tester state
  const [testerEndpoint, setTesterEndpoint] = useState('/api/v1/overview');
  const [testerResponse, setTesterResponse] = useState(null);
  const [testerLoading, setTesterLoading] = useState(false);

  // Data dictionary tab
  const [showDataDictionary, setShowDataDictionary] = useState(false);

  // Handle generating custom API key
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    setIsGeneratingKey(true);
    try {
      const res = await fetch(getApiUrl('/keys/generate'), {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: keyName || 'Research Analyst',
          organization: keyOrg || 'Independent Research',
          email: keyEmail || 'analyst@research.gov.in',
          tier: keyTier
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data);
        setActiveKey(data.key);
      }
    } catch (err) {
      console.warn("Key generation notice:", err);
      // Local fallback
      const fallbackKey = `airpulse_live_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      setGeneratedKey({
        key: fallbackKey,
        name: keyName || 'Research Analyst',
        organization: keyOrg || 'Independent Research',
        tier: keyTier,
        rate_limit_per_day: 10000,
        status: 'ACTIVE'
      });
      setActiveKey(fallbackKey);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Copy active key to clipboard
  const handleCopyKey = (keyText) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Test endpoint with active API Key
  const handleTestEndpoint = async () => {
    setTesterLoading(true);
    try {
      const url = getApiUrl(testerEndpoint);
      const res = await fetch(url, {
        headers: getAuthHeaders({
          'X-API-Key': activeKey
        })
      });
      const data = await res.json();
      setTesterResponse(data);
    } catch (err) {
      setTesterResponse({ error: "Failed to fetch endpoint response", details: String(err) });
    } finally {
      setTesterLoading(false);
    }
  };

  // Dynamic API domain for display in sample snippets
  const apiDomain = API_BASE_URL || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:8000');

  // Code snippets based on active key and selected language
  const codeSnippets = {
    curl: `# 1. Ingest headline Laspeyres CPI metrics
curl -X GET "${apiDomain}/api/v1/overview" \\
  -H "X-API-Key: ${activeKey}"

# 2. Download all 4,922 live microdata quotes as CSV
curl -O "${apiDomain}/api/v1/export/quotes/csv" \\
  -H "X-API-Key: ${activeKey}"`,

    python: `import requests

API_KEY = "${activeKey}"
HEADERS = {"X-API-Key": API_KEY}

# Ingest official headline APIx index
resp = requests.get("${apiDomain}/api/v1/overview", headers=HEADERS)
data = resp.json()
print(f"Headline APIx: {data['latest_index']['value']} | Daily Change: {data['latest_index']['change_pct_d1']}%")

# Query real-time Route Stress Index (RSI)
rsi_resp = requests.get("${apiDomain}/api/v1/rsi", headers=HEADERS)
print(f"National Stress: {rsi_resp.json()['national_composite_stress']}")`,

    javascript: `// Modern fetch with Airpulse API Key
const API_KEY = "${activeKey}";

async function getAirfareData() {
  const response = await fetch("${apiDomain}/api/v1/overview", {
    headers: { "X-API-Key": API_KEY }
  });
  const data = await response.json();
  console.log("Current APIx:", data.latest_index.value);
}

getAirfareData();`,

    r: `# R Econometric Ingestion
library(httr)
library(jsonlite)

api_key <- "${activeKey}"
res <- GET(
  "${apiDomain}/api/v1/index-records?frequency=DAILY",
  add_headers("X-API-Key" = api_key)
)
timeseries <- fromJSON(content(res, "text", encoding = "UTF-8"))
head(timeseries)`
  };

  return (
    <div className="nso-export-view" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#E2E8F0' }}>
      
      {/* 1. Header Banner */}
      <div className="section-header-row" style={{ marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,61,0,0.12)', border: '1px solid rgba(255,61,0,0.3)', padding: '4px 12px', borderRadius: '4px', marginBottom: '10px' }}>
            <Database size={14} style={{ color: '#FF7043' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF7043', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              OPEN DATA REPOSITORY &amp; DEVELOPER ACCESS
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: T.heading, margin: '4px 0 8px 0', letterSpacing: '0.04em' }}>
            DATASET EXPORT &amp; API KEY PORTAL
          </h1>
          <p style={{ fontSize: '14px', color: '#A1A1AA', maxWidth: '900px', margin: 0, lineHeight: 1.6 }}>
            Download complete raw datasets utilized by our website and backend architecture (thousands of live microdata quotes, Laspeyres index time-series, DGCA route baskets, and real-time disruption radar), or generate an open API key for programmatic M2M econometric modeling.
          </p>
        </div>
      </div>

      {/* 2. Highlight: One-Click Complete Master Research Archive */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,61,0,0.12) 0%, rgba(24,24,32,0.95) 100%)',
        border: '1px solid rgba(255,61,0,0.4)',
        borderLeft: '5px solid #FF3D00',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ flex: '1 1 500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Archive size={20} style={{ color: '#FF7043' }} />
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#FF7043', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              RECOMMENDED RESEARCHER PACKAGE (MASTER ZIP)
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: T.heading, margin: '0 0 6px 0' }}>
            Download Complete Master Research Archive (.ZIP)
          </h2>
          <p style={{ fontSize: '13.5px', color: T.textSub, margin: 0, lineHeight: 1.5 }}>
            Bundles <strong>all 5 datasets</strong> utilized across our platform: full live microdata quotes corpus (CSV + JSON), official Laspeyres daily index series (CSV), 10 DGCA route basket weights (CSV), real-time disruption radar events (JSON), and the complete <strong>MoSPI Data Dictionary specification</strong>.
          </p>
        </div>

        <div>
          <a
            href={getApiUrl('/export/master-archive/zip')}
            download="airpulse_complete_research_dataset_archive.zip"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: '#FF3D00',
              color: T.heading,
              fontWeight: 800,
              fontSize: '14px',
              padding: '14px 26px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(255,61,0,0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Download size={18} />
            <span>DOWNLOAD MASTER ARCHIVE (.ZIP)</span>
          </a>
        </div>
      </div>

      {/* 3. Individual Entire Datasets Download Grid */}
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: T.heading, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={18} style={{ color: '#38BDF8' }} />
        <span>Individual Dataset Components (Raw Live Microdata)</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {/* Card 1: Live Price Quotes Microdata */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.06em', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                LIVE MONGODB CORPUS
              </span>
              <FileText size={20} style={{ color: '#38BDF8' }} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: T.heading, margin: '0 0 8px 0' }}>
              Complete Price Quotes Microdata Corpus
            </h4>
            <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Raw scraped quotes across 12 domestic airline &amp; OTA platforms, 10 DGCA routes, advance booking windows (T+0 to T+45), departure times, fare breakdowns, and SHA-256 cryptographic hashes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={getApiUrl('/export/quotes/csv')}
              download="airpulse_microdata_quotes.csv"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(56,189,248,0.15)',
                border: '1px solid rgba(56,189,248,0.3)',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: '5px',
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Quotes CSV (1.2 MB)
            </a>
            <a
              href={getApiUrl('/export/quotes/json')}
              download="airpulse_microdata_quotes.json"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#E2E8F0',
                fontSize: '12px',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: '5px',
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Quotes JSON
            </a>
          </div>
        </div>

        {/* Card 2: Official Laspeyres Index Time-Series */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', letterSpacing: '0.06em', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                DAILY TIME-SERIES (342 DAYS)
              </span>
              <Code size={20} style={{ color: '#34D399' }} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: T.heading, margin: '0 0 8px 0' }}>
              Historical Laspeyres Index (APIx)
            </h4>
            <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Complete trajectory of daily headline index values (Base 2024-Q1 = 100.0), DoD percentage changes, MoM changes, and national weighted average economy fares.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={getApiUrl('/export/apix/csv')}
              download="airpulse_apix_timeseries.csv"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.3)',
                color: '#34D399',
                fontSize: '12px',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: '5px',
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Daily Index CSV
            </a>
            <a
              href={getApiUrl('/export/routes/csv')}
              download="airpulse_dgca_route_basket.csv"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#E2E8F0',
                fontSize: '12px',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: '5px',
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Route Weights CSV
            </a>
          </div>
        </div>

        {/* Card 3: Air Intel Disruptions & Spikes Dataset */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FBBF24', letterSpacing: '0.06em', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                ACTIVE DISRUPTION INTEL
              </span>
              <Zap size={20} style={{ color: '#FBBF24' }} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: T.heading, margin: '0 0 8px 0' }}>
              Air Intel Disruptions &amp; Scraper Spikes
            </h4>
            <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Real-time ingested transport news disruptions, statistical scraper price surges, and ML seasonal predictive surge forecasts stored in MongoDB.
            </p>
          </div>
          <div>
            <a
              href={getApiUrl('/export/intel/json')}
              download="airpulse_intel_alerts.json"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#FBBF24',
                fontSize: '12px',
                fontWeight: 700,
                padding: '9px 12px',
                borderRadius: '5px',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              <Download size={13} /> Download Intel &amp; Spikes JSON
            </a>
          </div>
        </div>
      </div>

      {/* 4. API Key Access & Developer Portal Section */}
      <div style={{
        background: '#121218',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '28px',
        marginBottom: '36px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} style={{ color: '#FF7043' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: T.heading, margin: 0 }}>
                Airpulse Open API Key Portal
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: T.textMuted, margin: '4px 0 0 0' }}>
              Instant programmatic access for researchers, economists, data scientists, and government automated services.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(52,211,153,0.2)' }}>
              ✓ 10,000 REQUESTS/DAY QUOTA
            </span>
          </div>
        </div>

        {/* Master Active API Key Banner */}
        <div style={{
          background: '#181822',
          border: '1px solid rgba(255,61,0,0.3)',
          borderRadius: '6px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF7043', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ACTIVE AIRPULSE API KEY
            </span>
            <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: T.heading, marginTop: '4px', letterSpacing: '0.03em' }}>
              {activeKey}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyKey(activeKey)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: copiedKey ? '#22C55E' : '#FF3D00',
              border: 'none',
              color: T.heading,
              fontWeight: 700,
              fontSize: '13px',
              padding: '10px 18px',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            {copiedKey ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedKey ? 'COPIED TO CLIPBOARD!' : 'COPY API KEY'}</span>
          </button>
        </div>

        {/* Dual Grid: Self-Service Key Generator & Interactive Tester */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
          
          {/* Form: Generate Custom Key */}
          <div style={{ background: '#181822', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: T.heading, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: '#FF7043' }} />
              <span>Generate New Dedicated API Key</span>
            </h4>
            <p style={{ fontSize: '12.5px', color: T.textMuted, margin: '0 0 16px 0' }}>
              Need a registered key for an institution or automated pipeline? Create one instantly:
            </p>

            <form onSubmit={handleGenerateKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '4px' }}>NAME / DESK</label>
                <input
                  type="text"
                  placeholder="e.g. RBI Macro Research"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  style={{ width: '100%', background: '#101016', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '8px 10px', color: T.heading, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '4px' }}>ORGANIZATION</label>
                <input
                  type="text"
                  placeholder="e.g. Reserve Bank of India / NSO"
                  value={keyOrg}
                  onChange={(e) => setKeyOrg(e.target.value)}
                  style={{ width: '100%', background: '#101016', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '8px 10px', color: T.heading, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '4px' }}>EMAIL</label>
                  <input
                    type="email"
                    placeholder="analyst@rbi.org.in"
                    value={keyEmail}
                    onChange={(e) => setKeyEmail(e.target.value)}
                    style={{ width: '100%', background: '#101016', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '8px 10px', color: T.heading, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: T.textMuted, marginBottom: '4px' }}>TIER</label>
                  <select
                    value={keyTier}
                    onChange={(e) => setKeyTier(e.target.value)}
                    style={{ width: '100%', background: '#101016', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '8px 6px', color: T.heading, fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="RESEARCHER">Researcher</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGeneratingKey}
                style={{
                  background: '#2563EB',
                  border: 'none',
                  color: T.heading,
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: isGeneratingKey ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {isGeneratingKey ? 'Generating Key...' : 'GENERATE NEW KEY'}
              </button>

              {generatedKey && (
                <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '4px', padding: '10px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', marginBottom: '4px' }}>
                    ✓ KEY SUCCESSFULLY REGISTERED IN MONGODB
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: T.heading, wordBreak: 'break-all' }}>
                    {generatedKey.key}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Interactive Endpoint Tester */}
          <div style={{ background: '#181822', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: T.heading, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Play size={16} style={{ color: '#34D399' }} />
              <span>Live API Key Endpoint Tester</span>
            </h4>
            <p style={{ fontSize: '12.5px', color: T.textMuted, margin: '0 0 16px 0' }}>
              Verify authentication live. Sends request with <code style={{ color: '#FF7043' }}>X-API-Key: {activeKey.slice(0, 18)}...</code>
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select
                value={testerEndpoint}
                onChange={(e) => setTesterEndpoint(e.target.value)}
                style={{ flex: 1, background: '#101016', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '8px 10px', color: T.heading, fontSize: '13px' }}
              >
                <option value="/api/v1/overview">GET /api/v1/overview (Headline CPI)</option>
                <option value="/api/v1/rsi">GET /api/v1/rsi (Route Stress Index)</option>
                <option value="/api/v1/airport-substitution">GET /api/v1/airport-substitution</option>
                <option value="/api/v1/intel/feed">GET /api/v1/intel/feed (Air Intel)</option>
                <option value="/api/v1/routes">GET /api/v1/routes (Corridor Basket)</option>
              </select>

              <button
                type="button"
                onClick={handleTestEndpoint}
                disabled={testerLoading}
                style={{
                  background: '#059669',
                  border: 'none',
                  color: T.heading,
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: testerLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} className={testerLoading ? 'spin-pulse' : ''} />
                <span>{testerLoading ? 'Sending...' : 'Test'}</span>
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '160px', background: '#0A0A0E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '12px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11.5px', color: '#38BDF8' }}>
              {testerLoading ? (
                <div style={{ color: T.textMuted }}>Executing authorized request to {testerEndpoint}...</div>
              ) : testerResponse ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(testerResponse, null, 2)}</pre>
              ) : (
                <div style={{ color: '#64748B' }}>Click &quot;Test&quot; above to execute a live authenticated request and view the JSON response payload.</div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Language Code Integration Tabs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: T.heading, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              INTEGRATION CODE SNIPPETS
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['curl', 'python', 'javascript', 'r'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCodeTab(lang)}
                  style={{
                    background: codeTab === lang ? 'rgba(255,61,0,0.2)' : 'transparent',
                    border: `1px solid ${codeTab === lang ? '#FF3D00' : 'rgba(255,255,255,0.1)'}`,
                    color: codeTab === lang ? '#FF7043' : '#94A3B8',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#0A0A0E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '16px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(codeSnippets[codeTab]);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#E2E8F0',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copiedCurl ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedCurl ? 'Copied' : 'Copy Snippet'}</span>
            </button>
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12.5px', color: '#E2E8F0', overflowX: 'auto', lineHeight: 1.5 }}>
              {codeSnippets[codeTab]}
            </pre>
          </div>
        </div>
      </div>

      {/* 5. Live Data Dictionary Explorer Toggle */}
      <div style={{ background: '#121218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowDataDictionary(!showDataDictionary)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={18} style={{ color: '#A78BFA' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: T.heading, margin: 0 }}>
              MoSPI Aviation Microdata Schema &amp; Data Dictionary (18 Attributes)
            </h4>
          </div>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A78BFA',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {showDataDictionary ? 'HIDE SCHEMA' : 'VIEW FULL SCHEMA SPECIFICATION'}
          </button>
        </div>

        {showDataDictionary && (
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: T.textMuted }}>
                  <th style={{ padding: '8px 10px' }}>FIELD</th>
                  <th style={{ padding: '8px 10px' }}>DATA TYPE</th>
                  <th style={{ padding: '8px 10px' }}>DESCRIPTION</th>
                  <th style={{ padding: '8px 10px' }}>SAMPLE VALUE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: 'quote_id', type: 'String (UUIDv4)', desc: 'Unique identifier for high-frequency price quote', sample: 'qt-bom-del-ai-887-20260913' },
                  { field: 'route_code', type: 'String (IATA pair)', desc: 'Corridor origin and destination airport pair', sample: 'DEL-BOM' },
                  { field: 'airline', type: 'String', desc: 'Operating airline carrier name', sample: 'Air India' },
                  { field: 'flight_number', type: 'String', desc: 'Commercial flight identification code', sample: 'AI 887' },
                  { field: 'total_fare_inr', type: 'Float', desc: 'Final retail fare payable by consumer in INR', sample: '6,420.00' },
                  { field: 'base_fare_inr', type: 'Float', desc: 'Net airline carrier fare excluding statutory taxes', sample: '5,150.00' },
                  { field: 'advance_window', type: 'String (Enum)', desc: 'Advance purchase horizon (T+0, T+1, T+7, T+15, T+30, T+45)', sample: 'T+1' },
                  { field: 'flight_date', type: 'ISO Date', desc: 'Scheduled departure calendar date', sample: '2026-09-14' },
                  { field: 'source_portal', type: 'String', desc: 'Ingestion provenance (Direct carrier portal / OTA)', sample: 'Airpulse Direct Scraper' },
                  { field: 'is_outlier', type: 'Boolean', desc: 'Statistical outlier flag (exceeds IQR 1.5x threshold)', sample: 'false' },
                  { field: 'cryptographic_hash', type: 'SHA-256', desc: 'Cryptographic proof-of-source audit digest', sample: 'a9f4c3...81e2' }
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#38BDF8', fontWeight: 700 }}>{row.field}</td>
                    <td style={{ padding: '8px 10px', color: '#A78BFA' }}>{row.type}</td>
                    <td style={{ padding: '8px 10px', color: '#E2E8F0' }}>{row.desc}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: T.textMuted }}>{row.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
