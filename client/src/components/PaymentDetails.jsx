import React, { useState } from 'react';
import { CreditCard, ChevronDown, ChevronUp, Monitor, Globe, User } from 'lucide-react';

export default function PaymentDetails({ payment }) {
  const [expanded, setExpanded] = useState(false);

  if (!payment) return null;

  const amountRupees = (payment.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const createdDate = new Date(payment.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card animate-fade-in">
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)' }}>
            <CreditCard size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PAYMENT TELEMETRY</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              #{payment.id} — {amountRupees} ({payment.method ? payment.method.toUpperCase() : 'PAYMENT'})
            </h4>
          </div>
        </div>

        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Collapse' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Created Timestamp</span>
            <span className="mono" style={{ color: 'var(--text-primary)' }}>{createdDate}</span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <User size={12} /> Customer ID
            </span>
            <span className="mono" style={{ color: 'var(--text-primary)' }}>{payment.customer_id}</span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Monitor size={12} /> Device ID
            </span>
            <span className="mono" style={{ color: 'var(--text-primary)' }}>{payment.device_id}</span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Globe size={12} /> IP Address
            </span>
            <span className="mono" style={{ color: 'var(--text-primary)' }}>{payment.ip_address}</span>
          </div>
        </div>
      )}
    </div>
  );
}
