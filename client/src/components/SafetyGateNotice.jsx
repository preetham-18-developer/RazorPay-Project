import React from 'react';
import { AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SafetyGateNotice({ gateTriggered, amount, initialDecision = 'auto_draft' }) {
  const amountRupees = amount
    ? (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    : '₹5,000+';

  if (!gateTriggered) {
    return (
      <div
        className="card animate-fade-in"
        style={{
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--status-success)' }}>
          <CheckCircle2 size={16} />
          <span><strong>Deterministic Policy Gate:</strong> Passed without override. Transaction amount within autonomous threshold.</span>
        </div>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Limit: ₹5,000
        </span>
      </div>
    );
  }

  return (
    <div
      className="card animate-fade-in"
      style={{
        borderLeft: '4px solid var(--status-warning)',
        boxShadow: 'var(--shadow-glow-amber)',
        backgroundColor: 'rgba(245, 158, 11, 0.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--status-warning-bg)' }}>
          <AlertOctagon size={28} color="var(--status-warning)" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--status-warning)' }}>
              AUTONOMY LIMIT REACHED
            </span>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Policy Safety Threshold Triggered ({amountRupees} &gt; ₹5,000)
          </h3>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
            This dispute exceeded the deterministic <strong>₹5,000 autonomous-action threshold</strong>. The decision engine automatically escalated the recommendation to mandatory human risk officer authorization.
          </p>

          <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-bright)' }}>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Initial Model Output</span>
              <strong style={{ color: 'var(--status-success)', textTransform: 'uppercase' }}>AUTO DRAFT</strong>
            </div>

            <ArrowRight size={16} color="var(--status-warning)" />

            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Deterministic Policy Override</span>
              <strong style={{ color: 'var(--status-warning)', textTransform: 'uppercase' }}>PREPARE & REVIEW</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
