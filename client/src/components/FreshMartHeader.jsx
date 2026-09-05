import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function FreshMartHeader({ cartCount = 0, onOpenCart, paymentMode = 'RAZORPAY_TEST' }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('freshsmart_user');
        setCurrentUser(stored ? JSON.parse(stored) : null);
      } catch (e) {
        setCurrentUser(null);
      }
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('auth_state_changed', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('auth_state_changed', syncUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('freshsmart_user');
    localStorage.removeItem('freshsmart_token');
    setCurrentUser(null);
    window.dispatchEvent(new Event('auth_state_changed'));
    navigate('/login');
  };

  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(249, 115, 22, 0.25)' }}>
            🍊
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Fresh<span style={{ color: '#f97316' }}>Smart</span>
            </span>
            <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', letterSpacing: '0.06em' }}>
              Fresh Groceries • Fast Delivery
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 600 }}>
            Home
          </Link>
          <Link to="/products" style={{ textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 600 }}>
            Shop
          </Link>
          {currentUser ? (
            <Link to="/orders" style={{ textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 600 }}>
              My Orders
            </Link>
          ) : (
            <Link to="/login?redirect=/orders" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
              My Orders
            </Link>
          )}
          <Link to="/support" style={{ textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
            Support
          </Link>
          <Link to="/feedback" style={{ textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
            Feedback
          </Link>
        </nav>

        {/* Right Section Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Cart Button */}
          <Link
            to="/cart"
            style={{
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(249, 115, 22, 0.2)'
            }}
          >
            <span>🛒 Cart</span>
            <span style={{ backgroundColor: '#ffffff', color: '#ea580c', borderRadius: '50%', padding: '0.05rem 0.45rem', fontSize: '0.75rem', fontWeight: 800 }}>
              {cartCount}
            </span>
          </Link>

          {/* Account / Login */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Link to="/account" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.85rem', backgroundColor: '#f1f5f9', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                👤 {currentUser.name || 'Account'}
              </Link>
              {currentUser.role === 'admin' && (
                <Link to="/admin" style={{ textDecoration: 'none', color: '#ffffff', backgroundColor: '#0f172a', padding: '0.4rem 0.75rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                  🛡 Admin Console
                </Link>
              )}
              <button
                onClick={handleLogout}
                style={{ backgroundColor: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.4rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                Sign In
              </Link>
              <Link to="/signup" style={{ textDecoration: 'none', color: '#ffffff', backgroundColor: '#f97316', fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
                Create Account
              </Link>
              <Link to="/admin" style={{ textDecoration: 'none', color: '#475569', fontWeight: 600, fontSize: '0.8rem', padding: '0.4rem 0.65rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


