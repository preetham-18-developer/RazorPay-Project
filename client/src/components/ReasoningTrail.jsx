import React from 'react';
import { GitCommit, ChevronRight } from 'lucide-react';

export default function ReasoningTrail({ reasoningTrail = [] }) {
  if (!Array.isArray(reasoningTrail) || reasoningTrail.length === 0) return null;

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <GitCommit size={18} color="var(--accent-purple)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Decision Pipeline Audit Trail
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
        {reasoningTrail.map((stepText, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              position: 'relative'
            }}
          >
            <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-purple)', minWidth: '32px', textAlign: 'center' }}>
              {String(idx + 1).padStart(2, '0')}
            </div>

            <div style={{ flex: 1, backgroundColor: 'var(--bg-card-hover)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {stepText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
