import React from 'react';

const iconShapes = {
  case: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 10h8M8 15h2m3 0h2m3 0h1" />
    </>
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" />
    </>
  ),
  motherboard: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <rect x="7" y="6" width="6" height="6" />
      <path d="M16 7h1m-1 3h1m-9 5v3m4-3v3m3-1h2" />
    </>
  ),
  gpu: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="9" cy="12" r="3" />
      <circle cx="16" cy="12" r="2" />
      <path d="M6 18v2m12-2v2M3 10H1" />
    </>
  ),
  ram: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M6 8v5m3-5v5m3-5v5m3-5v5m3-5v5M6 16v2m4-2v2m4-2v2m4-2v2" />
    </>
  ),
  storage: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M6 9h4M6 12h4M6 15h4" />
    </>
  ),
  psu: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="10" cy="12" r="4" />
      <path d="M10 9v3l2 1m5-3h2m-2 3h2" />
    </>
  ),
  cooler: (
    <>
      <path d="M8 3h8v3l-1 2v9l1 2v2H8v-2l1-2V8L8 6z" />
      <path d="M8 9h8m-7 3h6m-6 3h6" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
};

export default function PartIcon({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`icon-svg ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
    >
      {iconShapes[name] || iconShapes.case}
    </svg>
  );
}
