import React, { useState } from 'react';
import { ShoppingBag, ChevronDown, ChevronUp, Truck, MapPin } from 'lucide-react';

export default function OrderDetails({ order }) {
  const [expanded, setExpanded] = useState(false);

  if (!order) return null;

  const deliveryConfirmedDate = order.delivery_confirmed_at
    ? new Date(order.delivery_confirmed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not Confirmed';

  const addressStr = order.shipping_address
    ? `${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country}`
    : 'No address record';

  return (
    <div className="card animate-fade-in">
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)' }}>
            <ShoppingBag size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MERCHANT ORDER RECORD</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              #{order.id} — Status: <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{order.delivery_status ? order.delivery_status.replace(/_/g, ' ') : 'N/A'}</span>
            </h4>
          </div>
        </div>

        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Collapse' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
          {/* Purchased Line Items */}
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Purchased Line Items</span>
            {Array.isArray(order.items) && order.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)' }}>
                    <span>{item.name} × {item.quantity}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {((item.price * item.quantity) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No items listed</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Truck size={12} /> Delivery Confirmation Date
              </span>
              <span className="mono" style={{ color: 'var(--text-primary)' }}>{deliveryConfirmedDate}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <MapPin size={12} /> Shipping Address
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{addressStr}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
