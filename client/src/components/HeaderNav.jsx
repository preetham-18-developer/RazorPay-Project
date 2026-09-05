import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIntegrationStatus } from '../api/disputes';

export default function HeaderNav() {
  const [timeStr, setTimeStr] = useState('');
  const [systemMode, setSystemMode] = useState('simulation');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
      setTimeStr(now.toLocaleDateString('en-US', options).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const fetchStatus = async () => {
      const status = await getIntegrationStatus();
      setSystemMode(status.mode || 'simulation');
      setIsConfigured(Boolean(status.razorpay_configured));
    };
    fetchStatus();

    return () => clearInterval(interval);
  }, []);

  const isConnected = systemMode === 'connected';

  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 2.25rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left: Brand Logo & Navigation Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/disputes" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontWeight: 800, fontSize: '1.1rem' }}>
              🛡️
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#0f172a', display: 'block' }}>
                Dispute<span style={{ color: '#f97316' }}>Shield</span> <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Engine</span>
              </span>
            </div>
          </Link>

          <Link to="/" style={{ textDecoration: 'none', color: '#ea580c', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.25rem 0.65rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🛒</span> Back to FreshMart Storefront
          </Link>
        </div>

        {/* Right: Operational Status & System Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: isConnected ? '#f0fdf4' : '#fff7ed', border: `1px solid ${isConnected ? '#bbf7d0' : '#ffedd5'}`, padding: '0.25rem 0.65rem', borderRadius: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isConnected ? '#16a34a' : '#ea580c' }} />
            <span className="mono" style={{ color: isConnected ? '#15803d' : '#c2410c', fontWeight: 700, fontSize: '0.65rem' }}>
              {isConnected ? 'RAZORPAY CONNECTED MODE' : 'LIVE TRANSACTION INVESTIGATION ENGINE'}
            </span>
          </div>

          <span className="mono" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
            {timeStr}
          </span>
        </div>
      </div>
    </header>
  );
}

