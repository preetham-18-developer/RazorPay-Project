import React, { useState, useEffect } from 'react';
import FreshMartHeader from '../components/FreshMartHeader';

export default function CustomerSupportPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Non-Receipt');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchQueries();
  }, []);

  async function fetchQueries() {
    try {
      const res = await fetch('/freshmart/support/queries?user_id=cust_fm_demo_user');
      if (res.ok) {
        const data = await res.json();
        setQueries(data);
      }
    } catch (err) {
      console.error("Failed to fetch queries:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/freshmart/support/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'cust_fm_demo_user',
          customer_name: 'Preetham Kumar',
          customer_email: 'customer@freshsmart.com',
          subject,
          message,
          category,
          order_id: orderId || null
        })
      });

      if (res.ok) {
        setSubject('');
        setMessage('');
        setOrderId('');
        setSuccessMsg('Support ticket submitted successfully!');
        fetchQueries();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '900px', margin: '2.5rem auto', padding: '0 2rem 4rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Customer Support & Enquiries</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Submit a ticket for order issues, delivery tracking, or refund assistance</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Submit Query Form */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>Submit New Ticket</h2>

            {successMsg && (
              <div style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ✓ {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="Non-Receipt">Did not receive order</option>
                  <option value="Wrong Item">Received wrong product</option>
                  <option value="Missing Item">Missing item in parcel</option>
                  <option value="Payment / Refund">Payment / Refund query</option>
                  <option value="General">General Enquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Order ID (Optional)</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORDER_FM_1788599..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              >
                {submitting ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>

          {/* Ticket History */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>My Ticket History</h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading tickets...</div>
            ) : queries.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>No customer queries yet</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Your submitted tickets will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queries.map(q => (
                  <div key={q.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>{q.category}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: q.status === 'RESOLVED' ? '#dcfce7' : '#fef3c7', color: q.status === 'RESOLVED' ? '#15803d' : '#b45309', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        {q.status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>{q.subject}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>{q.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
