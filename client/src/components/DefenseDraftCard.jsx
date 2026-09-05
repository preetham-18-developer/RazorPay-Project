import React, { useState } from 'react';
import { FileText, CheckCircle, Edit3, AlertCircle, Send, XCircle, MessageSquare } from 'lucide-react';

export default function DefenseDraftCard({ draft, reviewState, onApprove, onReject, onRequestChanges, isSubmitting }) {
  if (!draft) return null;

  const [responseBody, setResponseBody] = useState(draft.response_body || '');
  const [feedbackText, setFeedbackText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const isEdited = draft.response_body && responseBody.trim() !== draft.response_body.trim();
  const isApproved = reviewState && reviewState.status === 'approved';
  const isRejected = reviewState && reviewState.status === 'rejected';

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

  return (
    <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="var(--accent-purple)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {draft.title || 'Generated Defense Response Packet'}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`status-pill ${isEdited ? 'warning' : 'info'}`} style={{ fontSize: '0.7rem' }}>
            <Edit3 size={10} /> {isEdited ? 'HUMAN EDITED' : 'AI GENERATED DRAFT'}
          </span>
          {draft.validation && draft.validation.valid && (
            <span className="status-pill success" style={{ fontSize: '0.7rem' }}>
              <CheckCircle size={10} /> GROUNDING VALIDATED
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {draft.summary && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', backgroundColor: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <strong>Executive Summary:</strong> {draft.summary}
        </p>
      )}

      {/* Editable Response Body Textarea */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Official Dispute Response Body (Editable Statement)
          </label>
          {isEdited && (
            <button
              onClick={() => setResponseBody(draft.response_body)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset to original AI draft
            </button>
          )}
        </div>

        <textarea
          rows={10}
          value={responseBody}
          onChange={(e) => setResponseBody(e.target.value)}
          disabled={isApproved || isSubmitting}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${isEdited ? 'var(--status-warning)' : 'var(--border-subtle)'}`,
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Supporting Evidence Items */}
      {Array.isArray(draft.supporting_evidence) && draft.supporting_evidence.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Attached Evidentiary Document References
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {draft.supporting_evidence.map((ev, i) => (
              <span key={i} className="mono" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--status-success)' }}>
                ✓ {ev.type}: {ev.doc_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Review Action Controls */}
      {!isApproved && !isRejected && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status: <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{reviewState ? reviewState.status.replace(/_/g, ' ') : 'Pending Review'}</strong>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowRejectModal(!showRejectModal)}
              className="btn-secondary"
              style={{ color: 'var(--status-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              disabled={isSubmitting}
            >
              <XCircle size={14} /> Reject Dispute
            </button>

            <button
              onClick={() => setShowFeedbackModal(!showFeedbackModal)}
              className="btn-secondary"
              style={{ color: 'var(--status-warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              disabled={isSubmitting}
            >
              <MessageSquare size={14} /> Request Changes
            </button>

            <button
              onClick={handleApprove}
              className="btn-primary"
              disabled={isSubmitting}
            >
              <Send size={14} /> Approve & Prepare Submission
            </button>
          </div>
        </div>
      )}

      {/* Modal / Panel for Request Changes */}
      {showFeedbackModal && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--status-warning)' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--status-warning)', marginBottom: '0.5rem' }}>Request Changes Feedback</h4>
          <input
            type="text"
            placeholder="Enter feedback for risk officer or AI generator..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowFeedbackModal(false)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Cancel</button>
            <button onClick={handleSendFeedback} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--status-warning)' }}>Submit Feedback</button>
          </div>
        </div>
      )}

      {/* Modal / Panel for Reject */}
      {showRejectModal && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--status-danger)' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--status-danger)', marginBottom: '0.5rem' }}>Reject Dispute Reason</h4>
          <input
            type="text"
            placeholder="Enter reason for rejecting defense..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Cancel</button>
            <button onClick={handleSendReject} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--status-danger)' }}>Confirm Rejection</button>
          </div>
        </div>
      )}
    </div>
  );
}
