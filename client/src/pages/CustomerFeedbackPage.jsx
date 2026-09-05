import React, { useState, useEffect } from 'react';
import FreshMartHeader from '../components/FreshMartHeader';

export default function CustomerFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, []);

  async function fetchFeedback() {
    try {
      const res = await fetch('/freshmart/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText) return;
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/freshmart/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'cust_fm_demo_user',
          customer_name: 'Preetham Kumar',
          rating: Number(rating),
          feedback_text: feedbackText,
          order_id: orderId || null
        })
      });

      if (res.ok) {
        setFeedbackText('');
        setOrderId('');
        setSuccessMsg('Thank you for rating your FreshSmart experience!');
        fetchFeedback();
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

      <main style={{ maxWidth: '850px', margin: '2.5rem auto', padding: '0 2rem 4rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Customer Ratings & Feedback</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Rate your product quality, delivery speed, and overall supermarket service</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Submit Rating Form */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>Rate Your Experience</h2>

            {successMsg && (
              <div style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ✓ {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Rating (1 - 5 Stars)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        backgroundColor: rating >= star ? '#fff7ed' : '#f1f5f9',
                        border: rating >= star ? '1px solid #fdba74' : '1px solid #cbd5e1',
                        color: rating >= star ? '#f97316' : '#64748b',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        fontWeight: 800
                      }}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
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
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Your Review</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts on produce freshfulness or delivery..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              >
                {submitting ? 'Submitting...' : 'Submit Review ★'}
              </button>
            </form>
          </div>

          {/* Feedback List */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>Recent Community Reviews</h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading feedback...</div>
            ) : feedbackList.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>No feedback submitted yet</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Be the first customer to rate FreshSmart!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedbackList.map(fb => (
                  <div key={fb.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{fb.customer_name}</span>
                      <span style={{ color: '#f97316', fontWeight: 800, fontSize: '0.9rem' }}>
                        {'★'.repeat(fb.rating)} ({fb.rating}/5)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>"{fb.feedback_text}"</p>
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
