import React from 'react';

export default function RiskEvidenceQuadrant({ riskScore = 0, evidenceScore = 0, decision = 'auto_draft' }) {
  const width = 700;
  const height = 440;
  const paddingX = 65;
  const paddingY = 45;

  const chartW = width - paddingX - 35;
  const chartH = height - paddingY - 45;

  const rScore = Math.min(100, Math.max(0, typeof riskScore === 'number' ? riskScore : 0));
  const eScore = Math.min(100, Math.max(0, typeof evidenceScore === 'number' ? evidenceScore : 0));

  const cx = paddingX + (rScore / 100) * chartW;
  const cy = (paddingY + chartH) - (eScore / 100) * chartH;

  let dotColor = '#64748b';
  if (decision === 'auto_draft') {
    dotColor = '#16a34a';
  } else if (decision === 'prepare_and_review') {
    dotColor = '#d97706';
  } else if (decision === 'do_not_contest_review') {
    dotColor = '#dc2626';
  }

  // Generate dynamic 1-sentence interpretation from API decision & scores
  let interpretationSentence = "Strong evidence supports the claim, while fraud risk remains low.";
  if (decision === 'prepare_and_review') {
    if (rScore < 40 && eScore >= 60) {
      interpretationSentence = "High-value dispute amount triggers deterministic policy threshold escalation (>₹5,000) despite strong evidentiary proof.";
    } else {
      interpretationSentence = "High risk signals (DELIVERY_MARKED_WITHOUT_OTP conflict) are detected alongside available evidence, requiring officer review prior to submission.";
    }
  } else if (decision === 'do_not_contest_review') {
    interpretationSentence = "Fraud risk signals are elevated and evidentiary proof is insufficient to contest.";
  } else if (decision === 'review') {
    interpretationSentence = "Evidentiary proof is incomplete and behavioral risk signals require officer review.";
  }

  return (
    <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#f97316' }}>
            SIGNATURE DIAGNOSTIC INSTRUMENT
          </span>
          <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a' }}>
            Risk × Evidence Diagnostic Scorecard
          </h2>
        </div>

        {/* Large Scores Display Cards */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: '130px' }}>
            <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: '#dc2626' }}>BEHAVIORAL RISK</span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {rScore.toFixed(0)}
              </span>
              <span className="mono" style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
                / 100
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: '130px' }}>
            <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: '#b45309' }}>EVIDENCE STRENGTH</span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>
                {eScore.toFixed(0)}
              </span>
              <span className="mono" style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent SVG Quadrant Graph */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '720px', height: 'auto' }}>
          {/* 2x2 Zone Background Tints */}
          <rect x={paddingX} y={paddingY} width={chartW * 0.4} height={chartH * 0.4} fill="rgba(22, 163, 74, 0.08)" />
          <rect x={paddingX + chartW * 0.4} y={paddingY} width={chartW * 0.6} height={chartH * 0.4} fill="rgba(217, 119, 6, 0.1)" />
          <rect x={paddingX + chartW * 0.4} y={paddingY + chartH * 0.4} width={chartW * 0.6} height={chartH * 0.6} fill="rgba(220, 38, 38, 0.08)" />
          <rect x={paddingX} y={paddingY + chartH * 0.4} width={chartW * 0.4} height={chartH * 0.6} fill="rgba(100, 116, 139, 0.08)" />

          {/* Hairline Axes Dividers */}
          <line x1={paddingX + chartW * 0.4} y1={paddingY} x2={paddingX + chartW * 0.4} y2={paddingY + chartH} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1={paddingX} y1={paddingY + chartH * 0.4} x2={paddingX + chartW} y2={paddingY + chartH * 0.4} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Outer Border */}
          <rect x={paddingX} y={paddingY} width={chartW} height={chartH} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Zone Labels */}
          <text x={paddingX + 16} y={paddingY + 28} fill="#16a34a" fontSize="12" fontFamily="var(--font-body)" fontWeight="700">✓ AUTO DRAFT</text>
          <text x={paddingX + 16} y={paddingY + 44} fill="#475569" fontSize="9.5" fontFamily="var(--font-mono)">Strong evidence · Low risk</text>

          <text x={paddingX + chartW * 0.4 + 16} y={paddingY + 28} fill="#b45309" fontSize="12" fontFamily="var(--font-body)" fontWeight="700">PREPARE & REVIEW</text>
          <text x={paddingX + chartW * 0.4 + 16} y={paddingY + 44} fill="#475569" fontSize="9.5" fontFamily="var(--font-mono)">High value / Policy gate check</text>

          <text x={paddingX + chartW * 0.4 + 16} y={paddingY + chartH - 24} fill="#dc2626" fontSize="12" fontFamily="var(--font-body)" fontWeight="700">! DO NOT CONTEST</text>
          <text x={paddingX + chartW * 0.4 + 16} y={paddingY + chartH - 10} fill="#475569" fontSize="9.5" fontFamily="var(--font-mono)">High risk · Weak evidence</text>

          <text x={paddingX + 16} y={paddingY + chartH - 24} fill="#475569" fontSize="12" fontFamily="var(--font-body)" fontWeight="700">REVIEW</text>
          <text x={paddingX + 16} y={paddingY + chartH - 10} fill="#475569" fontSize="9.5" fontFamily="var(--font-mono)">Low evidence · Officer review</text>

          {/* Axis Titles & Labels */}
          <text x={paddingX} y={height - 12} fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">LOW</text>
          <text x={paddingX + chartW / 2} y={height - 12} fill="#0f172a" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle">BEHAVIORAL RISK →</text>
          <text x={paddingX + chartW} y={height - 12} fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600" textAnchor="end">HIGH</text>

          <text x={18} y={paddingY + chartH} fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">WEAK</text>
          <text x={18} y={paddingY + chartH / 2} fill="#0f172a" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle" transform={`rotate(-90 18 ${paddingY + chartH / 2})`}>EVIDENCE STRENGTH →</text>
          <text x={18} y={paddingY + 12} fill="#64748b" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">STRONG</text>

          {/* Plotted Case Position Callout Marker */}
          <circle cx={cx} cy={cy} r="14" fill="rgba(249, 115, 22, 0.2)" />
          <circle cx={cx} cy={cy} r="6" fill="#f97316" stroke="#ffffff" strokeWidth="2" />

          {/* Floating Case Callout Tag */}
          <g transform={`translate(${Math.min(cx + 12, width - 160)}, ${Math.max(cy - 20, paddingY + 20)})`}>
            <rect x="0" y="0" width="145" height="36" rx="6" fill="#0f172a" stroke="#ea580c" strokeWidth="1.5" />
            <text x="10" y="15" fill="#ffffff" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="700">● CASE POSITION</text>
            <text x="10" y="28" fill="#fb923c" fontSize="9" fontFamily="var(--font-mono)">Risk {rScore.toFixed(0)} · Evid {eScore.toFixed(0)}</text>
          </g>
        </svg>
      </div>

      {/* Dynamic 1-Sentence Interpretation */}
      <div style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #ea580c', padding: '0.85rem 1.15rem', borderRadius: '0 6px 6px 0', marginBottom: '1.25rem' }}>
        <p style={{ fontStyle: 'normal', color: '#334155', fontSize: '0.925rem', fontWeight: 500, margin: 0 }}>
          💡 <strong style={{ color: '#0f172a' }}>Diagnostic Insight:</strong> "{interpretationSentence}"
        </p>
      </div>

      {/* Compact Visual Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem' }}>
        <span className="mono" style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
          ✓ LOW RISK + STRONG EVIDENCE → AUTO DRAFT
        </span>
        <span className="mono" style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>
          ● HIGH RISK + STRONG EVIDENCE → PREPARE & REVIEW
        </span>
        <span className="mono" style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
          ! WEAK EVIDENCE → HUMAN REVIEW
        </span>
      </div>
    </div>
  );
}

