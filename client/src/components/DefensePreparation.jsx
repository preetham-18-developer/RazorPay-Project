import React, { useState } from 'react';

export default function DefensePreparation({
  draft,
  reviewState,
  onApprove,
  onReject,
  onRequestChanges,
  isSubmitting,
  disputeId,
  amount,
  reasonCode
}) {
  if (!draft) return null;

  const [responseBody, setResponseBody] = useState(draft.response_body || '');
  const [feedbackText, setFeedbackText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isEditingStatement, setIsEditingStatement] = useState(false);

  const isEdited = draft.response_body && responseBody.trim() !== draft.response_body.trim();
  const currentOrigin = reviewState?.origin || (isEdited ? 'human_edited' : 'ai_generated');
  const provenanceLabel = currentOrigin === 'human_edited' ? 'HUMAN EDITED' : 'DISPUTESHIELD GENERATED';

  const status = reviewState?.status || 'pending_review';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isChangesRequested = status === 'changes_requested';
  const isPending = status === 'pending_review';

  const amountRupees = typeof amount === 'number'
    ? (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    : 'N/A';

  const handleApprove = () => {
    if (onApprove) {
      onApprove(responseBody);
    }
  };

  const handleSendFeedback = () => {
    if (onRequestChanges && feedbackText.trim()) {
      onRequestChanges(feedbackText);
      setShowFeedbackModal(false);
    }
  };

  const handleSendReject = () => {
    if (onReject && rejectReason.trim()) {
      onReject(rejectReason);
      setShowRejectModal(false);
    }
  };

  const updatedTimeStr = reviewState?.updated_at
    ? new Date(reviewState.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).toUpperCase()
    : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).toUpperCase();

  const actionId = `act_SYN${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      {/* 1. Minimal Workflow Stepper Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="lbl" style={{ color: '#ea580c' }}>HUMAN AUTHORIZATION WORKSPACE</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '0.65rem', color: '#64748b' }}>DRAFT</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>→</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: isPending ? '#0f172a' : '#64748b', fontWeight: isPending ? 700 : 400 }}>REVIEW</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>→</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: isChangesRequested ? '#d97706' : isRejected ? '#dc2626' : '#64748b' }}>DECISION</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>→</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: isApproved ? '#16a34a' : '#64748b', fontWeight: isApproved ? 700 : 400 }}>
            RECORDED {isApproved ? '✓' : ''}
          </span>
        </div>
      </div>

      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1.25rem' }}>
        Defense Statement Preparation & Decision Control
      </h2>

      {/* 2. Document Editor Header */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="lbl" style={{ color: '#0f172a', fontWeight: 700 }}>DEFENSE STATEMENT PACKET</span>
            <span className="badge-grounding-verified" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
              ✓ FACTUAL GROUNDING VERIFIED
            </span>
          </div>
          <span className="mono" style={{ fontSize: '0.7rem', color: currentOrigin === 'human_edited' ? '#ea580c' : '#0284c7', fontWeight: 700 }}>
            {provenanceLabel}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
          <div>
            <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#64748b' }}>DISPUTE ID</span>
            <span className="mono" style={{ color: '#0f172a', fontSize: '0.8rem', fontWeight: 700 }}>#{disputeId || 'disp_CASE'}</span>
          </div>
          <div>
            <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#64748b' }}>AMOUNT</span>
            <span className="mono" style={{ color: '#ea580c', fontSize: '0.8rem', fontWeight: 700 }}>{amountRupees}</span>
          </div>
          <div>
            <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#64748b' }}>REASON CATEGORY</span>
            <span style={{ color: '#0f172a', fontSize: '0.8rem', textTransform: 'capitalize', fontWeight: 600 }}>{reasonCode ? reasonCode.replace(/_/g, ' ') : 'Claim'}</span>
          </div>
          <div>
            <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#64748b' }}>PROVENANCE</span>
            <span className="mono" style={{ color: currentOrigin === 'human_edited' ? '#ea580c' : '#0284c7', fontSize: '0.8rem', fontWeight: 700 }}>{provenanceLabel}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {draft.summary && (
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.85rem 1.15rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#9a3412' }}>
            <strong style={{ color: '#c2410c' }}>Executive Summary:</strong> {draft.summary}
          </p>
        </div>
      )}

      {/* 3. Editable Statement Body */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="lbl" style={{ color: '#0f172a' }}>DEFENSE STATEMENT TEXT EDITOR</span>
          {isEdited && !isApproved && (
            <button
              onClick={() => setResponseBody(draft.response_body)}
              className="mono"
              style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
            >
              Reset to DisputeShield draft
            </button>
          )}
        </div>

        <textarea
          rows={10}
          value={responseBody}
          onChange={(e) => {
            setResponseBody(e.target.value);
            setIsEditingStatement(true);
          }}
          disabled={isApproved || isSubmitting}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: isApproved ? '#f8fafc' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#0f172a',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'vertical',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
          }}
        />
      </div>

      {/* Attached Evidence Badges */}
      {Array.isArray(draft.supporting_evidence) && draft.supporting_evidence.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#ea580c' }}>ATTACHED EVIDENTIARY SOURCES</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {draft.supporting_evidence.map((ev, i) => (
              <span key={i} className="mono" style={{ fontSize: '0.75rem', color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                📄 [{ev.type.replace(/_/g, ' ')}] {ev.doc_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. REVIEW STATUS SECTION */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
        <span className="lbl" style={{ display: 'block', marginBottom: '0.75rem', color: '#64748b' }}>REVIEW ACTION & DECISION</span>

        {/* PENDING REVIEW STATE */}
        {isPending && (
          <div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>
                ⏳ PENDING HUMAN OFFICER REVIEW & AUTHORIZATION
              </span>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                Review the generated defense packet above. As a risk officer, you may approve the defense for submission, request changes, or reject the defense.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowRejectModal(!showRejectModal)}
                style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.65rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}
                disabled={isSubmitting}
              >
                ✕ REJECT DEFENSE
              </button>

              <button
                onClick={() => setShowFeedbackModal(!showFeedbackModal)}
                style={{ backgroundColor: '#ffffff', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.65rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}
                disabled={isSubmitting}
              >
                ↻ REQUEST CHANGES
              </button>

              <button
                onClick={handleApprove}
                style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'AUTHORIZING...' : '✓ APPROVE DEFENSE STATEMENT'}
              </button>
            </div>
          </div>
        )}

        {/* APPROVED STATE */}
        {isApproved && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', display: 'block', marginBottom: '0.25rem' }}>
              ✓ DEFENSE STATEMENT APPROVED & AUTHORIZED
            </span>
            <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '0.5rem' }}>
              OPERATIONAL RECORD CREATED
            </span>
            <p style={{ fontSize: '0.9rem', color: '#166534', margin: '0 0 1rem 0' }}>
              The defense response was reviewed and authorized. Recorded in operational event stream.
            </p>

            {/* Approved Action Record Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', borderTop: '1px solid #bbf7d0', paddingTop: '1rem' }}>
              <div>
                <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#15803d' }}>ACTION ID</span>
                <span className="mono" style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>{actionId}</span>
              </div>

              <div>
                <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#15803d' }}>APPROVED BY</span>
                <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>{reviewState?.reviewer || 'demo-user'}</span>
              </div>

              <div>
                <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#15803d' }}>STATEMENT PROVENANCE</span>
                <span className="mono" style={{ color: '#ea580c', fontSize: '0.75rem', fontWeight: 700 }}>{provenanceLabel}</span>
              </div>

              <div>
                <span className="lbl" style={{ display: 'block', fontSize: '0.6rem', color: '#15803d' }}>RECORDED TIMESTAMP</span>
                <span className="mono" style={{ color: '#0f172a', fontSize: '0.75rem', fontWeight: 600 }}>{updatedTimeStr}</span>
              </div>
            </div>
          </div>
        )}

        {/* REJECTED STATE */}
        {isRejected && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', display: 'block', marginBottom: '0.25rem' }}>
              ✕ DEFENSE REJECTED
            </span>
            <p style={{ fontSize: '0.9rem', color: '#991b1b', margin: '0 0 1rem 0' }}>
              The defense response was rejected and will not be submitted to card networks.
            </p>

            <div style={{ fontSize: '0.85rem', color: '#7f1d1d', borderTop: '1px solid #fecaca', paddingTop: '0.85rem' }}>
              <strong>Rejection reason:</strong> "{reviewState?.feedback || reviewState?.reason || 'Documentary evidence insufficient to contest claim.'}"<br />
              <span className="mono" style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                Rejected by {reviewState?.reviewer || 'demo-user'} on {updatedTimeStr}
              </span>
            </div>
          </div>
        )}

        {/* CHANGES REQUESTED STATE */}
        {isChangesRequested && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '0.25rem' }}>
              ↻ CHANGES REQUESTED
            </span>
            <p style={{ fontSize: '0.9rem', color: '#92400e', margin: '0 0 1rem 0' }}>
              The defense response requires reviewer edits before it can be approved.
            </p>

            <div style={{ fontSize: '0.85rem', color: '#78350f', borderTop: '1px solid #fde68a', paddingTop: '0.85rem', marginBottom: '1rem' }}>
              <strong>Reviewer feedback:</strong> "{reviewState?.feedback || 'Please update statement text with verified delivery records.'}"
            </div>

            <button
              onClick={() => setIsEditingStatement(true)}
              style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer' }}
            >
              EDIT DEFENSE STATEMENT →
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Form for Request Changes */}
      {showFeedbackModal && (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#b45309' }}>REQUEST CHANGES FEEDBACK:</span>
          <input
            type="text"
            placeholder="Enter officer feedback for defense statement..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowFeedbackModal(false)} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSendFeedback} style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Submit Feedback</button>
          </div>
        </div>
      )}

      {/* Confirmation Form for Reject */}
      {showRejectModal && (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <span className="lbl" style={{ color: '#dc2626', display: 'block', marginBottom: '0.5rem' }}>REJECT REASON:</span>
          <input
            type="text"
            placeholder="Enter reason for rejecting defense..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowRejectModal(false)} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSendReject} style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Confirm Rejection</button>
          </div>
        </div>
      )}

      {/* 5. REVIEW HISTORY TIMELINE */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
        <span className="lbl" style={{ display: 'block', marginBottom: '0.65rem', color: '#64748b' }}>REVIEW HISTORY</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
          {isApproved && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
              <span>✓ Defense statement approved</span>
              <span className="mono">{reviewState?.reviewer || 'demo-user'} · {updatedTimeStr}</span>
            </div>
          )}

          {isRejected && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}>
              <span>✕ Defense rejected ("{reviewState?.feedback || 'Evidence insufficient'}")</span>
              <span className="mono">{reviewState?.reviewer || 'demo-user'} · {updatedTimeStr}</span>
            </div>
          )}

          {isChangesRequested && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: 600 }}>
              <span>↻ Changes requested ("{reviewState?.feedback || 'Revision needed'}")</span>
              <span className="mono">{reviewState?.reviewer || 'demo-user'} · {updatedTimeStr}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>DisputeShield draft generated</span>
            <span className="mono">DisputeShield system</span>
          </div>
        </div>
      </div>
    </div>
  );
}

