import React from 'react';

export default function FindingsPanel({ investigation }) {
  if (!investigation) return null;

  const { what_found = [], missing = [], unusual = [], summary = '' } = investigation;

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>
        FORENSIC ANALYSIS SUMMARY
      </span>
      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1rem' }}>
        Natural Language Investigation Findings
      </h2>

      {summary && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {summary}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* FOUND */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px' }}>
          <span className="lbl" style={{ color: '#16a34a', display: 'block', marginBottom: '0.65rem', fontWeight: 700 }}>
            ✓ VERIFIED OPERATIONAL FACTS ({what_found.length})
          </span>
          {what_found.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {what_found.map((item, i) => (
                <div key={i} style={{ fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.45, fontWeight: 500 }}>
                  <span style={{ color: '#16a34a', marginRight: '0.4rem', fontWeight: 800 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>No operational records found.</span>
          )}
        </div>

        {/* MISSING */}
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '1rem', borderRadius: '8px' }}>
          <span className="lbl" style={{ color: '#c2410c', display: 'block', marginBottom: '0.65rem', fontWeight: 700 }}>
            ⚠ MISSING EVIDENCE ({missing.length})
          </span>
          {missing.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {missing.map((item, i) => (
                <div key={i} style={{ fontSize: '0.875rem', color: '#9a3412', lineHeight: 1.45, fontWeight: 500 }}>
                  <span style={{ color: '#dc2626', marginRight: '0.4rem', fontWeight: 800 }}>×</span>
                  <span style={{ textTransform: 'capitalize' }}>{typeof item === 'string' ? item.replace(/_/g, ' ') : item}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>All required documentary proof present.</span>
          )}
        </div>

        {/* UNUSUAL */}
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '8px' }}>
          <span className="lbl" style={{ color: '#dc2626', display: 'block', marginBottom: '0.65rem', fontWeight: 700 }}>
            🚨 BEHAVIORAL ANOMALIES ({unusual.length})
          </span>
          {unusual.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {unusual.map((item, i) => (
                <div key={i} style={{ fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.45, fontWeight: 600 }}>
                  <span style={{ marginRight: '0.4rem' }}>!</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>No unusual behavioral anomalies detected.</span>
          )}
        </div>
      </div>
    </div>
  );
}

