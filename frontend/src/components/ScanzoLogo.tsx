import scanzoLogoImg from '../assets/scanzo-logo.png';

export function ScanzoLogo({ height = 32, className = '', alt = 'Scanzo' }: { height?: number; className?: string; alt?: string }) {
  return (
    <img
      src={scanzoLogoImg}
      alt={alt}
      height={height}
      className={className}
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

export function ScanzoIcon({ size = 32 }: { size?: number }) {
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
        mixBlendMode: 'multiply',
      }}
    />
  );
}
