import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RiskScoreCard({ riskScore }) {
  const score = typeof riskScore === 'number' ? riskScore : 0;
  const isHighRisk = score >= 40.0;

  const color = isHighRisk ? 'var(--status-danger)' : 'var(--status-success)';
  const badgeText = isHighRisk ? 'HIGH FRAUD RISK' : 'LOW FRAUD RISK';
  const badgeClass = isHighRisk ? 'danger' : 'success';

  return (
    <div className="card animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Fraud Risk Classifier
          </span>
          <span className={`status-pill ${badgeClass}`}>
            {isHighRisk ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
            {badgeText}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 700, color: color }}>
            {score.toFixed(1)}
          </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
        </div>

        {/* Meter Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden', margin: '0.75rem 0' }}>
          <div style={{ height: '100%', width: `${Math.min(100, score)}%`, backgroundColor: color, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.75rem' }}>
        Likelihood that this dispute shows fraud-related behavioral signals.
      </p>
    </div>
  );
}
