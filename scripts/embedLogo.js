const fs = require('fs');
const path = require('path');

const imgPath = 'C:/Users/antho/.gemini/antigravity-ide/brain/4f5e1d8a-db22-4b5a-b906-13edb113667f/.user_uploaded/media_1787671406812.png';
const imgBuf = fs.readFileSync(imgPath);
const base64 = 'data:image/png;base64,' + imgBuf.toString('base64');

const code = `// Scanzo exact glowing vector/raster logo embedded as base64 data URI
// Guarantees instantaneous cache-busted rendering across all clients
export const SCANZO_LOGO_DATA_URL = "${base64}";

export function ScanzoLogo({ height = 36, className = '', alt = 'Scanzo' }: { height?: number; className?: string; alt?: string }) {
  return (
    <img
      src={SCANZO_LOGO_DATA_URL}
      alt={alt}
      height={height}
      className={\`scanzo-logo-img \${className}\`}
      style={{
        height: \`\${height}px\`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.35))',
      }}
    />
  );
}

export function ScanzoIcon({ size = 36 }: { size?: number }) {
  return (
    <img
      src={SCANZO_LOGO_DATA_URL}
      alt="Scanzo"
      width={size}
      height={size}
      style={{
        height: \`\${size}px\`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.35))',
      }}
    />
  );
}
`;

fs.writeFileSync(path.join(__dirname, '../frontend/src/components/ScanzoLogo.tsx'), code);
console.log('Successfully generated ScanzoLogo.tsx with embedded base64!');
