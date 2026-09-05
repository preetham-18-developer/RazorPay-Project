import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getFreshMartOrderTimeline } from '../api/freshmart';

export default function FreshMartOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState('');

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setLoading(true);
        const res = await getFreshMartOrderTimeline(id);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load order timeline');
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [id]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
        <FreshMartHeader />
        <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
          Reconstructing order state from operational event ledger...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
        <FreshMartHeader />
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '8px', color: '#dc2626' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Order Not Found</h2>
            <p>{error}</p>
            <Link to="/orders" style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'none' }}>← Back to My Orders</Link>
          </div>
        </main>
      </div>
    );
  }

  const { reconstructed_state: state, timeline, evidence_dossier: evidence } = data;

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reasonCode = formData.get('reason_code');
    const claim = formData.get('customer_claim');

    try {
      setSubmittingDispute(true);
      setTransitionStatus('Filing DISPUTE_FILED event in operational ledger...');

      const res = await fetch(`/freshmart/orders/${state.order_id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason_code: reasonCode, customer_claim: claim })
      });
      const resData = await res.json();

      if (res.ok && resData.dispute_id) {
        setTransitionStatus('Building operational dossier & evaluating evidence...');
        setTimeout(() => {
          setTransitionStatus('Opening DisputeShield investigation workbench...');
          setTimeout(() => {
            navigate(`/disputes/${resData.dispute_id}`);
          }, 600);
        }, 600);
      } else {
        alert(resData.error || 'Dispute submission failed');
        setSubmittingDispute(false);
      }
    } catch (err) {
      alert('Dispute submission failed: ' + err.message);
      setSubmittingDispute(false);
    }
  };

  // Convert paise or rupees to formatted INR
  const formattedTotal = (state.total_amount > 100000)
    ? (state.total_amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    : Number(state.total_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  // Order Timeline Steps Status
  const steps = [
    { label: 'Payment Confirmed', done: state.payment_status === 'CAPTURED' },
    { label: 'Order Placed', done: state.event_count >= 1 },
    { label: 'Packed', done: state.fulfillment_status === 'PACKED' || state.fulfillment_status === 'COURIER_ASSIGNED' || state.delivery_status !== 'PENDING' },
    { label: 'Courier Assigned', done: state.fulfillment_status === 'COURIER_ASSIGNED' || state.delivery_status !== 'PENDING' },
    { label: 'Dispatched', done: state.delivery_status === 'IN_TRANSIT' || state.delivery_status === 'DELIVERED' },
    { label: 'Delivered', done: state.delivery_status === 'DELIVERED' }
  ];

  const isOrderEligibleForDispute = Boolean(
    state &&
    state.order_id &&
    state.payment_status === 'CAPTURED' &&
    (state.order_placed || (state.ordered_items && state.ordered_items.length > 0) || state.event_count >= 1)
  );

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      <FreshMartHeader />

      {/* Investigation Transition Modal Overlay */}
      {submittingDispute && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #f97316', padding: '2.5rem', borderRadius: '12px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Opening DisputeShield Investigation</h3>
            <p className="mono" style={{ color: '#ea580c', fontSize: '0.85rem', fontWeight: 700, minHeight: '2.5rem' }}>
              {transitionStatus}
            </p>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#fff7ed', borderRadius: '2px', overflow: 'hidden', marginTop: '1rem' }}>
              <div style={{ width: '85%', height: '100%', backgroundColor: '#f97316', borderRadius: '2px' }} />
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem 4rem 2rem' }}>
        
        {/* Order Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Order #{state.order_id}
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: state.payment_status === 'CAPTURED' ? '#dcfce7' : '#fee2e2', color: state.payment_status === 'CAPTURED' ? '#15803d' : '#dc2626', padding: '0.2rem 0.65rem', borderRadius: '4px' }}>
                PAYMENT: {state.payment_status}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.65rem', borderRadius: '4px' }}>
                DELIVERY: {state.delivery_status}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Recorded Events: <strong>{state.event_count}</strong> · Order Total: <strong style={{ color: '#f97316' }}>{formattedTotal}</strong>
            </div>
          </div>

          <Link to="/orders" className="btn-secondary" style={{ textDecoration: 'none' }}>
            ← Back to Orders
          </Link>
        </div>

        {/* Horizontal Status Progress Bar */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem 1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Fulfillment Progress
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', textAlign: 'center', position: 'relative' }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: step.done ? '#f97316' : '#f1f5f9',
                  color: step.done ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  marginBottom: '0.5rem',
                  boxShadow: step.done ? '0 2px 4px rgba(249, 115, 22, 0.25)' : 'none'
                }}>
                  {step.done ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: step.done ? 700 : 500, color: step.done ? '#0f172a' : '#64748b' }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Order Items Summary */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Order Summary</h2>

            {state.ordered_items && state.ordered_items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {state.ordered_items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: '#fff7ed', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
                        📦
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{item.name || 'Grocery Item'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.sku || 'SKU-GEN'} · Qty: {item.qty || 1}</div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                      ₹{Number(item.price || (state.total_amount > 100000 ? state.total_amount / 100 : state.total_amount)).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                Gourmet Pantry Item (SKU: PANTRY-RES-18999)
              </div>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Total Paid</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f97316' }}>{formattedTotal}</span>
            </div>
          </div>

          {/* Delivery Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', height: 'fit-content', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Delivery Information</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Delivery Status</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{state.delivery_status}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Courier Partner</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{state.courier_partner || 'DELHIVERY'}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Tracking Number</span>
                <span className="mono" style={{ fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>{state.tracking_number || 'AWB_FM_990102'}</span>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>OTP Verification Status</span>
                {state.otp_status === 'VERIFIED' || state.otp_verified ? (
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    ✓ OTP VERIFIED
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    ⚠ OTP BYPASSED / UNVERIFIED
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Customer Acknowledgement Prompt */}
        {state.delivery_status === 'DELIVERED' && !state.customer_response && (
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#c2410c', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>CUSTOMER ACKNOWLEDGEMENT</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>Your order was marked delivered by courier.</h3>
              <p style={{ color: '#9a3412', fontSize: '0.9rem', margin: 0 }}>Please confirm whether you received your parcel.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button
                onClick={async () => {
                  await fetch(`/freshmart/orders/${state.order_id}/customer-response`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ response_type: 'CONFIRMED' })
                  });
                  window.location.reload();
                }}
                style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                ✓ Yes, I Received It
              </button>
              <button
                onClick={async () => {
                  await fetch(`/freshmart/orders/${state.order_id}/customer-response`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ response_type: 'NON_RECEIPT' })
                  });
                  window.location.reload();
                }}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                ⚠ No, I Did Not Receive It
              </button>
            </div>
          </div>
        )}

        {/* Report a Problem / File Dispute Section - Only Rendered When Payment Captured & Order Exists */}
        {isOrderEligibleForDispute && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #ffedd5', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <span style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DISPUTESHIELD AI ASSISTANT
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                Having a problem with your order?
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Tell us what happened. DisputeShield will automatically gather transaction and delivery evidence to evaluate your claim.
              </p>
            </div>

            {state.dispute_status !== 'DISPUTED' ? (
              <form onSubmit={handleDisputeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Dispute Reason</label>
                  <select
                    name="reason_code"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="PRODUCT_NOT_RECEIVED">PRODUCT_NOT_RECEIVED (Merchandise not received)</option>
                    <option value="PRODUCT_DEFECTIVE">PRODUCT_DEFECTIVE (Damaged / defective items)</option>
                    <option value="WRONG_PRODUCT">WRONG_PRODUCT (Incorrect product delivered)</option>
                    <option value="MISSING_ITEM">MISSING_ITEM (Partial shipment / missing item)</option>
                    <option value="DUPLICATE_CHARGE">DUPLICATE_CHARGE (Multiple payment charges)</option>
                    <option value="REFUND_NOT_PROCESSED">REFUND_NOT_PROCESSED (Refund unfulfilled)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Description of Problem</label>
                  <textarea
                    name="customer_claim"
                    rows={3}
                    placeholder="Describe what happened (e.g. Courier marked parcel delivered without OTP verification, but package was never received)."
                    defaultValue={state.customer_response === 'REPORTED_NON_RECEIPT' ? 'Package was marked delivered by courier without OTP verification, but I did not receive the items.' : ''}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', alignSelf: 'flex-start' }}
                >
                  Submit Dispute & Start AI Investigation →
                </button>
              </form>
            ) : (
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#c2410c', fontWeight: 800, fontSize: '0.8rem' }}>DISPUTE ACTIVE</span>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                    Case #{state.dispute_id} is under AI risk evaluation & evidence grounding.
                  </div>
                </div>
                <Link to={`/disputes/${state.dispute_id}`} className="btn-primary" style={{ textDecoration: 'none' }}>
                  Open DisputeShield Investigation Workbench →
                </Link>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
