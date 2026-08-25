/**
 * QRGuard IP Validator
 * Classifies IP addresses as public or private/reserved.
 * Uses the ip-address library for proper CIDR-based matching.
 *
 * SSRF Defense: Prevents server-side requests to private/internal destinations.
 */

import { Address4, Address6 } from 'ip-address';
import { SECURITY_CONFIG } from '../../config/security';

export type IpClassification =
  | 'PUBLIC'
  | 'LOOPBACK'
  | 'PRIVATE'
  | 'LINK_LOCAL'
  | 'MULTICAST'
  | 'UNSPECIFIED'
  | 'DOCUMENTATION'
  | 'RESERVED'
  | 'METADATA';

export interface IpValidationResult {
  address: string;
  isPublic: boolean;
  classification: IpClassification;
  blockedRange?: string;
  reason?: string;
}

// Parse a CIDR range for IPv4
function isInIPv4Range(ip: string, cidr: string): boolean {
  try {
    const addr = new Address4(ip);
    const range = new Address4(cidr);
    return addr.isInSubnet(range);
  } catch {
    return false;
  }
}

// Parse a CIDR range for IPv6
function isInIPv6Range(ip: string, cidr: string): boolean {
  try {
    const addr = new Address6(ip);
    const range = new Address6(cidr);
    return addr.isInSubnet(range);
  } catch {
    return false;
  }
}

/**
 * Validates a single IP address.
 * Returns classification and whether it is safe to use as a destination.
 */
export function classifyIP(rawAddress: string): IpValidationResult {
  let address = rawAddress.trim().toLowerCase();

  // Strip brackets if IPv6
  if (address.startsWith('[') && address.endsWith(']')) {
    address = address.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (address.startsWith('::ffff:')) {
    const embedded = address.substring(7);
    if (embedded.includes('.')) {
      return classifyIP(embedded);
    }
  }

  // Handle NAT64 Well-Known Prefix (64:ff9b::/96 RFC 6052)
  if (address.startsWith('64:ff9b::')) {
    try {
      const addr6 = new Address6(address);
      const parts = addr6.parsedAddress;
      if (parts && parts.length >= 8) {
        const p6 = parseInt(parts[6], 16);
        const p7 = parseInt(parts[7], 16);
        const b1 = (p6 >> 8) & 0xff;
        const b2 = p6 & 0xff;
        const b3 = (p7 >> 8) & 0xff;
        const b4 = p7 & 0xff;
        const extractedIpv4 = `${b1}.${b2}.${b3}.${b4}`;
        return classifyIP(extractedIpv4);
      }
    } catch {
      // Fall through if parsing fails
    }
  }

  // Try IPv4 first
  try {
    new Address4(address); // will throw if not IPv4
    for (const cidr of SECURITY_CONFIG.BLOCKED_IPv4_RANGES) {
      if (isInIPv4Range(address, cidr)) {
        const classification = getIPv4Classification(address, cidr);
        return {
          address,
          isPublic: false,
          classification,
          blockedRange: cidr,
          reason: `IPv4 address in blocked range ${cidr}`,
        };
      }
    }
    return { address, isPublic: true, classification: 'PUBLIC' };
  } catch {
    // Not IPv4, try IPv6
  }

  // Try IPv6
  try {
    new Address6(address);
    for (const cidr of SECURITY_CONFIG.BLOCKED_IPv6_RANGES) {
      if (isInIPv6Range(address, cidr)) {
        const classification = getIPv6Classification(cidr);
        return {
          address,
          isPublic: false,
          classification,
          blockedRange: cidr,
          reason: `IPv6 address in blocked range ${cidr}`,
        };
      }
    }
    return { address, isPublic: true, classification: 'PUBLIC' };
  } catch {
    // Not valid IP
  }

  // Check blocked hostnames (metadata endpoints)
  if ((SECURITY_CONFIG.BLOCKED_HOSTNAMES as readonly string[]).includes(address)) {
    return {
      address,
      isPublic: false,
      classification: 'METADATA',
      blockedRange: 'metadata-endpoint',
      reason: 'Cloud metadata endpoint',
    };
  }

  // Could not parse — treat as potentially unsafe
  return {
    address,
    isPublic: false,
    classification: 'RESERVED',
    reason: 'Could not parse IP address',
  };
}

function getIPv4Classification(address: string, matchedCidr: string): IpClassification {
  if (matchedCidr.startsWith('127.')) return 'LOOPBACK';
  if (matchedCidr.startsWith('169.254.')) return 'LINK_LOCAL';
  if (matchedCidr.startsWith('224.') || matchedCidr.startsWith('239.')) return 'MULTICAST';
  if (matchedCidr.startsWith('0.0.0.0')) return 'UNSPECIFIED';
  if (
    matchedCidr.startsWith('192.0.2.') ||
    matchedCidr.startsWith('198.51.100.') ||
    matchedCidr.startsWith('203.0.113.')
  )
    return 'DOCUMENTATION';
  return 'PRIVATE';
}

function getIPv6Classification(cidr: string): IpClassification {
  if (cidr === '::1/128') return 'LOOPBACK';
  if (cidr === '::/128') return 'UNSPECIFIED';
  if (cidr.startsWith('fc00:') || cidr.startsWith('fd')) return 'PRIVATE';
  if (cidr.startsWith('fe80:')) return 'LINK_LOCAL';
  if (cidr.startsWith('ff')) return 'MULTICAST';
  if (cidr.startsWith('2001:db8:')) return 'DOCUMENTATION';
  return 'RESERVED';
}

/**
 * Validates all IPs in a list (e.g., all DNS resolution results).
 * Returns true only if ALL are public.
 */
export function areAllIPsPublic(addresses: string[]): {
  allPublic: boolean;
  results: IpValidationResult[];
  firstBlocked?: IpValidationResult;
} {
  const results = addresses.map(classifyIP);
  const firstBlocked = results.find((r) => !r.isPublic);
  return {
    allPublic: !firstBlocked,
    results,
    firstBlocked,
  };
}
