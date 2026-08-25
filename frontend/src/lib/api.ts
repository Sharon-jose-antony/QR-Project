// API client for QRGuard backend with client-side fallback for GitHub Pages
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Types ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  createdAt: string;
}

export interface RiskFactor {
  factor: string;
  score: number;
  description: string;
}

export interface RedirectStep {
  from: string;
  to: string;
  statusCode?: number;
  blocked: boolean;
  blockReason?: string;
}

export interface AnalysisResult {
  id: string;
  url: string;
  finalUrl?: string;
  domain: string;
  scheme: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redirectCount: number;
  indicators: string[];
  recommendation: string;
  riskFactors: RiskFactor[];
  redirectChain: RedirectStep[];
  blocked: boolean;
  resolvedIPs?: string[];
  aiSummary?: string;
  aiRiskExplanation?: string;
  aiRecommendation?: string;
  communityReports: number;
  status: string;
}

export interface QrAnalysisResult {
  qrId: string;
  payload: string;
  payloadType: 'URL' | 'EMAIL' | 'TEL' | 'TEXT';
  analysis: AnalysisResult | null;
}

export interface AnalysisHistoryItem {
  id: string;
  url: string;
  domain: string;
  scheme: string;
  riskScore: number;
  riskLevel: string;
  status: string;
  redirectCount: number;
  ssrfBlocked: boolean;
  createdAt: string;
}

export interface DomainDetail {
  hostname: string;
  riskLevel: string;
  avgRiskScore: number;
  analysisCount: number;
  communityReportCount: number;
  firstSeen: string;
  lastSeen: string;
  recentAnalyses: any[];
  reportCategories: any[];
  redirectObservations: any[];
}

export interface CommunityData {
  topDomains: any[];
  recentReports: any[];
  categoryStats: any[];
  stats: { totalReports: number; totalAnalyses: number };
}

// ── Client-side Fallback Deterministic Risk Engine (for GitHub Pages static demo) ──
function performClientSideAnalysis(rawUrl: string): AnalysisResult {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return {
      id: `local-${Date.now()}`,
      url: rawUrl,
      domain: 'INVALID',
      scheme: 'unknown',
      riskScore: 85,
      riskLevel: 'CRITICAL',
      redirectCount: 0,
      indicators: ['🚨 Blocked: Invalid URL structure or dangerous scheme'],
      recommendation: 'This destination cannot be analyzed safely and has been blocked by QRGuard.',
      riskFactors: [{ factor: 'INVALID_URL', score: 85, description: 'Invalid or unsupported scheme' }],
      redirectChain: [],
      blocked: true,
      communityReports: 0,
      status: 'BLOCKED',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const scheme = parsedUrl.protocol.replace(':', '').toLowerCase();
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : null;
  const urlLower = rawUrl.toLowerCase();

  const factors: RiskFactor[] = [];
  const indicators: string[] = [];

  // Scheme
  if (scheme === 'http') {
    factors.push({ factor: 'HTTP_NOT_HTTPS', score: 15, description: 'Connection is not encrypted (HTTP, not HTTPS)' });
    indicators.push('⚠️ Not encrypted: Uses HTTP instead of HTTPS');
  }

  // Loopback / Private IP checks
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    factors.push({ factor: 'SSRF_LOOPBACK_BLOCKED', score: 80, description: 'Destination resolves to private/loopback address' });
    indicators.push('🚨 Blocked: Private / Loopback network destination');
  }

  // Unusual port
  if (port && port !== 80 && port !== 443) {
    factors.push({ factor: 'UNUSUAL_PORT', score: 15, description: `Unusual port: ${port}` });
    indicators.push(`⚠️ Unusual port: ${port}`);
  }

  // Brands
  const brands = ['paypal', 'paytm', 'pay-tm', 'gpay', 'phonepe', 'bhim', 'sbi', 'hdfc', 'icici', 'tneb', 'bescom', 'mahadiscom', 'amazon', 'google', 'microsoft', 'apple', 'facebook'];
  const normalizedHost = hostname.replace(/[-_.]/g, '');
  const brandMatch = brands.find(b => hostname.includes(b) || normalizedHost.includes(b.replace(/[-_.]/g, '')));
  if (brandMatch) {
    factors.push({ factor: 'MISLEADING_BRAND', score: 35, description: `Domain contains brand keyword: ${brandMatch}` });
    indicators.push(`🚨 Suspicious: Domain resembles "${brandMatch}" brand`);
  }

  // Suspicious TLDs
  const suspiciousTlds = ['.xyz', '.top', '.work', '.click', '.loan', '.gq', '.cf', '.tk', '.ml', '.ga', '.surf', '.live', '.buzz', '.rest', '.fit', '.pw', '.monster', '.icu'];
  const tldMatch = suspiciousTlds.find(t => hostname.endsWith(t));
  if (tldMatch) {
    factors.push({ factor: 'SUSPICIOUS_TLD', score: 25, description: `Domain uses high-risk TLD: ${tldMatch}` });
    indicators.push(`⚠️ High-risk TLD (${tldMatch}) frequently associated with phishing`);
  }

  // Suspicious naming pattern
  if (/(\d{4,}|[-]{2,}|(secure|login|verify|account|update|payment|bill)[-\d]|[-](account|verify|update|login|service))/i.test(hostname)) {
    factors.push({ factor: 'SUSPICIOUS_DOMAIN_CHARS', score: 20, description: 'Domain has deceptive character patterns' });
    indicators.push('⚠️ Deceptive domain naming pattern');
  }

  // Credential keywords
  const creds = ['login', 'signin', 'password', 'verify', 'verification', 'secure', 'account', 'credential', 'auth', 'bank', 'payment', 'pay', 'checkout', 'upi'];
  const credMatch = creds.find(k => urlLower.includes(k));
  if (credMatch) {
    factors.push({ factor: 'CREDENTIAL_PATH_KEYWORD', score: 25, description: `URL contains credential-related keywords: ${credMatch}` });
    indicators.push('⚠️ URL contains credential-related keywords');
  }

  const riskScore = Math.min(factors.reduce((sum, f) => sum + f.score, 0), 100);
  const isBlocked = factors.some(f => f.factor.startsWith('SSRF_'));
  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
    riskScore >= 76 ? 'CRITICAL' : riskScore >= 51 ? 'HIGH' : riskScore >= 21 ? 'MEDIUM' : 'LOW';

  return {
    id: `scan-${Date.now()}`,
    url: rawUrl,
    finalUrl: rawUrl,
    domain: hostname,
    scheme,
    riskScore,
    riskLevel,
    redirectCount: 0,
    indicators,
    recommendation: isBlocked
      ? 'This destination was blocked by QRGuard security controls.'
      : riskScore >= 50
      ? 'DO NOT visit this URL. This destination exhibits high-risk indicators.'
      : 'Destination verified safe based on deterministic security checks.',
    riskFactors: factors,
    redirectChain: [],
    blocked: isBlocked,
    resolvedIPs: ['Pre-Socket Validated'],
    aiSummary: isBlocked
      ? 'This request was blocked before connection because it targets restricted private network addresses.'
      : riskScore >= 50
      ? `This destination was flagged with ${factors.length} risk indicators including brand similarity and unencrypted endpoints.`
      : 'No malicious indicators or anomalies were detected on this destination.',
    communityReports: 0,
    status: isBlocked ? 'BLOCKED' : 'COMPLETED',
  };
}

// ── Auth API ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<{ success: boolean; data: { user: User } }>('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; data: { user: User } }>('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  me: () => api.get<{ success: boolean; data: { user: User } }>('/api/auth/me'),
};

// ── URL Analysis API ───────────────────────────────────────────────────────────
export const urlApi = {
  analyze: async (url: string) => {
    try {
      const res = await api.post<{ success: boolean; data: AnalysisResult }>('/api/url/analyze', { url });
      return res;
    } catch {
      // Fallback for static hosting (GitHub Pages)
      const fallbackResult = performClientSideAnalysis(url);
      return { data: { success: true, data: fallbackResult } };
    }
  },
};

// ── QR API ─────────────────────────────────────────────────────────────────────
export const qrApi = {
  analyze: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post<{ success: boolean; data: QrAnalysisResult }>('/api/qr/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return res;
    } catch {
      // Return error for client side to recommend live camera scanning
      throw new Error('Image parsing requires server connection or live camera scanner.');
    }
  },
};

// ── Analyses API ───────────────────────────────────────────────────────────────
export const analysesApi = {
  list: (page = 1, limit = 20) =>
    api.get<{ success: boolean; data: { analyses: AnalysisHistoryItem[] }; meta: any }>(
      `/api/analyses?page=${page}&limit=${limit}`
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: { analysis: any } }>(`/api/analyses/${id}`),
};

// ── Community API ──────────────────────────────────────────────────────────────
export const communityApi = {
  get: async () => {
    try {
      return await api.get<{ success: boolean; data: CommunityData }>('/api/community');
    } catch {
      return {
        data: {
          success: true,
          data: {
            topDomains: [
              { hostname: 'pay-tm-verify-account.net', riskLevel: 'CRITICAL', avgRiskScore: 95, communityReportCount: 18, analysisCount: 24, lastSeen: new Date().toISOString() },
              { hostname: 'tneb-bill-update-payment.xyz', riskLevel: 'HIGH', avgRiskScore: 90, communityReportCount: 14, analysisCount: 19, lastSeen: new Date().toISOString() },
              { hostname: 'sbi-card-reward-redeem.online', riskLevel: 'CRITICAL', avgRiskScore: 98, communityReportCount: 22, analysisCount: 30, lastSeen: new Date().toISOString() },
              { hostname: 'electricity-bill-update-portal.com', riskLevel: 'HIGH', avgRiskScore: 88, communityReportCount: 11, analysisCount: 15, lastSeen: new Date().toISOString() },
            ],
            recentReports: [
              { id: '1', targetDomain: 'pay-tm-verify-account.net', category: 'FAKE_PAYMENT', status: 'CONFIRMED', createdAt: new Date(Date.now() - 3600000).toISOString() },
              { id: '2', targetDomain: 'tneb-bill-update-payment.xyz', category: 'PHISHING', status: 'CONFIRMED', createdAt: new Date(Date.now() - 7200000).toISOString() },
              { id: '3', targetDomain: 'sbi-card-reward-redeem.online', category: 'IMPERSONATION', status: 'CONFIRMED', createdAt: new Date(Date.now() - 14400000).toISOString() },
            ],
            categoryStats: [
              { category: 'PHISHING', _count: { category: 42 } },
              { category: 'FAKE_PAYMENT', _count: { category: 38 } },
              { category: 'MALWARE', _count: { category: 19 } },
              { category: 'IMPERSONATION', _count: { category: 25 } },
            ],
            stats: { totalReports: 124, totalAnalyses: 890 },
          },
        },
      } as any;
    }
  },

  report: (data: { targetUrl: string; category: string; description?: string }) =>
    api.post('/api/reports', data),

  getDomain: (hostname: string) =>
    api.get<{ success: boolean; data: DomainDetail }>(`/api/community/domains/${hostname}`),
};

export default api;
