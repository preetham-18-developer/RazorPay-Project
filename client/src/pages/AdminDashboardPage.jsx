import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getDisputes, getDispute } from '../api/disputes';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('freshsmart_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [adminEmail, setAdminEmail] = useState('admin@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    total_customers: 0,
    total_orders: 0,
    total_revenue: 0,
    successful_payments: 0,
    open_queries: 0,
    total_feedback: 0,
    average_rating: "0.0"
  });
  const [orders, setOrders] = useState([]);
  const [queries, setQueries] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fulfillment action loading
  const [actionLoading, setActionLoading] = useState(false);
  const [deliveryOtpVerified, setDeliveryOtpVerified] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();

      if (res.ok && data.user && data.user.role === 'admin') {
        localStorage.setItem('freshsmart_user', JSON.stringify(data.user));
        localStorage.setItem('freshsmart_token', data.token);
        window.dispatchEvent(new Event('auth_state_changed'));
        setCurrentUser(data.user);
        fetchAdminData();
      } else if (data.user && data.user.role !== 'admin') {
        setAdminLoginError('Access denied: Customer account cannot access Admin Dashboard.');
      } else {
        setAdminLoginError(data.error || 'Invalid admin credentials.');
      }
    } catch (err) {
      setAdminLoginError(err.message || 'Server authentication failed.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  async function fetchAdminData() {
    try {
      setLoading(true);
      const token = localStorage.getItem('freshsmart_token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };

      const [mRes, oRes, qRes, fRes, dRes] = await Promise.all([
        fetch('/freshmart/admin/metrics', { headers }).then(r => r.json()).catch(() => ({})),
        fetch('/freshmart/orders', { headers }).then(r => r.json()).catch(() => []),
        fetch('/freshmart/support/queries?admin=true', { headers }).then(r => r.json()).catch(() => []),
        fetch('/freshmart/feedback', { headers }).then(r => r.json()).catch(() => []),
        getDisputes().catch(() => [])
      ]);

      setMetrics(mRes || {});
      setOrders(oRes || []);
      setQueries(qRes || []);
      setFeedback(fRes || []);
      setDisputes(dRes || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Merchant fulfillment action handlers
  const handleFulfillmentAction = async (orderId, actionType) => {
    setActionLoading(true);
    try {
      let endpoint = `/freshmart/orders/${orderId}/${actionType}`;
      let bodyData = {};

      if (actionType === 'deliver') {
        bodyData = { otp_verified: deliveryOtpVerified };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        await fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (e) {
      alert('Action error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQueryStatus = async (queryId, status) => {
    try {
      const res = await fetch(`/freshmart/support/queries/${queryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
        <FreshMartHeader />
        <main style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0f172a', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', fontSize: '1.5rem', fontWeight: 800 }}>
                🛡️
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>ADMIN LOGIN</h1>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Access FreshSmart Merchant & AI DisputeShield Console
              </p>
            </div>

            {adminLoginError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                ⚠️ {adminLoginError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Admin Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem', backgroundColor: '#0f172a' }}
              >
                {adminLoginLoading ? 'Authenticating Admin...' : 'Sign In to Admin Dashboard →'}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#0f172a', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🛡️ DisputeShield Integrated Admin Risk Console
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a' }}>
              FreshSmart Business & Risk Operations
            </h1>
          </div>
          
          <button onClick={fetchAdminData} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            🔄 Refresh Live Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'orders', label: `📦 Orders (${orders.length})` },
            { id: 'queries', label: `💬 Queries (${queries.filter(q => q.status === 'OPEN').length} Open)` },
            { id: 'feedback', label: `⭐ Feedback (${feedback.length})` },
            { id: 'disputes', label: `🛡️ AI DisputeShield (${disputes.length})` },
            { id: 'analytics', label: '📈 Analytics' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#f97316' : '#64748b',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#e2e8f0 #e2e8f0 #ffffff #e2e8f0' : 'transparent',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW METRICS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Revenue</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', margin: '0.35rem 0' }}>
                  ₹{Number(metrics.total_revenue || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>From Live DB Payments</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Orders</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                  {metrics.total_orders || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Successful Payments: {metrics.successful_payments || 0}</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Open Customer Queries</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', margin: '0.35rem 0' }}>
                  {metrics.open_queries || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Requires Merchant Reply</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Average Rating</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                  ★ {metrics.average_rating || "0.0"} / 5.0
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Feedback: {metrics.total_feedback || 0}</div>
              </div>
            </div>

            {/* Quick Action Highlight Box */}
            <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#c2410c', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  🛡️ DisputeShield AI Autonomous Investigation Active
                </div>
                <div style={{ color: '#9a3412', fontSize: '0.9rem', maxWidth: '700px' }}>
                  DisputeShield automatically analyzes real transaction event ledgers, maps claim grounding, surfaces OTP delivery conflicts, and enforces safety gates.
                </div>
              </div>
              <button onClick={() => setActiveTab('disputes')} className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
                Open AI Disputes Console →
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: ORDERS MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Live Database Orders Queue</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  id="otpBypassToggle"
                  checked={!deliveryOtpVerified}
                  onChange={(e) => setDeliveryOtpVerified(!e.target.checked)}
                />
                <label htmlFor="otpBypassToggle" style={{ fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                  Simulate Delivery Without OTP (Triggers Conflict)
                </label>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>No orders recorded yet</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Customer purchases will appear here in real-time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {orders.map(order => (
                  <div key={order.order_id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Order #{order.order_id}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Customer: <strong>{order.customer_name || 'Demo Customer'}</strong> ({order.customer_email || 'customer@freshsmart.com'})
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f97316' }}>
                          ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Payment ID: {order.payment_id || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Status & Actions Controls Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: order.payment_status === 'CAPTURED' ? '#dcfce7' : '#fee2e2', color: order.payment_status === 'CAPTURED' ? '#15803d' : '#dc2626', padding: '0.25rem 0.65rem', borderRadius: '4px' }}>
                          PAYMENT: {order.payment_status}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#334155', padding: '0.25rem 0.65rem', borderRadius: '4px' }}>
                          FULFILLMENT: {order.fulfillment_status || 'UNFULFILLED'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fff7ed', color: '#c2410c', padding: '0.25rem 0.65rem', borderRadius: '4px' }}>
                          DELIVERY: {order.delivery_status || 'PENDING'}
                        </span>
                      </div>

                      {/* Fulfillment Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleFulfillmentAction(order.order_id, 'pack')}
                          disabled={actionLoading}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          📦 Pack
                        </button>
                        <button
                          onClick={() => handleFulfillmentAction(order.order_id, 'assign-courier')}
                          disabled={actionLoading}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          🚚 Assign Courier
                        </button>
                        <button
                          onClick={() => handleFulfillmentAction(order.order_id, 'dispatch')}
                          disabled={actionLoading}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          🛵 Dispatch
                        </button>
                        <button
                          onClick={() => handleFulfillmentAction(order.order_id, 'deliver')}
                          disabled={actionLoading}
                          className="btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        >
                          ✓ Deliver
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: CUSTOMER QUERIES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'queries' && (
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Customer Support Tickets</h2>

            {queries.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>No customer queries yet</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Support requests submitted by customers will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queries.map(q => (
                  <div key={q.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase' }}>{q.category}</span>
                        <span style={{ color: '#94a3b8', margin: '0 0.5rem' }}>•</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{q.customer_name} ({q.customer_email})</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: q.status === 'RESOLVED' ? '#dcfce7' : '#fef3c7', color: q.status === 'RESOLVED' ? '#15803d' : '#b45309', padding: '0.2rem 0.65rem', borderRadius: '4px' }}>
                          {q.status}
                        </span>
                        {q.status === 'OPEN' && (
                          <button
                            onClick={() => handleUpdateQueryStatus(q.id, 'RESOLVED')}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>{q.subject}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>{q.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: FEEDBACK */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'feedback' && (
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Customer Ratings & Feedback</h2>

            {feedback.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>No feedback submitted yet</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Customer reviews will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {feedback.map(fb => (
                  <div key={fb.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{fb.customer_name}</span>
                      <span style={{ color: '#f97316', fontWeight: 800 }}>{'★'.repeat(fb.rating)}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>"{fb.feedback_text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: AI DISPUTESHIELD WORKBENCH */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'disputes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>AI DisputeShield Risk Console</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Investigate operational disputes with bounded-autonomy AI intelligence</p>
              </div>
            </div>

            {disputes.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>No disputes filed yet</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Disputes filed by customers will appear here for autonomous AI investigation.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {disputes.map(disp => (
                  <div key={disp.id || disp.dispute_id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                          <span className="mono" style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                            #{disp.id || disp.dispute_id}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#ffedd5', color: '#c2410c', padding: '0.2rem 0.65rem', borderRadius: '4px' }}>
                            REASON: {disp.reason_code}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Order ID: <strong>{disp.order_id}</strong> · Payment ID: <strong>{disp.payment_id}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f97316' }}>
                          ₹{Number(disp.amount ? disp.amount / 100 : 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                          Status: {disp.status || 'OPEN'}
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem', color: '#334155' }}>
                      <strong>Customer Claim:</strong> "{disp.reason_description || disp.customer_claim || 'Customer reported non-receipt'}"
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        AI DisputeShield Intelligence Pipeline Ready
                      </div>

                      <button
                        onClick={() => navigate(`/disputes/${disp.id || disp.dispute_id}`)}
                        className="btn-primary"
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                      >
                        ⚡ Investigate with AI DisputeShield →
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: ANALYTICS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Real-Time Database Aggregated Analytics</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Order Volume Breakdown</h3>
                <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ flex: 1, backgroundColor: '#f97316', height: `${Math.min(100, (orders.length || 1) * 20)}%`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800 }}>
                    {orders.length}
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#cbd5e1', height: `${Math.min(100, (queries.length || 1) * 20)}%`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 800 }}>
                    {queries.length}
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#fdba74', height: `${Math.min(100, (disputes.length || 1) * 20)}%`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 800 }}>
                    {disputes.length}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                  <span>Orders</span>
                  <span>Queries</span>
                  <span>Disputes</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Financial Performance</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Gross Processed Amount</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>
                      ₹{Number(metrics.total_revenue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Disputed Amount at Risk</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>
                      ₹{disputes.reduce((sum, d) => sum + (d.amount ? d.amount / 100 : 0), 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
