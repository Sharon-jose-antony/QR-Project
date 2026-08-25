export function ScanzoLogo({ height = 30, className = '' }: { height?: number; className?: string }) {
  return (
    <svg
      height={height}
      viewBox="0 0 190 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      {/* S */}
      <path
        d="M23 13C23 8.5 19.5 6.5 15 6.5C9 6.5 6 10 6 14C6 20 12.5 21 17 22.5C22.5 24.5 25 27 25 31.5C25 36.5 20.5 39.5 15 39.5C8 39.5 5 35.5 5 31"
        stroke="#090D16"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* C */}
      <path
        d="M48 14C45 9 40.5 6.5 34.5 6.5C25.5 6.5 20 13.5 20 23C20 32.5 25.5 39.5 34.5 39.5C40.5 39.5 45 37 48 32"
        stroke="#090D16"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* A - Viewfinder Bracket with Green Laser Beam */}
      {/* Top Left Bracket */}
      <path
        d="M59 18V11C59 8.5 61 6.5 63.5 6.5H71"
        stroke="#10B981"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Top Right Bracket */}
      <path
        d="M85 6.5H92.5C95 6.5 97 8.5 97 11V18"
        stroke="#10B981"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Bottom Left Bracket */}
      <path
        d="M59 28V35C59 37.5 61 39.5 63.5 39.5H71"
        stroke="#10B981"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Bottom Right Bracket */}
      <path
        d="M85 39.5H92.5C95 39.5 97 37.5 97 35V28"
        stroke="#10B981"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Middle Green Laser Bar */}
      <line
        x1="64"
        y1="23"
        x2="92"
        y2="23"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* N */}
      <path
        d="M109 39.5V17C109 10.5 113.5 6.5 119.5 6.5C125.5 6.5 129 10.5 129 17V39.5"
        stroke="#090D16"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Z */}
      <path
        d="M138 7.5H153.5L138 38.5H153.5"
        stroke="#090D16"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* O with bright emerald target dot */}
      <circle
        cx="173"
        cy="23"
        r="14.5"
        stroke="#090D16"
        strokeWidth="4.5"
      />
      <circle
        cx="173"
        cy="23"
        r="5.5"
        fill="#10B981"
      />
    </svg>
  );
}

export function ScanzoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="44" rx="10" fill="#090D16" />
      {/* Top Left Bracket */}
      <path d="M10 17V12C10 10.9 10.9 10 12 10H17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* Top Right Bracket */}
      <path d="M27 10H32C33.1 10 34 10.9 34 12V17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* Bottom Left Bracket */}
      <path d="M10 27V32C10 33.1 10.9 34 12 34H17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* Bottom Right Bracket */}
      <path d="M27 34H32C33.1 34 34 33.1 34 32V27" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* Laser line */}
      <line x1="12" y1="22" x2="32" y2="22" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      {/* Radar Dot */}
      <circle cx="22" cy="22" r="3.5" fill="#10B981" />
    </svg>
  );
}
