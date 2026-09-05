import React from 'react';
import MiniQuadrant from './MiniQuadrant';

export default function CaseRow({ dispute, reviewStatus = 'pending_review', isSelected, onClick }) {
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
      onClick={onClick}
      style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--ink-line)',
        backgroundColor: isSelected ? 'rgba(246, 241, 231, 0.04)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--gold-bright)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
      }}
    >
      {/* Top Row: ID + Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span className="row-id">
          #{dispute.id}
        </span>
        <span className="mono" style={{ fontSize: '0.875rem', color: 'var(--paper)', fontWeight: 500 }}>
          {amountRupees}
        </span>
      </div>

      {/* Case Reason Line */}
      <h2 className="reason-title" style={{ fontSize: '1.45rem', margin: '0.25rem 0 0.6rem 0', textTransform: 'capitalize' }}>
        {dispute.reason_code ? dispute.reason_code.replace(/_/g, ' ') : 'Dispute Claim'}
      </h2>

      {/* Bottom Row: Decision Tag & Review Status Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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

        <span className="lbl">
          DUE {respondByStr}
        </span>
      </div>
    </div>
  );
}
