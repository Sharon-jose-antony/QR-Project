/**
 * QRGuard DNS Validator
 * Resolves hostnames and validates that all resolved IPs are public.
 *
 * SSRF Defense Layer 2: Prevents DNS-based bypasses of IP filtering.
 * DNS rebinding note: We minimize TOCTOU window by resolving immediately
 * before making the HTTP request and using the resolved IP directly.
 */

import dns from 'dns';
import { promisify } from 'util';
import { areAllIPsPublic, IpValidationResult } from './ipValidator';
import { unwrapIPv6 } from './urlValidator';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

export interface DnsValidationResult {
  hostname: string;
  resolved: boolean;
  resolvedAddresses: string[];
  allPublic: boolean;
  blockedResult?: IpValidationResult;
  errorCode?: string;
  error?: string;
}

/**
 * Resolves a hostname and validates all returned IP addresses.
 * Checks both A (IPv4) and AAAA (IPv6) records.
 *
 * TOCTOU mitigation: This is called immediately before the HTTP request.
 * The resolved addresses are returned so the caller can use them directly.
 */
export async function validateHostnameDNS(hostname: string): Promise<DnsValidationResult> {
  // Unwrap IPv6 brackets if present
  const cleanHostname = unwrapIPv6(hostname);

  // If it's already a raw IP, classify it directly
  const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;

  if (ipv4Pattern.test(cleanHostname) || ipv6Pattern.test(cleanHostname)) {
    const { allPublic, firstBlocked } = areAllIPsPublic([cleanHostname]);
    return {
      hostname,
      resolved: true,
      resolvedAddresses: [cleanHostname],
      allPublic,
      blockedResult: firstBlocked,
    };
  }

  // Resolve DNS
  const addresses: string[] = [];
  const errors: string[] = [];

  // A records
  try {
    const ipv4Addrs = await resolve4(cleanHostname);
    addresses.push(...ipv4Addrs);
  } catch (err: any) {
    errors.push(`IPv4: ${err.code || err.message}`);
  }

  // AAAA records
  try {
    const ipv6Addrs = await resolve6(cleanHostname);
    addresses.push(...ipv6Addrs);
  } catch (err: any) {
    errors.push(`IPv6: ${err.code || err.message}`);
  }

  // If no addresses resolved at all
  if (addresses.length === 0) {
    return {
      hostname,
      resolved: false,
      resolvedAddresses: [],
      allPublic: false,
      errorCode: 'DNS_RESOLUTION_FAILED',
      error: `Could not resolve hostname: ${errors.join('; ')}`,
    };
  }

  // Validate all resolved IPs
  const { allPublic, results, firstBlocked } = areAllIPsPublic(addresses);

  return {
    hostname,
    resolved: true,
    resolvedAddresses: addresses,
    allPublic,
    blockedResult: firstBlocked,
  };
}
