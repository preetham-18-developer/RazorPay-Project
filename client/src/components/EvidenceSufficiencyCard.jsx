import React from 'react';

export default function EvidenceSufficiencyCard({ sufficiency, conflicts, claimGrounding }) {
  if (!sufficiency) return null;

  const {
    claim_title = 'Dispute Claim',
    sufficiency_level = 'MODERATE',
    sufficiency_score = 50,
    available_required = [],
    missing_required = [],
    gaps = []
  } = sufficiency;

  const hasConflicts = conflicts && conflicts.has_conflicts;
  const conflictList = (conflicts && conflicts.conflicts) || [];

  let levelColor = '#d97706';
  let levelBg = '#fffbeb';
  if (sufficiency_level === 'HIGH') {
    levelColor = '#16a34a';
    levelBg = '#f0fdf4';
  } else if (sufficiency_level === 'LOW' || sufficiency_level === 'INSUFFICIENT') {
    levelColor = '#dc2626';
    levelBg = '#fef2f2';
  }

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span className="lbl" style={{ color: '#ea580c' }}>CLAIM-AWARE FORENSIC EVALUATION</span>
        <span className="mono" style={{ fontSize: '0.75rem', color: levelColor, backgroundColor: levelBg, padding: '0.2rem 0.6rem', borderRadius: '4px', border: `1px solid ${levelColor}40`, fontWeight: 700 }}>
          {sufficiency_level} SUFFICIENCY ({sufficiency_score}/100)
        </span>
      </div>

      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1rem' }}>
        Evidence Sufficiency & Deterministic Conflict Audit
      </h2>

      {/* Conflict Alert Banner if any conflicts exist */}
      {hasConflicts && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🚨</span>
            <span className="mono" style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>
              EVIDENCE CONFLICT DETECTED ({conflictList.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {conflictList.map((c, idx) => (
              <p key={idx} style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0, fontWeight: 500 }}>
                <strong>{c.title}:</strong> {c.description}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Sufficiency Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '1.25rem', borderRadius: '8px' }}>
        <div>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#16a34a' }}>
            VERIFIED EVIDENCE ({available_required.length})
          </span>
          {available_required.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {available_required.map((doc, i) => (
                <span key={i} style={{ fontSize: '0.85rem', color: '#0f172a', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
                  ✓ {doc.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No required proof present.</span>
          )}
        </div>

        <div>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#dc2626' }}>
            EVIDENCE GAPS ({missing_required.length})
          </span>
          {missing_required.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {missing_required.map((doc, i) => (
                <span key={i} style={{ fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fff2f2', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
                  ⚠ {doc.replace(/_/g, ' ').toUpperCase()} MISSING
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>Zero missing required evidence types.</span>
          )}
        </div>

        {claimGrounding && (
          <div>
            <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#ea580c' }}>
              CLAIM GROUNDING ({claimGrounding.grounded_claims_count}/{claimGrounding.total_claims})
            </span>
            <span className="mono" style={{ fontSize: '0.9rem', color: claimGrounding.fully_grounded ? '#16a34a' : '#d97706', fontWeight: 700 }}>
              {(claimGrounding.grounding_ratio * 100).toFixed(0)}% GROUNDED
            </span>
            <p style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.35rem', margin: 0 }}>
              {claimGrounding.fully_grounded ? 'All defense claims map directly to verified operational facts.' : 'Some defense claims lack attached document proof.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

