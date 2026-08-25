const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:/Users/antho/.gemini/antigravity-ide/brain/4f5e1d8a-db22-4b5a-b906-13edb113667f/.user_uploaded/media_1787671406812.png';

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];
        const a = this.data[idx + 3];

        if (a === 0) continue;

        // Check if pixel is part of the green viewfinder / radar dot / flare
        const isGreen = g > 100 && (g > r * 1.15 || (g > 180 && r < 160 && b < 160));

        if (isGreen) {
          // Keep vibrant emerald green intact!
          continue;
        }

        // White / light grey typography letters ('sc' and 'nzo')
        // Invert to obsidian black (#090D16) while preserving antialiased alpha
        if (r > 100 && g > 100 && b > 100) {
          this.data[idx] = 9;      // R: #09
          this.data[idx + 1] = 13; // G: #0D
          this.data[idx + 2] = 22; // B: #16
          // Keep alpha 'a' unchanged for crisp anti-aliasing
        }
      }
    }

    const outBuf = PNG.sync.write(this);
    const publicPath = path.join(__dirname, '../frontend/public/scanzo-logo.png');
    const assetsPath = path.join(__dirname, '../frontend/src/assets/scanzo-logo.png');
    fs.writeFileSync(publicPath, outBuf);
    fs.writeFileSync(assetsPath, outBuf);

    // Generate base64 data URI
    const base64 = 'data:image/png;base64,' + outBuf.toString('base64');
    const compCode = `// Scanzo exact crisp dark-text + vibrant green viewfinder logo
// Embedded as Base64 data URI to guarantee instant rendering & zero caching issues
export const SCANZO_LOGO_DATA_URL = "${base64}";

export function ScanzoLogo({ height = 34, className = '', alt = 'Scanzo' }: { height?: number; className?: string; alt?: string }) {
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
      }}
    />
  );
}

export function ScanzoIcon({ size = 34 }: { size?: number }) {
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
      }}
    />
  );
}
`;

    fs.writeFileSync(path.join(__dirname, '../frontend/src/components/ScanzoLogo.tsx'), compCode);
    console.log('Processed Scanzo logo with obsidian black letters & vibrant green scanner successfully!');
  });
