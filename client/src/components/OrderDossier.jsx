import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function OrderDossier({ order }) {
  const [expanded, setExpanded] = useState(false);

  if (!order) return null;

  const deliveryConfirmedDate = order.delivery_confirmed_at
    ? new Date(order.delivery_confirmed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not Confirmed';

  const addressStr = order.shipping_address
    ? `${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country}`
    : 'No address record';

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div>
          <span className="lbl" style={{ display: 'block', color: '#ea580c' }}>MERCHANT ORDER DOSSIER</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            #{order.id} — Status: <span style={{ textTransform: 'uppercase', color: '#16a34a', fontWeight: 700 }}>{order.delivery_status ? order.delivery_status.replace(/_/g, ' ') : 'N/A'}</span>
          </span>
        </div>

        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'COLLAPSE' : 'EXPAND'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
          {/* Purchased Line Items */}
          <div>
            <span className="lbl" style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b' }}>PURCHASED LINE ITEMS</span>
            {Array.isArray(order.items) && order.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.name} × {item.quantity}</span>
                    <span className="mono" style={{ fontWeight: 700, color: '#ea580c' }}>
                      {((item.price * item.quantity) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="lbl" style={{ color: '#94a3b8' }}>No line items listed</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            <div>
              <span className="lbl" style={{ display: 'block', color: '#64748b' }}>DELIVERY CONFIRMATION DATE</span>
              <span className="mono" style={{ color: '#0f172a', fontWeight: 600 }}>{deliveryConfirmedDate}</span>
            </div>

            <div>
              <span className="lbl" style={{ display: 'block', color: '#64748b' }}>SHIPPING DESTINATION</span>
              <span style={{ color: '#0f172a', fontWeight: 500 }}>{addressStr}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

