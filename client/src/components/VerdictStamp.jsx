import React from 'react';

export default function VerdictStamp({ decision = 'auto_draft', confidence = 89.3 }) {
  let title = 'HUMAN REVIEW REQUIRED';
  let colorVar = '#64748b';

  if (decision === 'auto_draft') {
    title = 'AUTO DRAFT DEFENSE';
    colorVar = '#16a34a';
  } else if (decision === 'prepare_and_review') {
    title = 'PREPARE & REVIEW';
    colorVar = '#d97706';
  } else if (decision === 'do_not_contest_review') {
    title = 'DO NOT CONTEST';
    colorVar = '#dc2626';
  }

  const confVal = typeof confidence === 'number' ? confidence.toFixed(1) : '89.3';

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>
        SYSTEM DETERMINATION VERDICT
      </span>
      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1.25rem' }}>
        Official Determination Stamp
      </h2>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', backgroundColor: '#f8fafc', padding: '1.25rem 1.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
        {/* Stamp Composition */}
        <div>
          <div
            style={{
              display: 'inline-block',
              border: `2px solid ${colorVar}`,
              borderRadius: '4px',
              padding: '4px',
              transform: 'rotate(-2deg)',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                border: `1px solid ${colorVar}`,
                borderRadius: '2px',
                padding: '0.6rem 1.5rem',
                backgroundColor: '#ffffff'
              }}
            >
              <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.08em', color: colorVar, textTransform: 'uppercase' }}>
                {title}
              </span>
            </div>
          </div>
        </div>

        {/* Decision Confidence Percentage */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
            Decision Confidence Rating
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {confVal}<span style={{ fontSize: '1.5rem', color: '#ea580c' }}>%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

