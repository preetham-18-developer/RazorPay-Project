import React, { useState, useEffect } from 'react';
import { getDisputes, getAllReviewStates } from '../api/disputes';
import HeaderNav from '../components/HeaderNav';
import CaseCard from '../components/CaseCard';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [reviewMap, setReviewMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('ALL');
  const [activeReviewFilter, setActiveReviewFilter] = useState('all');

  useEffect(() => {
    const fetchDisputesList = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDisputes();
        setDisputes(data);

        // Fetch persisted review states for live panel counts
        const ids = data.map(d => d.id);
        const rMap = await getAllReviewStates(ids);
        setReviewMap(rMap);
      } catch (err) {
        setError(err.message || 'Failed to connect to DisputeShield backend service.');
      } finally {
        setLoading(false);
      }
    };
    fetchDisputesList();
  }, []);

  const reasonTypes = Array.from(new Set(disputes.map(d => d.reason_code)));

  // Calculate live counts from persisted backend review states
  let countPending = 0;
  let countApproved = 0;
  let countChanges = 0;
  let countRejected = 0;

  disputes.forEach(d => {
    const status = reviewMap[d.id]?.status || 'pending_review';
    if (status === 'approved') countApproved++;
    else if (status === 'changes_requested') countChanges++;
    else if (status === 'rejected') countRejected++;
    else countPending++;
  });

  const filteredDisputes = disputes.filter(d => {
    const status = reviewMap[d.id]?.status || 'pending_review';

    const matchesSearch = d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.reason_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.reason_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesReason = filterReason === 'ALL' || d.reason_code === filterReason;

    let matchesReview = true;
    if (activeReviewFilter === 'pending_review') matchesReview = (status === 'pending_review');
    else if (activeReviewFilter === 'approved') matchesReview = (status === 'approved');
    else if (activeReviewFilter === 'changes_requested') matchesReview = (status === 'changes_requested');
    else if (activeReviewFilter === 'rejected') matchesReview = (status === 'rejected');

    return matchesSearch && matchesReason && matchesReview;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--ink)' }}>
      <HeaderNav />

      {/* Main Workspace Container */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Workspace Title Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1.25rem' }}>
          <div>
            <span className="lbl" style={{ color: 'var(--stone)', display: 'block', marginBottom: '0.25rem' }}>
              CASE SELECTION WORKSPACE
            </span>
            <h1 className="case-title" style={{ fontSize: '1.85rem' }}>
              Which dispute do you want to investigate?
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div>
              <span className="lbl" style={{ display: 'block' }}>TOTAL DISPUTES</span>
              <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--paper)' }}>
                {disputes.length}
              </span>
            </div>
            <div>
              <span className="lbl" style={{ display: 'block' }}>MATCHING MANIFEST</span>
              <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gold)' }}>
                {filteredDisputes.length}
              </span>
            </div>
          </div>
        </div>

        {/* REVIEW WORKFLOW PANELS (Live Persisted Backend Review State Sourcing) */}
        <div style={{ backgroundColor: 'var(--ink-soft)', border: '1px solid var(--ink-line)', borderRadius: '2px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span className="lbl" style={{ color: 'var(--paper)' }}>REVIEW WORKFLOW</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--stone-light)' }}>
              Track every defence from human review to final authorisation.
            </span>
          </div>

          {/* 5 Operational Filter Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
            {/* ALL CASES */}
            <div
              onClick={() => setActiveReviewFilter('all')}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid var(--ink-line)',
                borderBottom: activeReviewFilter === 'all' ? '2px solid var(--paper)' : '1px solid var(--ink-line)',
                backgroundColor: activeReviewFilter === 'all' ? 'rgba(246, 241, 231, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: activeReviewFilter === 'all' ? 'var(--paper)' : 'var(--stone)' }}>
                ALL CASES
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--paper)' }}>
                {disputes.length}
              </span>
            </div>

            {/* PENDING REVIEW */}
            <div
              onClick={() => setActiveReviewFilter('pending_review')}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid var(--ink-line)',
                borderBottom: activeReviewFilter === 'pending_review' ? '2px solid var(--stone-light)' : '1px solid var(--ink-line)',
                backgroundColor: activeReviewFilter === 'pending_review' ? 'rgba(246, 241, 231, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: activeReviewFilter === 'pending_review' ? 'var(--paper)' : 'var(--stone)' }}>
                PENDING REVIEW
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--stone-light)' }}>
                {countPending}
              </span>
            </div>

            {/* APPROVED */}
            <div
              onClick={() => setActiveReviewFilter('approved')}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid var(--ink-line)',
                borderBottom: activeReviewFilter === 'approved' ? '2px solid var(--moss-bright)' : '1px solid var(--ink-line)',
                backgroundColor: activeReviewFilter === 'approved' ? 'rgba(75, 99, 80, 0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: activeReviewFilter === 'approved' ? 'var(--moss-bright)' : 'var(--stone)' }}>
                APPROVED
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--moss-bright)' }}>
                {countApproved}
              </span>
            </div>

            {/* CHANGES REQUESTED */}
            <div
              onClick={() => setActiveReviewFilter('changes_requested')}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid var(--ink-line)',
                borderBottom: activeReviewFilter === 'changes_requested' ? '2px solid var(--gold)' : '1px solid var(--ink-line)',
                backgroundColor: activeReviewFilter === 'changes_requested' ? 'rgba(185, 139, 62, 0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: activeReviewFilter === 'changes_requested' ? 'var(--gold)' : 'var(--stone)' }}>
                CHANGES REQUESTED
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--gold)' }}>
                {countChanges}
              </span>
            </div>

            {/* REJECTED */}
            <div
              onClick={() => setActiveReviewFilter('rejected')}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid var(--ink-line)',
                borderBottom: activeReviewFilter === 'rejected' ? '2px solid var(--ember-bright)' : '1px solid var(--ink-line)',
                backgroundColor: activeReviewFilter === 'rejected' ? 'rgba(196, 67, 43, 0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span className="lbl" style={{ display: 'block', marginBottom: '0.2rem', color: activeReviewFilter === 'rejected' ? 'var(--ember-bright)' : 'var(--stone)' }}>
                REJECTED
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--ember-bright)' }}>
                {countRejected}
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Search Bar & Reason Code Filter Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <input
              type="text"
              placeholder="Search case ledger by ID, reason, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 2rem 0.5rem 0.85rem',
                backgroundColor: 'var(--ink-soft)',
                border: '1px solid var(--ink-line)',
                borderRadius: '2px',
                color: 'var(--paper)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Clear search term"
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--stone)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            <button
              onClick={() => setFilterReason('ALL')}
              className="lbl"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: filterReason === 'ALL' ? 'var(--paper)' : 'var(--stone)',
                fontWeight: filterReason === 'ALL' ? 600 : 400
              }}
            >
              ALL REASONS
            </button>
            {reasonTypes.map(r => (
              <button
                key={r}
                onClick={() => setFilterReason(r)}
                className="lbl"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: filterReason === r ? 'var(--paper)' : 'var(--stone)',
                  fontWeight: filterReason === r ? 600 : 400,
                  whiteSpace: 'nowrap'
                }}
              >
                {r.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div style={{ padding: '1rem', border: '1px solid var(--ember)', borderRadius: '2px' }}>
            <span className="lbl" style={{ color: 'var(--ember-bright)' }}>BACKEND SERVICE NOTICE:</span>
            <p style={{ color: 'var(--stone-light)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <span className="lbl">LOADING CASE LEDGER MANIFEST & REVIEW STATES...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          /* Editorial Empty State */
          <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--ink-soft)', border: '1px solid var(--ink-line)', borderRadius: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div>
              <span className="lbl" style={{ color: 'var(--stone-light)', display: 'block', marginBottom: '0.5rem' }}>
                NO {activeReviewFilter.toUpperCase().replace(/_/g, ' ')} CASES FOUND
              </span>
              <p className="prose-readable" style={{ margin: '0 auto', maxWidth: '500px' }}>
                No defence responses match the selected operational review filter and search criteria.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterReason('ALL');
                setActiveReviewFilter('all');
              }}
              className="btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              RESET ALL FILTERS & SEARCH →
            </button>
          </div>
        ) : (
          /* Grid of Dispute Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredDisputes.map(dispute => (
              <CaseCard key={dispute.id} dispute={dispute} reviewStatus={reviewMap[dispute.id]?.status} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
