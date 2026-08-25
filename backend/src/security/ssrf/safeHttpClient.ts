/**
 * QRGuard Safe HTTP Client
 * Makes controlled outbound HTTP requests for URL analysis.
 *
 * SSRF Defense:
 * - Manual redirect handling (never automatic)
 * - Each redirect target validated before following
 * - Response size limit enforced
 * - Strict timeouts
 * - No credential forwarding
 */

import http from 'http';
import https from 'https';
import axios, { AxiosError } from 'axios';
import { SECURITY_CONFIG } from '../../config/security';
import { validateUrl } from './urlValidator';
import { validateHostnameDNS } from './dnsValidator';
import { checkPortPolicy, checkSchemePolicy } from './networkPolicy';

export interface SafeFetchResult {
  success: boolean;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string;
  title?: string;
  redirectChain: RedirectStep[];
  blocked: boolean;
  blockReason?: string;
  blockEventType?: string;
  errorCode?: string;
  error?: string;
  responseTimeMs?: number;
  resolvedIPs?: string[];
}

export interface RedirectStep {
  from: string;
  to: string;
  statusCode: number;
  blocked: boolean;
  blockReason?: string;
}

/**
 * Performs a safe HTTP HEAD/GET request to analyze a URL.
 * Manually follows redirects, validating each step.
 */
export async function safeFetch(startUrl: string): Promise<SafeFetchResult> {
  const redirectChain: RedirectStep[] = [];
  let currentUrl = startUrl;
  const startTime = Date.now();

  for (let hop = 0; hop <= SECURITY_CONFIG.MAX_REDIRECTS; hop++) {
    // ── Validate URL format ──────────────────────────────────────────────────
    const urlValidation = validateUrl(currentUrl);
    if (!urlValidation.valid) {
      return {
        success: false,
        blocked: true,
        blockReason: urlValidation.error,
        blockEventType: urlValidation.errorCode || 'SSRF_UNSUPPORTED_SCHEME',
        redirectChain,
        error: urlValidation.error,
        errorCode: urlValidation.errorCode,
        responseTimeMs: Date.now() - startTime,
      };
    }

    const { scheme, hostname, port, normalizedUrl } = urlValidation;

    // ── Validate scheme ──────────────────────────────────────────────────────
    const schemeCheck = checkSchemePolicy(scheme!);
    if (!schemeCheck.allowed) {
      return {
        success: false,
        blocked: true,
        blockReason: schemeCheck.reason,
        blockEventType: schemeCheck.violationType,
        redirectChain,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // ── Validate port ────────────────────────────────────────────────────────
    const portCheck = checkPortPolicy(port || null, scheme!);
    if (!portCheck.allowed) {
      return {
        success: false,
        blocked: true,
        blockReason: portCheck.reason,
        blockEventType: portCheck.violationType,
        redirectChain,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // ── DNS resolution + IP validation ───────────────────────────────────────
    // This is called immediately before the request to minimize TOCTOU window.
    const dnsResult = await validateHostnameDNS(hostname!);

    if (!dnsResult.resolved) {
      return {
        success: false,
        blocked: false,
        redirectChain,
        errorCode: 'DNS_RESOLUTION_FAILED',
        error: 'Destination could not be safely analyzed.',
        responseTimeMs: Date.now() - startTime,
      };
    }

    if (!dnsResult.allPublic) {
      const blocked = dnsResult.blockedResult!;
      const eventType =
        blocked.classification === 'LOOPBACK'
          ? 'SSRF_LOOPBACK_BLOCKED'
          : blocked.classification === 'LINK_LOCAL'
          ? 'SSRF_LINK_LOCAL_BLOCKED'
          : blocked.classification === 'METADATA'
          ? 'SSRF_PRIVATE_IP_BLOCKED'
          : 'SSRF_PRIVATE_IP_BLOCKED';

      return {
        success: false,
        blocked: true,
        blockReason: 'Destination resolves to a non-public address',
        blockEventType: eventType,
        redirectChain,
        resolvedIPs: dnsResult.resolvedAddresses,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // ── DNS Pinning: Bind socket directly to pre-validated IP address ─────────
    const validatedIp = dnsResult.resolvedAddresses[0];
    const isIpv6 = validatedIp.includes(':');
    const customLookup = (
      _hostname: string,
      options: any,
      callback: any
    ) => {
      let cb = callback;
      let opts = options;
      if (typeof options === 'function') {
        cb = options;
        opts = {};
      }
      const family = isIpv6 ? 6 : 4;
      if (opts && opts.all) {
        cb(null, [{ address: validatedIp, family }]);
      } else {
        cb(null, validatedIp, family);
      }
    };

    const httpAgent = new http.Agent({ lookup: customLookup });
    const httpsAgent = new https.Agent({ lookup: customLookup, servername: hostname! });

    // ── Make HTTP request (no automatic redirects, DNS pinned) ───────────────
    try {
      const response = await axios({
        method: 'GET',
        url: normalizedUrl,
        httpAgent,
        httpsAgent,
        maxRedirects: 0,      // Manual redirect handling
        timeout: SECURITY_CONFIG.REQUEST_TIMEOUT_MS,
        maxContentLength: SECURITY_CONFIG.MAX_RESPONSE_SIZE_BYTES,
        maxBodyLength: SECURITY_CONFIG.MAX_RESPONSE_SIZE_BYTES,
        validateStatus: (status) => status < 600, // Don't throw on redirects
        headers: {
          'Host': hostname! + (port ? `:${port}` : ''),
          'User-Agent': 'QRGuard-SafeFetch/1.0 (security-analysis)',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        // Do NOT send cookies or credentials to analyzed destinations
        withCredentials: false,
      });

      const status = response.status;

      // ── Handle redirect ────────────────────────────────────────────────────
      if (status >= 300 && status < 400) {
        const location = response.headers['location'];

        if (!location) {
          redirectChain.push({ from: currentUrl, to: '', statusCode: status, blocked: false });
          break;
        }

        // Resolve relative redirect URLs
        let absoluteLocation: string;
        try {
          absoluteLocation = new URL(location, currentUrl).toString();
        } catch {
          return {
            success: false,
            blocked: true,
            blockReason: 'Invalid redirect location',
            blockEventType: 'SSRF_REDIRECT_BLOCKED',
            redirectChain,
            responseTimeMs: Date.now() - startTime,
          };
        }

        redirectChain.push({
          from: currentUrl,
          to: absoluteLocation,
          statusCode: status,
          blocked: false,
        });

        if (hop >= SECURITY_CONFIG.MAX_REDIRECTS) {
          return {
            success: false,
            blocked: false,
            redirectChain,
            errorCode: 'TOO_MANY_REDIRECTS',
            error: `Exceeded maximum redirect limit (${SECURITY_CONFIG.MAX_REDIRECTS})`,
            responseTimeMs: Date.now() - startTime,
          };
        }

        currentUrl = absoluteLocation;
        continue; // Re-validate the new URL from the top
      }

      // ── Extract page metadata safely ───────────────────────────────────────
      let title: string | undefined;
      const bodyText = typeof response.data === 'string' ? response.data : '';
      const titleMatch = bodyText.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) {
        // Truncate and escape title to prevent XSS
        title = titleMatch[1].substring(0, 200).replace(/[<>&"']/g, '');
      }

      return {
        success: true,
        finalUrl: normalizedUrl,
        statusCode: status,
        contentType: response.headers['content-type'] ? String(response.headers['content-type']) : undefined,
        title,
        redirectChain,
        blocked: false,
        resolvedIPs: dnsResult.resolvedAddresses,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;

      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
        return {
          success: false,
          blocked: false,
          redirectChain,
          errorCode: 'SSRF_TIMEOUT',
          error: 'Request timed out',
          responseTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        blocked: false,
        redirectChain,
        errorCode: 'FETCH_ERROR',
        error: 'Could not reach destination',
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  return {
    success: false,
    blocked: false,
    redirectChain,
    errorCode: 'TOO_MANY_REDIRECTS',
    error: 'Exceeded redirect limit',
    responseTimeMs: Date.now() - startTime,
  };
}
