// API client for QRGuard backend
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true,
  timeout: 30000,
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
  analyze: (url: string) =>
    api.post<{ success: boolean; data: AnalysisResult }>('/api/url/analyze', { url }),
};

// ── QR API ─────────────────────────────────────────────────────────────────────
export const qrApi = {
  analyze: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ success: boolean; data: QrAnalysisResult }>('/api/qr/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
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
  get: () =>
    api.get<{ success: boolean; data: CommunityData }>('/api/community'),

  report: (data: { targetUrl: string; category: string; description?: string }) =>
    api.post('/api/reports', data),

  getDomain: (hostname: string) =>
    api.get<{ success: boolean; data: DomainDetail }>(`/api/community/domains/${hostname}`),
};

export default api;
