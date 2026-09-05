import React from 'react';
import { ShieldCheck, ShieldAlert, FileText, AlertOctagon } from 'lucide-react';

export default function DecisionCard({ decision, confidence, reasoningSummary, modelVersion }) {
  if (!decision) return null;

  let config = {
    title: 'HUMAN REVIEW REQUIRED',
    subtitle: 'Ambiguous risk and evidence signals. Manual investigation recommended.',
    colorClass: 'warning',
    borderColor: 'var(--status-warning)',
    bgGlow: 'var(--shadow-glow-amber)',
    icon: <AlertOctagon size={32} color="var(--status-warning)" />
  };

  if (decision === 'auto_draft') {
    config = {
      title: 'AUTO DRAFT DEFENSE',
      subtitle: 'Qualified for automated defense packet generation.',
      colorClass: 'success',
      borderColor: 'var(--status-success)',
      bgGlow: '0 0 25px rgba(16, 185, 129, 0.2)',
      icon: <ShieldCheck size={32} color="var(--status-success)" />
    };
  } else if (decision === 'prepare_and_review') {
    config = {
      title: 'PREPARE & REVIEW',
      subtitle: 'Defense packet prepared. Escalated for risk officer authorization.',
      colorClass: 'info',
      borderColor: 'var(--status-info)',
      bgGlow: '0 0 25px rgba(59, 130, 246, 0.2)',
      icon: <FileText size={32} color="var(--status-info)" />
    };
  } else if (decision === 'do_not_contest_review') {
    config = {
      title: 'DO NOT CONTEST (RECOMMENDED)',
      subtitle: 'Insufficient evidence to contest. High chargeback loss probability.',
      colorClass: 'danger',
      borderColor: 'var(--status-danger)',
      bgGlow: '0 0 25px rgba(239, 68, 68, 0.2)',
      icon: <ShieldAlert size={32} color="var(--status-danger)" />
    };
  }

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        boxShadow: config.bgGlow,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)' }}>
            {config.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="mono" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                System Recommendation
              </span>
              <span className="mono" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Model: {modelVersion || 'v3'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {config.title}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {config.subtitle}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: '110px' }}>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {confidence ? `${confidence}%` : '85%'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Decision Confidence
          </span>
        </div>
      </div>

      {reasoningSummary && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Why this decision?</strong> {reasoningSummary}
        </div>
      )}
    </div>
  );
}
