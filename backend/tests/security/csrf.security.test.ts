/**
 * QRGuard Security Tests — CSRF & Origin Verification
 */

import request from 'supertest';
import app from '../../src/app';

describe('CSRF Defense — Origin & Referer Verification', () => {
  it('should ALLOW read-only GET requests without Origin or Referer header', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('should ALLOW state-changing POST requests with matching allowed Origin', async () => {
    const res = await request(app)
      .post('/api/url/analyze')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com' });

    expect([200, 429]).toContain(res.status);
  });

  it('should REJECT state-changing POST requests with malicious cross-site Origin (CSRF blocked)', async () => {
    const res = await request(app)
      .post('/api/url/analyze')
      .set('Origin', 'http://evil-attacker-site.com')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Cross-site request blocked: Origin mismatch');
  });

  it('should REJECT state-changing POST requests with malicious cross-site Referer', async () => {
    const res = await request(app)
      .post('/api/url/analyze')
      .set('Referer', 'http://evil-phishing-origin.com/attack.html')
      .set('Content-Type', 'application/json')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Cross-site request blocked: Referer mismatch');
  });
});
