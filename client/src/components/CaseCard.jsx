import React from 'react';
import { useNavigate } from 'react-router-dom';
import MiniQuadrant from './MiniQuadrant';

export default function CaseCard({ dispute, reviewStatus = 'pending_review' }) {
  const navigate = useNavigate();

  if (!dispute) return null;

  const amountRupees = (dispute.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const respondByStr = dispute.respond_by
    ? new Date(dispute.respond_by * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : 'N/A';

  const isHighValue = dispute.amount > 500000;

  let decisionText = 'Review';
  let decisionClass = 'review';

  if (dispute.reason_code === 'product_not_received') {
    if (isHighValue) {
      decisionText = 'Prepare & Review';
      decisionClass = 'prepare_and_review';
    } else {
      decisionText = 'Auto Draft';
      decisionClass = 'auto_draft';
    }
  } else if (dispute.reason_code === 'fraudulent_transaction') {
    decisionText = 'Do Not Contest';
    decisionClass = 'do_not_contest_review';
  }

  const riskVal = isHighValue ? 15 : (dispute.reason_code === 'fraudulent_transaction' ? 75 : 25);
  const evidenceVal = (dispute.reason_code === 'product_not_received') ? 85 : 30;

  let reviewLabel = 'PENDING REVIEW';
  let reviewColor = 'var(--stone-light)';

  if (reviewStatus === 'approved') {
    reviewLabel = 'APPROVED ✓';
    reviewColor = 'var(--moss-bright)';
  } else if (reviewStatus === 'changes_requested') {
    reviewLabel = 'CHANGES REQUESTED ↻';
    reviewColor = 'var(--gold)';
  } else if (reviewStatus === 'rejected') {
    reviewLabel = 'REJECTED ✕';
    reviewColor = 'var(--ember-bright)';
  }

  return (
    <div
      style={{
        padding: '1.25rem',
        backgroundColor: 'var(--ink-soft)',
        border: '1px solid var(--ink-line)',
        borderRadius: '2px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        gap: '1rem',
        transition: 'border-color 0.15s ease'
      }}
    >
      <div>
        {/* Top Header: ID + Amount + Policy Gate Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="row-id">
              #{dispute.id}
            </span>
            {isHighValue && (
              <span className="badge-policy-gate">
                &gt;₹5K GATE
              </span>
            )}
          </div>
          <span className="mono" style={{ fontSize: '1rem', color: 'var(--paper)', fontWeight: 600 }}>
            {amountRupees}
          </span>
        </div>

        {/* Reason Title: Fraunces 24-26px */}
        <h2 className="reason-title" style={{ fontSize: '1.35rem', margin: '0.25rem 0 0.5rem 0', textTransform: 'capitalize' }}>
          {dispute.reason_code ? dispute.reason_code.replace(/_/g, ' ') : 'Dispute Claim'}
        </h2>

        {/* Description snippet */}
        <p style={{ fontSize: '0.8rem', color: 'var(--stone-light)', lineHeight: 1.4 }}>
          {dispute.reason_description}
        </p>
      </div>

      {/* Decision Tag & Review Status Tag */}
      <div style={{ borderTop: '1px solid var(--ink-line)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <MiniQuadrant riskScore={riskVal} evidenceScore={evidenceVal} decision={decisionClass} />
          <div>
            <span className={`decision-tag ${decisionClass}`} style={{ display: 'block', fontSize: '0.65rem' }}>
              {decisionText}
            </span>
            <span className="mono" style={{ fontSize: '0.6rem', color: reviewColor, fontWeight: 500 }}>
              {reviewLabel}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/disputes/${dispute.id}/investigate`)}
          className="btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
        >
          INVESTIGATE CASE →
        </button>
      </div>
    </div>
  );
}
