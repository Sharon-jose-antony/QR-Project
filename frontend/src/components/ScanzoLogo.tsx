import scanzoLogoImg from '../assets/scanzo-logo.png';

export function ScanzoLogo({ height = 36, className = '', alt = 'Scanzo' }: { height?: number; className?: string; alt?: string }) {
  return (
    <img
      src={scanzoLogoImg}
      alt={alt}
      height={height}
      className={`scanzo-logo-img ${className}`}
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.25))',
        transition: 'transform 0.2s ease',
      }}
    />
  );
}

export function ScanzoIcon({ size = 36 }: { size?: number }) {
  return (
    <img
      src={scanzoLogoImg}
      alt="Scanzo"
      width={size}
      height={size}
      style={{
        height: `${size}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.25))',
      }}
    />
  );
}
