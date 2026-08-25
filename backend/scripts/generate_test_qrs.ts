import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const outputDir = path.join(__dirname, '../../frontend/public/test_qrs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const testCases = [
  {
    name: 'fake_payment_quishing.png',
    url: 'http://pay-tm-verify-account.net/login.php?store=4920',
    title: 'Counterfeit Payment QR (Quishing)',
  },
  {
    name: 'fake_electricity_phishing.png',
    url: 'http://tneb-bill-update-payment.xyz/pay',
    title: 'Fake Electricity Bill Phishing',
  },
  {
    name: 'ssrf_loopback_exploit.png',
    url: 'http://127.0.0.1:3001/api/admin/users',
    title: 'SSRF Loopback Attack (127.0.0.1)',
  },
  {
    name: 'safe_github.png',
    url: 'https://github.com',
    title: 'Legitimate Safe Website',
  },
];

async function generateAll() {
  console.log('Generating test QR code images in:', outputDir);
  for (const tc of testCases) {
    const filePath = path.join(outputDir, tc.name);
    await QRCode.toFile(filePath, tc.url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    console.log(`✓ Generated ${tc.name} -> ${tc.url}`);
  }
}

generateAll().catch(err => {
  console.error('Error generating QRs:', err);
});
