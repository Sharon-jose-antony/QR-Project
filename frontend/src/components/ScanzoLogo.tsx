import scanzoLogoImg from '../assets/scanzo-logo.png';

export function ScanzoLogo({ height = 28, className = '', alt = 'Scanzo' }: { height?: number; className?: string; alt?: string }) {
  return (
    <div
      className={`scanzo-logo-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090D16',
        padding: '4px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
      }}
    >
      <img
        src={scanzoLogoImg}
        alt={alt}
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}

export function ScanzoIcon({ size = 26 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090D16',
        padding: '3px 8px',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}
    >
      <img
        src={scanzoLogoImg}
        alt="Scanzo"
        style={{
          height: `${size}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
