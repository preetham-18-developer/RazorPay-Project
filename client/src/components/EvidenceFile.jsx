import React from 'react';
import { FileCheck, FileX, CreditCard, Truck, MessageSquare, Shield, FileText } from 'lucide-react';

const EVIDENCE_CONFIG = [
  { type: 'payment_confirmation', title: 'PAYMENT CONFIRMATION', subtitle: 'Receipt & Gateway Log', icon: CreditCard },
  { type: 'delivery_confirmation', title: 'DELIVERY CONFIRMATION', subtitle: 'Proof of Delivery & OTP Log', icon: Truck },
  { type: 'customer_communication', title: 'CUSTOMER COMMUNICATION', subtitle: 'Support Tickets & Chat', icon: MessageSquare },
  { type: 'terms_acceptance', title: 'TERMS ACCEPTANCE', subtitle: 'Terms of Service Audit Log', icon: Shield },
  { type: 'shipping_record', title: 'SHIPPING RECORD', subtitle: 'Courier Dispatch Tracking', icon: FileText }
];

export default function EvidenceFile({ evidence = [] }) {
  const docsMap = {};
  if (Array.isArray(evidence)) {
    evidence.forEach(d => {
      docsMap[d.type] = d;
    });
  }

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>
        CASE DOSSIER ATTACHMENTS
      </span>
      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1.25rem' }}>
        Evidence Dossier Cards
      </h2>

      {/* 2-Column Visual Document Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {EVIDENCE_CONFIG.map((config, index) => {
          const doc = docsMap[config.type];
          const isPresent = doc && doc.present === true && doc.doc_id !== null;
          const stepNum = String(index + 1).padStart(2, '0');
          const IconComp = config.icon;

          return (
            <div
              key={config.type}
              style={{
                backgroundColor: isPresent ? '#ffffff' : '#f8fafc',
                border: isPresent ? '1px solid #ffedd5' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: isPresent ? '0 1px 2px rgba(249, 115, 22, 0.08)' : 'none'
              }}
            >
              <div>
                {/* Top Row: Number, Icon & Document Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                      {stepNum}
                    </span>
                    <IconComp size={18} color={isPresent ? '#ea580c' : '#94a3b8'} />
                  </div>

                  <span className="lbl" style={{ color: isPresent ? '#ea580c' : '#64748b', fontSize: '0.65rem' }}>
                    {config.title}
                  </span>
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {config.subtitle}
                </div>

                <div className="doc-id" style={{ color: isPresent ? '#ea580c' : '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                  {isPresent ? `📄 ${doc.doc_id}` : 'No file on record'}
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {isPresent ? 'DOCUMENT VERIFIED' : 'FILE UNATTACHED'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isPresent ? <FileCheck size={14} color="#16a34a" /> : <FileX size={14} color="#dc2626" />}
                  <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: isPresent ? '#16a34a' : '#dc2626' }}>
                    {isPresent ? '✓ Available' : '× Missing'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

