import React from 'react';
import { FileCheck, FileX, Folder } from 'lucide-react';

const EVIDENCE_LABELS = {
  payment_confirmation: 'Payment Confirmation Receipt',
  delivery_confirmation: 'Delivery Confirmation & POD',
  customer_communication: 'Customer Support Chat & Email Logs',
  terms_acceptance: 'Terms of Service Acceptance Log',
  shipping_record: 'Courier Shipping & Tracking Record'
};

export default function EvidenceBoard({ evidence = [] }) {
  const docsMap = {};
  if (Array.isArray(evidence)) {
    evidence.forEach(d => {
      docsMap[d.type] = d;
    });
  }

  const allTypes = Object.keys(EVIDENCE_LABELS);

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <Folder size={18} color="var(--accent-purple)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Evidence File Folder
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {allTypes.map(type => {
          const doc = docsMap[type];
          const isPresent = doc && doc.present === true && doc.doc_id !== null;

          return (
            <div
              key={type}
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {EVIDENCE_LABELS[type]}
                  </span>
                  {isPresent ? (
                    <FileCheck size={16} color="var(--status-success)" />
                  ) : (
                    <FileX size={16} color="var(--status-danger)" />
                  )}
                </div>

                <p className="mono" style={{ fontSize: '0.75rem', color: isPresent ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {isPresent ? doc.doc_id : 'No document file on record'}
                </p>
              </div>

              <div>
                <span className={`status-pill ${isPresent ? 'success' : 'danger'}`} style={{ fontSize: '0.65rem' }}>
                  {isPresent ? 'AVAILABLE' : 'MISSING'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
