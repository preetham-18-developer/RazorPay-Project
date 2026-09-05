import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';

export default function CustomerAccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('freshsmart_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        navigate('/login');
      }
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('freshsmart_user');
    localStorage.removeItem('freshsmart_token');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
          Customer Account Profile
        </h1>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800, border: '2px solid #ffedd5' }}>
              👤
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{user.name || 'Customer User'}</h2>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{user.email}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: user.role === 'admin' ? '#0f172a' : '#f1f5f9', color: user.role === 'admin' ? '#ffffff' : '#334155', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.4rem' }}>
                ROLE: {user.role || 'CUSTOMER'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <Link to="/orders" style={{ textDecoration: 'none', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px', display: 'block' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📦</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>My Orders</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Track order status and history</div>
            </Link>

            <Link to="/support" style={{ textDecoration: 'none', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px', display: 'block' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Support Queries</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Submit issues and check support status</div>
            </Link>

            <Link to="/feedback" style={{ textDecoration: 'none', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px', display: 'block' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⭐</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Feedback</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Rate your delivery & product quality</div>
            </Link>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {user.role === 'admin' && (
              <Link to="/freshmart/merchant" className="btn-primary" style={{ textDecoration: 'none' }}>
                🛡 Launch Admin Risk Console
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
