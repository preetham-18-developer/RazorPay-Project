import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

export default function ReviewStatusBanner({ reviewState }) {
  if (!reviewState || !reviewState.status || reviewState.status === 'pending_review') {
    return null;
  }

  const { status, reviewer, feedback, origin, updated_at } = reviewState;
  const timestamp = updated_at ? new Date(updated_at).toLocaleString() : 'Recent';

  let bannerClass = 'info';
  let icon = <Clock size={20} color="var(--status-info)" />;
  let title = 'Review Status: Pending';
  let details = 'Human review is required before final action.';

  if (status === 'approved') {
    bannerClass = 'success';
    icon = <CheckCircle2 size={22} color="var(--status-success)" />;
    title = 'DISPUTE DEFENSE APPROVED & READY FOR SUBMISSION';
    details = `Approved by ${reviewer || 'Risk Officer'} on ${timestamp}. Defense packet authorized and saved to simulated submission ledger. Origin: ${origin === 'human_edited' ? 'Human Edited' : 'AI Generated'}.`;
  } else if (status === 'rejected') {
    bannerClass = 'danger';
    icon = <XCircle size={22} color="var(--status-danger)" />;
    title = 'DISPUTE CONTEST REJECTED';
    details = `Rejected by ${reviewer || 'Risk Officer'} on ${timestamp}. Reason: ${feedback || 'Insufficient evidence to contest'}.`;
  } else if (status === 'changes_requested') {
    bannerClass = 'warning';
    icon = <AlertCircle size={22} color="var(--status-warning)" />;
    title = 'CHANGES REQUESTED BY REVIEWER';
    details = `Feedback from ${reviewer || 'Risk Officer'}: "${feedback || 'Please update response packet'}".`;
  }

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '1rem 1.25rem',
        borderLeft: `4px solid var(--status-${bannerClass})`,
        backgroundColor: `rgba(var(--status-${bannerClass}), 0.08)`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}
    >
      <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)' }}>
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
          {details}
        </p>
      </div>
    </div>
  );
}
