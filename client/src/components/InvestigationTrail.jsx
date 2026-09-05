import React from 'react';
import { CreditCard, Package, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function InvestigationTrail({ reasoningTrail = [] }) {
  if (!Array.isArray(reasoningTrail) || reasoningTrail.length === 0) return null;

  const getStepConfig = (text, idx) => {
    const isPolicy = text.toLowerCase().includes('safety gate') || text.toLowerCase().includes('policy');
    const isRisk = text.toLowerCase().includes('risk');
    const isEvidence = text.toLowerCase().includes('evidence');

    let actionTitle = 'Execution Step';
    let IconComp = CreditCard;

    if (idx === 0) {
      actionTitle = 'Payment & Transaction Verification';
      IconComp = CreditCard;
    } else if (idx === 1) {
      actionTitle = 'Order Fulfillment & Provenance Audit';
      IconComp = Package;
    } else if (isEvidence) {
      actionTitle = 'Claim-Aware Evidence Assessment';
      IconComp = FileText;
    } else if (isRisk) {
      actionTitle = 'ML Behavioral Risk Assessment';
      IconComp = AlertTriangle;
    } else if (isPolicy) {
      actionTitle = 'Deterministic Bounded Autonomy Policy Check';
      IconComp = ShieldCheck;
    } else if (idx === 2) {
      actionTitle = 'Deterministic Decision Engine Synthesis';
      IconComp = ShieldCheck;
    }

    return { actionTitle, detailText: text, isPolicy, IconComp };
  };

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>
        SYSTEM AUDIT TRAIL
      </span>
      <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1.25rem' }}>
        Vertical Investigation Audit Timeline
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '0.5rem' }}>
        {reasoningTrail.map((stepText, idx) => {
          const { actionTitle, detailText, isPolicy, IconComp } = getStepConfig(stepText, idx);
          const stepNum = String(idx + 1).padStart(2, '0');
          const isLast = idx === reasoningTrail.length - 1;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                position: 'relative'
              }}
            >
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '17px',
                    top: '36px',
                    bottom: '-16px',
                    width: '2px',
                    backgroundColor: isPolicy ? '#fde68a' : '#e2e8f0',
                    zIndex: 1
                  }}
                />
              )}

              {/* Number Circle Badge */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: isPolicy ? '#fff7ed' : '#f8fafc',
                  border: isPolicy ? '2px solid #ea580c' : '2px solid #cbd5e1',
                  color: isPolicy ? '#ea580c' : '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  zIndex: 2,
                  flexShrink: 0
                }}
              >
                {stepNum}
              </div>

              {/* Step Card Container */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: isPolicy ? '#fff7ed' : '#f8fafc',
                  border: isPolicy ? '1px solid #ffedd5' : '1px solid #f1f5f9',
                  borderRadius: '8px',
                  padding: '0.85rem 1.15rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <IconComp size={16} color={isPolicy ? '#ea580c' : '#0f172a'} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isPolicy ? '#9a3412' : '#0f172a' }}>
                    {actionTitle}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.8rem', color: isPolicy ? '#c2410c' : '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                  {detailText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

