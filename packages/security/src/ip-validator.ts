import * as ipaddr from 'ipaddr.js';
import { SsrfBlockedException } from './errors';

export interface IpValidationResult {
  isSafe: boolean;
  ip: string;
  reason?: string;
}

/**
 * Validates whether an IP address is a public, globally-routable IP.
 * Rejects localhost, private subnets, link-local / cloud metadata (169.254.169.254),
 * IPv4-mapped IPv6, multicast, and reserved ranges.
 */
export function validateIpAddress(ipString: string): IpValidationResult {
  if (!ipaddr.isValid(ipString)) {
    return {
      isSafe: false,
      ip: ipString,
      reason: 'Invalid IP address syntax',
    };
  }

  let addr = ipaddr.parse(ipString);

  // If this is an IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1), unmap to IPv4
  if (addr.kind() === 'ipv6') {
    const ipv6Addr = addr as ipaddr.IPv6;
    if (ipv6Addr.isIPv4MappedAddress()) {
      addr = ipv6Addr.toIPv4Address();
    }
  }

  const range = addr.range();

  // Blocked ranges for IPv4 and IPv6
  const disallowedRanges = [
    'loopback',         // 127.0.0.0/8, ::1
    'private',          // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    'uniqueLocal',      // fc00::/7 (IPv6 ULA)
    'linkLocal',        // 169.254.0.0/16 (AWS/GCP/Azure metadata 169.254.169.254), fe80::/10
    'carrierGradeNat',  // 100.64.0.0/10
    'broadcast',        // 255.255.255.255
    'multicast',        // 224.0.0.0/4, ff00::/8
    'unspecified',      // 0.0.0.0, ::
    'reserved',         // 240.0.0.0/4
  ];

  if (disallowedRanges.includes(range)) {
    return {
      isSafe: false,
      ip: ipString,
      reason: `Belongs to blocked range '${range}'`,
    };
  }

  // Explicit check for cloud metadata IP 169.254.169.254 in case of custom ranges
  const normalized = addr.toString();
  if (normalized === '169.254.169.254' || normalized.startsWith('169.254.')) {
    return {
      isSafe: false,
      ip: ipString,
      reason: 'Cloud metadata / link-local endpoint',
    };
  }

  return {
    isSafe: true,
    ip: normalized,
  };
}

/**
 * Asserts that an IP address is safe; throws SsrfBlockedException if disallowed.
 */
export function assertSafeIp(ipString: string): void {
  const result = validateIpAddress(ipString);
  if (!result.isSafe) {
    throw new SsrfBlockedException(result.ip, result.reason || 'Restricted network endpoint');
  }
}
