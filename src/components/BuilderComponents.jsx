import React, { useEffect, useRef } from 'react';
import { formatMoney, POWER_BAR_MAX_WATTS } from '../constants.js';
import PartIcon from './PartIcon.jsx';

function getSafeBuyUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function ComponentSlot({
  category,
  label,
  product,
  locked,
  incompatible,
  buyUrl,
  currency,
  onOpen,
}) {
  const isRequiredCase = category === 'case' && !product;
  const slotClassName = [
    'slot',
    isRequiredCase && 'required-case',
    locked && 'locked',
    incompatible && 'incompatible',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={slotClassName}>
      <div className="label">
        <PartIcon name={category} />
        <span>{label}</span>
        {isRequiredCase && <span className="required-tag">Required first</span>}
        {locked && <span className="lock-tag">Locked</span>}
      </div>
      <div className={`part ${product ? '' : 'empty'}`}>
        <span className="glyph">
          <PartIcon name={product ? category : 'add'} />
        </span>
        <div className="part-copy">
          <div className="name">{product?.name || 'Choose a component'}</div>
          <div className="spec">
            {product?.specs ||
              (locked ? 'Choose a case first to unlock this slot.' : 'Browse available parts')}
          </div>
        </div>
        {product && <span className="price">{formatMoney(product.price, currency)}</span>}
        {product && buyUrl && (
          <a className="shop-link" href={buyUrl} target="_blank" rel="noreferrer">
            Shop ↗
          </a>
        )}
        <button
          type="button"
          disabled={locked}
          title={locked ? 'Select a case first' : undefined}
          onClick={() => onOpen(category)}
        >
          {product ? 'Change' : isRequiredCase ? 'Choose case' : 'Select'}
        </button>
      </div>
    </div>
  );
}

export function ComponentList({
  categories,
  selectedParts,
  invalidSlots,
  hasCase,
  checkedParts,
  currency,
  onOpen,
}) {
  return (
    <section className="panel component-panel" aria-labelledby="components-heading">
      <div className="head">
        <span id="components-heading">Components</span>
        <small>{selectedParts.length} / 8 selected</small>
      </div>
      <div className={`build-step ${hasCase ? 'complete' : 'start'}`}>
        <span className="step-number">{hasCase ? '✓' : '01'}</span>
        <div>
          <b>{hasCase ? 'Case selected' : 'Start with your case'}</b>
          <small>
            {hasCase
              ? 'Now add components; fit checks run as you build.'
              : 'Required first so we can check size, clearance and compatibility.'}
          </small>
        </div>
        <span className="step-state">{hasCase ? 'Ready' : 'Required'}</span>
      </div>
      <div className="component-slots">
        {categories.map(({ id, label }) => {
          const product = selectedParts.find((item) => item.category === id);
          const checkedPart = checkedParts.find(
            (item) => String(item.productId) === String(product?.id),
          );
          return (
            <ComponentSlot
              key={id}
              category={id}
              label={label}
              product={product}
              locked={id !== 'case' && !hasCase}
              incompatible={invalidSlots.has(id)}
              buyUrl={getSafeBuyUrl(checkedPart?.buyUrl)}
              currency={currency}
              onOpen={onOpen}
            />
          );
        })}
      </div>
    </section>
  );
}

export function BuildSummary({
  canvasRef,
  preview,
  selectedParts,
  total,
  setupFee,
  currency,
  power,
  recommendedPsu,
  compatibility,
  checkError,
}) {
  const issues = compatibility?.warnings || [];
  const powerPercent = Math.min(100, (power / POWER_BAR_MAX_WATTS) * 100);
  const hasIssues = issues.length > 0 || Boolean(checkError);
  const statusText = checkError
    ? checkError
    : !selectedParts.length
      ? 'Choose parts to start your build.'
      : !compatibility
        ? 'Checking compatibility…'
        : hasIssues
          ? issues[0] || 'Compatibility issues found.'
          : 'All selected parts are compatible.';

  return (
    <aside className={`panel summary ${hasIssues ? 'incompatible' : ''}`}>
      <div className="head">
        <span>Your build</span>
        <small>Live preview</small>
      </div>
      <div className="preview">
        <canvas id="pc-preview-canvas" ref={canvasRef} aria-label="Interactive 3D case preview" />
        {preview.status !== 'ready' && (
          <div
            className={`preview-loading ${preview.status === 'loading' ? 'is-loading' : ''}`}
            role="status"
            aria-live="polite"
          >
            {preview.message}
          </div>
        )}
      </div>
      <div className={`status ${hasIssues ? 'warn' : ''}`} role="status" aria-live="polite">
        {hasIssues ? '⚠　' : compatibility ? '✓　' : '◌　'}
        {statusText}
      </div>
      <div className="totals">
        <div className="row">
          Components <b>{formatMoney(total, currency)}</b>
        </div>
        <div className="row">
          Build &amp; setup <b>{formatMoney(setupFee, currency)}</b>
        </div>
        <div className="row grand">
          Total <b>{formatMoney(total + setupFee, currency)}</b>
        </div>
      </div>
      <div className="metric">
        <div className="metricline">
          Estimated power draw <b>≈ {power} W</b>
        </div>
        <div className="bar" aria-label={`Estimated power draw: ${power} watts`}>
          <i style={{ width: `${powerPercent}%` }} />
        </div>
        Recommended PSU: <b>{recommendedPsu ? `${recommendedPsu} W` : 'Not selected'}</b>
      </div>
      <div className="note">
        {issues.length
          ? issues.join(' · ')
          : 'Compatibility is checked against the local component catalog.'}
      </div>
    </aside>
  );
}

export function ComponentPicker({
  category,
  options,
  loading,
  query,
  sortOrder,
  onQueryChange,
  onSortChange,
  onChoose,
  onClose,
  currency,
  error,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const title = category.label;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]';
    const focusableElements = () => [...dialog.querySelectorAll(focusableSelector)];

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusableElements();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  return (
    <div
      className="backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="component-picker-title"
      >
        <div className="modalhead">
          <h2 id="component-picker-title">Choose {title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn"
            aria-label="Close component picker"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="picker-tools">
          <label className="visually-hidden" htmlFor="component-search">
            Search components
          </label>
          <input
            id="component-search"
            type="search"
            value={query}
            placeholder="Search components…"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="component-sort">
            Sort components
          </label>
          <select
            id="component-sort"
            value={sortOrder}
            onChange={(event) => onSortChange(event.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="options" aria-busy={loading}>
          {loading ? (
            <p className="loading" role="status">
              Loading component options…
            </p>
          ) : options.length ? (
            options.map((product) => (
              <button
                key={product.id}
                type="button"
                className="option"
                onClick={() => onChoose(product.id)}
              >
                <span className="glyph">
                  <PartIcon name={product.category} />
                </span>
                <span className="optcopy">
                  <span className="optname">
                    {product.name}
                    {product.badge && <small>{product.badge}</small>}
                  </span>
                  <span className="optspec">{product.specs}</span>
                </span>
                <span className="optprice">{formatMoney(product.price, currency)}</span>
              </button>
            ))
          ) : (
            <p className="loading">No matching components found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
