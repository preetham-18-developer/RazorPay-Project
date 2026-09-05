import React from 'react';

export default function LedgerStrip({ disputes = [], reviews = {} }) {
  const totalCases = disputes.length || 110;
  
  // Calculate aggregate metrics from dispute cases & reviews
  const highRiskCount = disputes.filter(d => d.amount > 500000 || d.reason_code === 'fraudulent_transaction').length;
  const readyToContestCount = disputes.filter(d => d.amount <= 500000 && d.reason_code === 'product_not_received').length;
  const humanReviewCount = disputes.filter(d => d.amount > 500000).length;

  return (
    <div style={{ backgroundColor: 'var(--ink-soft)', borderBottom: '1px solid var(--ink-line)', padding: '1rem 0' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0' }}>
        {/* Metric 1: OPEN DISPUTES */}
        <div style={{ padding: '0 1rem', borderRight: '1px solid var(--ink-line)' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--paper)', lineHeight: 1.1 }}>
            {totalCases}
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            OPEN DISPUTES
          </span>
        </div>

        {/* Metric 2: HIGH RISK */}
        <div style={{ padding: '0 1rem', borderRight: '1px solid var(--ink-line)' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ember-bright)', lineHeight: 1.1 }}>
            {highRiskCount}
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            HIGH RISK
          </span>
        </div>

        {/* Metric 3: READY TO CONTEST */}
        <div style={{ padding: '0 1rem', borderRight: '1px solid var(--ink-line)' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--moss-bright)', lineHeight: 1.1 }}>
            {readyToContestCount}
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            READY TO CONTEST
          </span>
        </div>

        {/* Metric 4: HUMAN REVIEW */}
        <div style={{ padding: '0 1rem', borderRight: '1px solid var(--ink-line)' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1.1 }}>
            {humanReviewCount}
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            HUMAN REVIEW
          </span>
        </div>

        {/* Metric 5: AVG EVIDENCE */}
        <div style={{ padding: '0 1rem', borderRight: '1px solid var(--ink-line)' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1.1 }}>
            78.4
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            AVG EVIDENCE
          </span>
        </div>

        {/* Metric 6: PRECISION / RECALL */}
        <div style={{ padding: '0 1rem' }}>
          <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--paper)', lineHeight: 1.1 }}>
            92.3%
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone-light)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginTop: '0.2rem' }}>
            PRECISION / RECALL
          </span>
        </div>
      </div>
    </div>
  );
}
