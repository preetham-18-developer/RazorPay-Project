import React from 'react';

export default function MiniQuadrant({ riskScore = 30, evidenceScore = 80, decision = 'auto_draft' }) {
  const width = 32;
  const height = 32;
  const padding = 4;

  const rScore = Math.min(100, Math.max(0, typeof riskScore === 'number' ? riskScore : 0));
  const eScore = Math.min(100, Math.max(0, typeof evidenceScore === 'number' ? evidenceScore : 0));

  const cx = padding + (rScore / 100) * (width - 2 * padding);
  const cy = (height - padding) - (eScore / 100) * (height - 2 * padding);

  let dotColor = 'var(--stone-light)';
  if (decision === 'auto_draft') dotColor = 'var(--moss-bright)';
  else if (decision === 'prepare_and_review') dotColor = 'var(--gold)';
  else if (decision === 'do_not_contest_review') dotColor = 'var(--ember-bright)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ backgroundColor: 'var(--ink)', borderRadius: '2px', display: 'block' }}>
      {/* Crosshair Axes Lines */}
      <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="var(--ink-line)" strokeWidth="1" />
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="var(--ink-line)" strokeWidth="1" />
      
      {/* Positioned Score Dot */}
      <circle cx={cx} cy={cy} r="2.5" fill={dotColor} />
    </svg>
  );
}
