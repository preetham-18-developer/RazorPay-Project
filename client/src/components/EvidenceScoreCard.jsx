import React from 'react';
import { FileCheck, FileX, FileText } from 'lucide-react';

export default function EvidenceScoreCard({ evidenceScore }) {
  const score = typeof evidenceScore === 'number' ? evidenceScore : 0;
  
  let isStrong = score >= 60.0;
  let isWeak = score < 40.0;

  let color = 'var(--status-info)';
  let badgeText = 'MODERATE EVIDENCE';
  let badgeClass = 'info';

  if (isStrong) {
    color = 'var(--status-success)';
    badgeText = 'STRONG EVIDENCE';
    badgeClass = 'success';
  } else if (isWeak) {
    color = 'var(--status-danger)';
    badgeText = 'WEAK EVIDENCE';
    badgeClass = 'danger';
  }

  return (
    <div className="card animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Evidence Evaluator
          </span>
          <span className={`status-pill ${badgeClass}`}>
            {isStrong ? <FileCheck size={12} /> : (isWeak ? <FileX size={12} /> : <FileText size={12} />)}
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
        Strength of the available evidence for defending this specific dispute.
      </p>
    </div>
  );
}
