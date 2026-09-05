import React from 'react';

export default function ActionRecordCard({ reviewState }) {
  if (!reviewState || reviewState.status !== 'approved') return null;

  const { reviewer, origin, updated_at } = reviewState;

  const timestamp = updated_at
    ? new Date(updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()
    : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();

  const actionId = `act_SYN${Math.floor(100000 + Math.random() * 900000)}`;
  const provenanceLabel = origin === 'human_edited' ? 'HUMAN EDITED' : 'DISPUTESHIELD GENERATED';

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      {/* Section Title */}
      <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#16a34a' }}>
        OFFICIAL DEFENSE ACTION RECORD
      </span>

      <h2 className="section-title" style={{ color: '#0f172a', fontSize: '1.35rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#16a34a' }}>✓</span>
        <span>Defense Response Authorized</span>
      </h2>

      {/* State Explanation */}
      <div style={{ marginBottom: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px' }}>
        <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '0.35rem' }}>
          SIMULATED ACTION
        </span>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>
          The defense packet was approved and authorized by the risk officer.<br />
          Recorded into DisputeShield operational audit ledger.
        </p>
      </div>

      {/* 2-Column Metadata Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
            ACTION ID
          </span>
          <span className="mono" style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
            {actionId}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
            APPROVED BY
          </span>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
            {reviewer || 'demo-user'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
            PROVENANCE
          </span>
          <span className="mono" style={{ fontSize: '0.75rem', color: origin === 'human_edited' ? '#ea580c' : '#0284c7', fontWeight: 700 }}>
            {provenanceLabel}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
            RECORDED
          </span>
          <span className="mono" style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}

