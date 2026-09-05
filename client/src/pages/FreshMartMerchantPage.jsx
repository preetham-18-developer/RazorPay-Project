import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getFreshMartOrders } from '../api/freshmart';

export default function FreshMartMerchantPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedAuditOrder, setSelectedAuditOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getFreshMartOrders();
      setOrders(data);
    } catch (err) {
      setError('Failed to load merchant order queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePack = async (orderId) => {
    try {
      setActionLoading(orderId);
      const res = await fetch(`/freshmart/orders/${orderId}/pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) await fetchOrders();
    } catch (e) {
      setError('Failed to pack order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignCourier = async (orderId) => {
    try {
      setActionLoading(orderId);
      const res = await fetch(`/freshmart/orders/${orderId}/assign-courier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) await fetchOrders();
    } catch (e) {
      setError('Failed to assign courier');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (orderId) => {
    try {
      setActionLoading(orderId);
      const res = await fetch(`/freshmart/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) await fetchOrders();
    } catch (e) {
      setError('Failed to dispatch order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliver = async (orderId, otpVerified) => {
    try {
      setActionLoading(orderId);
      const res = await fetch(`/freshmart/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_verified: otpVerified })
      });
      if (res.ok) await fetchOrders();
    } catch (e) {
      setError('Failed to mark delivery');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
          <div>
            <span className="mono" style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>MERCHANT FULFILLMENT CONSOLE</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', margin: '0.2rem 0', color: '#f8fafc' }}>
              FreshMart Order Fulfillment Queue
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/freshmart/scenarios" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚡ SCENARIO INJECTOR (DEMO) →
            </Link>
            <Link to="/freshmart" style={{ backgroundColor: '#1e293b', color: '#38bdf8', textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
              STOREFRONT →
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <span className="mono" style={{ color: '#f87171', fontWeight: 600 }}>NOTICE:</span> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
            <span>REPLAYING MERCHANT FULFILLMENT QUEUE...</span>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }}>
            <p style={{ color: '#94a3b8' }}>No active orders in fulfillment queue.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {orders.map(order => (
              <div key={order.order_id} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span className="mono" style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>#{order.order_id}</span>
                      <span className="mono" style={{ fontSize: '0.7rem', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '2px', fontWeight: 600 }}>
                        {order.payment_status}
                      </span>
                      <span className="mono" style={{ fontSize: '0.7rem', backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '2px' }}>
                        FULFILLMENT: {order.fulfillment_status}
                      </span>
                      <span className="mono" style={{ fontSize: '0.7rem', backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '2px' }}>
                        DELIVERY: {order.delivery_status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                      Customer: <strong>cust_fm_demo_user</strong> · Total: <strong style={{ color: '#f8fafc' }}>{((order.total_amount || 0) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link
                      to={`/freshmart/orders/${order.order_id}`}
                      style={{ backgroundColor: '#1e293b', color: '#10b981', border: '1px solid #334155', textDecoration: 'none', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      👁 CUSTOMER VIEW →
                    </Link>
                    <button
                      onClick={() => setSelectedAuditOrder(order)}
                      style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      📜 VIEW EVENT AUDIT STREAM ({order.event_count})
                    </button>
                  </div>
                </div>

                {/* Items & SKUs */}
                {order.ordered_items && order.ordered_items.length > 0 && (
                  <div style={{ marginBottom: '1rem', backgroundColor: '#1e293b', padding: '0.85rem 1rem', borderRadius: '4px' }}>
                    <span className="mono" style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>ORDERED ITEMS & PRESERVED SKUS</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {order.ordered_items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                          <strong>{it.name}</strong> (x{it.qty}) · <span className="mono" style={{ color: '#38bdf8', fontSize: '0.75rem' }}>{it.sku}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operational Fulfillment Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.5rem' }}>OPERATIONAL ACTIONS:</span>

                  {order.fulfillment_status === 'UNFULFILLED' && (
                    <button
                      onClick={() => handlePack(order.order_id)}
                      disabled={actionLoading === order.order_id}
                      style={{ backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      📦 PACK PARCEL
                    </button>
                  )}

                  {order.fulfillment_status === 'PACKED' && (
                    <button
                      onClick={() => handleAssignCourier(order.order_id)}
                      disabled={actionLoading === order.order_id}
                      style={{ backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      🚚 ASSIGN COURIER
                    </button>
                  )}

                  {order.fulfillment_status === 'COURIER_ASSIGNED' && (
                    <button
                      onClick={() => handleDispatch(order.order_id)}
                      disabled={actionLoading === order.order_id}
                      style={{ backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      🚀 DISPATCH FOR DELIVERY
                    </button>
                  )}

                  {order.delivery_status === 'IN_TRANSIT' && (
                    <>
                      <button
                        onClick={() => handleDeliver(order.order_id, true)}
                        disabled={actionLoading === order.order_id}
                        style={{ backgroundColor: '#22c55e', color: '#0f172a', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        ✓ MARK DELIVERED (OTP VERIFIED)
                      </button>

                      <button
                        onClick={() => handleDeliver(order.order_id, false)}
                        disabled={actionLoading === order.order_id}
                        style={{ backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        ⚠ MARK DELIVERED WITHOUT OTP (BYPASS)
                      </button>
                    </>
                  )}

                  {order.delivery_status === 'DELIVERED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', color: order.otp_verified ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                        ✓ DELIVERED ({order.otp_verified ? 'OTP VERIFIED' : 'OTP BYPASSED BY DRIVER'})
                      </span>
                      <Link to={`/freshmart/orders/${order.order_id}`} style={{ backgroundColor: '#10b981', color: '#090d16', textDecoration: 'none', padding: '0.45rem 0.9rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        CUSTOMER ORDER & DISPUTE FLOW →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Un-editable Event Audit Stream Modal */}
      {selectedAuditOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div style={{ width: '600px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Un-editable Event Audit Stream: #{selectedAuditOrder.order_id}</h3>
              <button onClick={() => setSelectedAuditOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedAuditOrder.timeline.map((evt, idx) => (
                <div key={idx} style={{ backgroundColor: '#1e293b', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span className="mono" style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>{evt.event_type}</span>
                    <span className="mono" style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Actor: {evt.actor} · Source: {evt.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
