import React from 'react';

export default function ModelVsPolicyCard({ gateTriggered, amount = 0, initialDecision = 'auto_draft', finalDecision = 'prepare_and_review' }) {
  const amountRupees = (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span className="lbl" style={{ color: '#ea580c' }}>
          BOUNDED AUTONOMY SAFETY SYSTEM
        </span>
        <span className="badge-policy-gate" style={{ backgroundColor: gateTriggered ? '#fffbeb' : '#f0fdf4', border: `1px solid ${gateTriggered ? '#fde68a' : '#bbf7d0'}`, color: gateTriggered ? '#b45309' : '#15803d' }}>
          {gateTriggered ? '⚡ AUTONOMY LIMIT REACHED (>₹5,000)' : '✓ POLICY GATE PASSED'}
        </span>
      </div>

      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1rem' }}>
        Model vs. Policy Safety Gate Audit
      </h2>

      {gateTriggered && (
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <span style={{ fontSize: '0.9rem', color: '#9a3412', fontWeight: 700, display: 'block' }}>
                High-Value Financial Protection Policy Enforced
              </span>
              <span style={{ fontSize: '0.85rem', color: '#c2410c' }}>
                Dispute amount <strong>{amountRupees}</strong> exceeds the <strong>₹5,000.00</strong> threshold. Autonomous auto-submission is blocked.
              </span>
            </div>
          </div>
          <span style={{ backgroundColor: '#ea580c', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '6px', letterSpacing: '0.04em' }}>
            HUMAN REVIEW MANDATED
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
        {/* Stage 1 Column */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1.25rem' }}>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#64748b' }}>
            STAGE 1 · ML MODEL RECOMMENDATION
          </span>
          <span className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#16a34a', display: 'block' }}>
            ✓ AUTO DRAFT QUALIFIED
          </span>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.35rem', margin: 0 }}>
            Classifier evaluated low behavioral risk combined with verified evidentiary proof strength.
          </p>
        </div>

        {/* Stage 2 Column */}
        <div>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#64748b' }}>
            STAGE 2 · DETERMINISTIC POLICY CHECK
          </span>
          <span className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: gateTriggered ? '#d97706' : '#16a34a', display: 'block' }}>
            {gateTriggered ? '⚡ HUMAN REVIEW MANDATED' : '✓ AUTONOMOUS SUBMISSION PERMITTED'}
          </span>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.35rem', margin: 0 }}>
            {gateTriggered
              ? `Dispute amount ${amountRupees} exceeds ₹5,000 threshold limit. Mandatory policy gate escalated decision to human officer.`
              : `Dispute amount ${amountRupees} is within ₹5,000 threshold limit.`}
          </p>
        </div>
      </div>
    </div>
  );
}

