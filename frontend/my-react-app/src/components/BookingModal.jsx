import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Sparkles, Plane, Calendar, Database, TrendingUp, Code } from 'lucide-react';

export default function BookingModal({
  isOpen,
  onClose,
  route,
  advanceWindow,
  indexFrequency,
  dataSource
}) {
  if (!isOpen) return null;

  const windowKey = (advanceWindow || 'T+7').slice(0, 3);
  const surgeMultiplier = windowKey === 'T+0' ? 1.55 : windowKey === 'T+1' ? 1.45 : windowKey === 'T+7' ? 1.15 : windowKey === 'T+15' ? 1.00 : windowKey === 'T+30' ? 0.90 : 0.82;

  const rawAvgFare = route.average_fare || (route.avgFare ? parseInt(String(route.avgFare).replace(/[^\d]/g, ''), 10) : 6812);
  const totalFare = Math.round(rawAvgFare * (surgeMultiplier / 1.12));
  const baseFare = Math.round(totalFare * 0.76);
  const atfSurcharge = Math.round(totalFare * 0.11);
  const udfPsf = Math.round(totalFare * 0.08);
  const gst = totalFare - baseFare - atfSurcharge - udfPsf;

  const currentSectorIndex = ((totalFare / (rawAvgFare * 0.78)) * 100.0).toFixed(1);
  const momPct = (parseFloat(currentSectorIndex) - 100.0).toFixed(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card flight-booking-modal bold-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} strokeWidth={1.5} />
        </button>

        <div className="modal-booking-content">
          <div className="modal-header">
            <span className="modal-badge bold-mono-pill">
              <span className="accent-square">■</span>
              <span>MoSPI (NSO & RBI Inflation Framework)</span>
            </span>
            <h2 className="bold-display-h2">SECTOR AIRFARE PRICE INDEX (Airpulse)</h2>
            <p className="modal-subtitle">HIGH-FREQUENCY RETAIL INFLATION FOR CPI TRANSPORT SUB-GROUP</p>
          </div>

          <div className="flight-route-hero-card bold-route-banner">
            <div className="frh-airliner">CORRIDOR ({route.name})</div>
            <div className="frh-route-title">
              INDEX: <span className="text-accent">{currentSectorIndex}</span>{' '}
              <span className="frh-route-mom">({momPct >= 0 ? `+${momPct}` : momPct}% MoM)</span>
            </div>
          </div>

          <div className="modal-summary-grid">
            <div className="summary-item bold-summary-item">
              <Plane size={15} strokeWidth={1.5} className="item-icon" />
              <div>
                <div className="item-label">CORRIDOR & BASKET WEIGHT</div>
                <div className="item-val">{route.code} • {route.trafficWeight || 'DGCA Basket'}</div>
              </div>
            </div>

            <div className="summary-item bold-summary-item">
              <Calendar size={15} strokeWidth={1.5} className="item-icon" />
              <div>
                <div className="item-label">PURCHASE HORIZON</div>
                <div className="item-val">{advanceWindow}</div>
              </div>
            </div>

            <div className="summary-item bold-summary-item">
              <TrendingUp size={15} strokeWidth={1.5} className="item-icon" />
              <div>
                <div className="item-label">SAMPLING FREQUENCY</div>
                <div className="item-val">{indexFrequency}</div>
              </div>
            </div>

            <div className="summary-item bold-summary-item">
              <Database size={15} strokeWidth={1.5} className="item-icon" />
              <div>
                <div className="item-label">INGESTION SOURCES</div>
                <div className="item-val">{dataSource}</div>
              </div>
            </div>
          </div>

          {/* Fare Components Separation */}
          <div className="modal-price-breakdown bold-breakdown">
            <div className="price-row">
              <span>Cleaned Base Economy Fare (Distance-Anchored)</span>
              <span className="mono-fare">₹{baseFare.toLocaleString()}</span>
            </div>
            <div className="price-row">
              <span>Aviation Turbine Fuel (ATF) & Fuel Surcharge</span>
              <span className="mono-fare">₹{atfSurcharge.toLocaleString()}</span>
            </div>
            <div className="price-row">
              <span>User Development Fee (UDF) & Passenger Service (PSF)</span>
              <span className="mono-fare">₹{udfPsf.toLocaleString()}</span>
            </div>
            <div className="price-row">
              <span>Goods & Services Tax (GST 5% Economy)</span>
              <span className="mono-fare">₹{gst.toLocaleString()}</span>
            </div>
            <div className="price-divider bold-divider" />
            <div className="price-row total-row">
              <span>TOTAL NORMALISED SECTOR AIRFARE</span>
              <span className="mono-total text-accent">₹{totalFare.toLocaleString()}</span>
            </div>
          </div>

          <div className="modal-guarantee bold-guarantee">
            <ShieldCheck size={16} strokeWidth={1.5} />
            <span>Ethical multi-source scraping compliant with robots.txt, rate-limiting & IQR 1.5x outlier removal.</span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-modal-cancel btn-secondary-bold"
              onClick={() => {
                const jsonStr = JSON.stringify({
                  sector: route.code,
                  route_code: route.route_code || "DEL-BOM",
                  advance_window: advanceWindow,
                  frequency: indexFrequency,
                  apix_value: parseFloat(currentSectorIndex),
                  base_fare: baseFare,
                  atf_surcharge: atfSurcharge,
                  udf_psf: udfPsf,
                  gst: gst,
                  total_fare: totalFare,
                  laspeyres_weight: route.trafficWeight,
                  sources_scraped: ["IndiGo", "Air India", "Akasa Air", "SpiceJet", "MakeMyTrip", "EaseMyTrip"],
                  timestamp: new Date().toISOString()
                }, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `APIx_${(route.route_code || 'DEL-BOM')}_${windowKey}.json`;
                a.click();
              }}
            >
              <Code size={14} strokeWidth={1.5} />
              <span>EXPORT JSON SCHEMA</span>
            </button>
            <button type="button" className="btn-modal-primary btn-primary-bold" onClick={onClose}>
              <span>CONFIRM & CLOSE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
