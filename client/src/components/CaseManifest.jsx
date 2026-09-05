import React from 'react';
import CaseRow from './CaseRow';

export default function CaseManifest({
  disputes = [],
  selectedId,
  onSelectCase,
  searchTerm,
  onSearchChange,
  filterReason,
  onFilterChange
}) {
  const reasonTypes = Array.from(new Set(disputes.map(d => d.reason_code)));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--ink-soft)', borderRight: '1px solid var(--ink-line)' }}>
      {/* Manifest Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--ink-line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="kicker">
            CASE MANIFEST
          </span>
          <span className="lbl">
            {disputes.length} ACTIVE
          </span>
        </div>

        {/* Search Field */}
        <input
          type="text"
          placeholder="Search the case ledger..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.45rem 0.75rem',
            backgroundColor: 'var(--ink)',
            border: '1px solid var(--ink-line)',
            borderRadius: '2px',
            color: 'var(--paper)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            marginBottom: '0.65rem'
          }}
        />

        {/* Reason Code Filters (Plain Mono Tags) */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          <button
            onClick={() => onFilterChange('ALL')}
            className="lbl"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: filterReason === 'ALL' ? 'var(--paper)' : 'var(--stone)',
              fontWeight: filterReason === 'ALL' ? 600 : 400
            }}
          >
            ALL
          </button>
          {reasonTypes.map(r => (
            <button
              key={r}
              onClick={() => onFilterChange(r)}
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

      {/* Scrollable Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {disputes.map((dispute) => (
          <CaseRow
            key={dispute.id}
            dispute={dispute}
            isSelected={dispute.id === selectedId}
            onClick={() => onSelectCase(dispute.id)}
          />
        ))}
      </div>
    </div>
  );
}
