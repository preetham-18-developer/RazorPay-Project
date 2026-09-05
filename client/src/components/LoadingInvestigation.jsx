import React, { useState, useEffect } from 'react';

const PIPELINE_STAGES = [
  'OPENING CASE FILE DOSSIER',
  'IDENTIFYING PAYMENT RECORD TELEMETRY',
  'INSPECTING ORDER HISTORY & FULFILLMENT',
  'RETRIEVING EVIDENTIARY DOCUMENTS',
  'ASSESSING FRAUD RISK CLASSIFIER (v3)',
  'EVALUATING EVIDENCE STRENGTH SCORE',
  'APPLYING DETERMINISTIC POLICY GATE'
];

export default function LoadingInvestigation({ disputeId }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setCurrentStep(PIPELINE_STAGES.length - 1);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < PIPELINE_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 250);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: '2rem 0', maxWidth: '600px', margin: '0 auto' }}>
      <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem' }}>
        CASE FILE #{disputeId || 'CASE'}
      </span>
      <h2 className="dossier-headline" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
        FORENSIC INVESTIGATION IN PROGRESS
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                fontSize: '0.8rem',
                color: isDone ? 'var(--paper)' : isCurrent ? 'var(--gold)' : 'var(--stone)'
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '0.65rem',
                  color: isDone ? 'var(--moss-bright)' : isCurrent ? 'var(--gold)' : 'var(--stone)',
                  fontWeight: 600,
                  minWidth: '22px'
                }}
              >
                0{idx + 1}
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', letterSpacing: '0.02em' }}>
                {stage} {isDone ? '✓' : isCurrent ? '...' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
