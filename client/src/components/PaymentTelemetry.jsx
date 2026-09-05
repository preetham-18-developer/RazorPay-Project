import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PaymentTelemetry({ payment }) {
  const [expanded, setExpanded] = useState(false);

  if (!payment) return null;

  const amountRupees = (payment.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const createdDate = new Date(payment.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div>
          <span className="lbl" style={{ display: 'block', color: '#ea580c' }}>PAYMENT TELEMETRY LOG</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            #{payment.id} — <span style={{ color: '#ea580c' }}>{amountRupees}</span> ({payment.method ? payment.method.toUpperCase() : 'PAYMENT'})
          </span>
        </div>

        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'COLLAPSE' : 'EXPAND'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span className="lbl" style={{ display: 'block', color: '#64748b' }}>CREATED TIMESTAMP</span>
            <span className="mono" style={{ color: '#0f172a', fontWeight: 600 }}>{createdDate}</span>
          </div>

          <div>
            <span className="lbl" style={{ display: 'block', color: '#64748b' }}>CUSTOMER ID</span>
            <span className="mono" style={{ color: '#0f172a', fontWeight: 600 }}>{payment.customer_id}</span>
          </div>

          <div>
            <span className="lbl" style={{ display: 'block', color: '#64748b' }}>DEVICE TELEMETRY ID</span>
            <span className="mono" style={{ color: '#0f172a', fontWeight: 600 }}>{payment.device_id}</span>
          </div>

          <div>
            <span className="lbl" style={{ display: 'block', color: '#64748b' }}>IP ADDRESS</span>
            <span className="mono" style={{ color: '#0f172a', fontWeight: 600 }}>{payment.ip_address}</span>
          </div>
        </div>
      )}
    </div>
  );
}

