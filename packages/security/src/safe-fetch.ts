import * as http from 'http';
import * as https from 'https';
import * as dns from 'dns';
import { URL } from 'url';
import {
  DisallowedContentTypeException,
  InvalidSchemeException,
  PayloadTooLargeException,
  SsrfBlockedException,
  TooManyRedirectsException,
} from './errors';
import { assertSafeIp } from './ip-validator';

export interface SafeFetchOptions {
  method?: 'GET' | 'HEAD' | 'POST';
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseSizeBytes?: number;
  allowedContentTypes?: string[];
  userAgent?: string;
}

export interface SafeFetchResponse {
  statusCode: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  url: string;
  body: string;
  buffer: Buffer;
  json: <T = unknown>() => T;
}

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_USER_AGENT = 'EdgiOpportunityBot/1.0 (+https://github.com/be991/edgi; contact: bethelokafor34562@gmail.com)';

export const DEFAULT_ALLOWED_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/json',
  'text/plain',
  'application/feed+json',
];

/**
 * Resolves all IP addresses for a given hostname and verifies that every resolved IP is safe.
 * Throws SsrfBlockedException if any address belongs to a disallowed network.
 */
export async function resolveAndAssertSafeHost(hostname: string): Promise<string[]> {
  // If the hostname itself is an IP literal
  const isIpv4Literal = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6Literal = hostname.startsWith('[') && hostname.endsWith(']');
  const cleanHost = isIpv6Literal ? hostname.slice(1, -1) : hostname;

  if (isIpv4Literal || cleanHost.includes(':')) {
    assertSafeIp(cleanHost);
    return [cleanHost];
  }

  // Reject obvious localhost and metadata names upfront
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal' ||
    lower === 'instance-data'
  ) {
    throw new SsrfBlockedException(hostname, 'Restricted local or cloud metadata hostname');
  }

  // Resolve all addresses via DNS
  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`DNS resolution failed for host "${hostname}": ${errorMsg}`);
  }

  if (!records || records.length === 0) {
    throw new Error(`No DNS records found for host "${hostname}"`);
  }

  const safeIps: string[] = [];
  for (const record of records) {
    assertSafeIp(record.address);
    safeIps.push(record.address);
  }

  return safeIps;
}

/**
 * Executes a hardened HTTP/HTTPS fetch with SSRF mitigation, strict timeout,
 * byte limit caps, redirect re-validation, and content-type allowlisting.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxResponseSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    allowedContentTypes = DEFAULT_ALLOWED_CONTENT_TYPES,
    userAgent = DEFAULT_USER_AGENT,
  } = options;

  let currentUrl = targetUrl;
  let remainingRedirects = maxRedirects;

  while (true) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      throw new Error(`Invalid URL format: "${currentUrl}"`);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new InvalidSchemeException(parsedUrl.protocol);
    }

    // 1. Resolve host and verify all resolved IPs are safe
    const safeIps = await resolveAndAssertSafeHost(parsedUrl.hostname);
    const pinnedIp = safeIps[0];
    if (!pinnedIp) {
      throw new Error(`No IP resolved for host "${parsedUrl.hostname}"`);
    }

    // 2. Perform the HTTP request using the pinned safe IP
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,application/json;q=0.9,*/*;q=0.8',
      Host: parsedUrl.host,
      ...headers,
    };

    if (body) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const response = await new Promise<{
      res: http.IncomingMessage;
      chunks: Buffer[];
      totalBytes: number;
    }>((resolve, reject) => {
      let isSettled = false;

      const req = requestModule.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          servername: isHttps ? parsedUrl.hostname : undefined,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method,
          headers: requestHeaders,
          // Custom DNS lookup that returns the pre-validated safe IP
          lookup: (_hostname: string, options: any, callback: any) => {
            let cb = callback;
            let opts = options;
            if (typeof options === 'function') {
              cb = options;
              opts = {};
            }
            const family = pinnedIp.includes(':') ? 6 : 4;
            if (opts && opts.all) {
              cb(null, [{ address: pinnedIp, family }]);
            } else {
              cb(null, pinnedIp, family);
            }
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let totalBytes = 0;

          res.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > maxResponseSizeBytes) {
              res.destroy();
              req.destroy();
              if (!isSettled) {
                isSettled = true;
                reject(new PayloadTooLargeException(totalBytes, maxResponseSizeBytes));
              }
              return;
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            if (!isSettled) {
              isSettled = true;
              resolve({ res, chunks, totalBytes });
            }
          });

          res.on('error', (err) => {
            if (!isSettled) {
              isSettled = true;
              reject(err);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`SafeFetch request timed out after ${timeoutMs}ms for ${currentUrl}`));
        }
      });

      req.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });

    const statusCode = response.res.statusCode || 200;
    const statusText = response.res.statusMessage || '';

    // 3. Handle HTTP 3xx Redirects safely
    if ([301, 302, 303, 307, 308].includes(statusCode) && response.res.headers.location) {
      if (remainingRedirects <= 0) {
        throw new TooManyRedirectsException(maxRedirects);
      }
      remainingRedirects -= 1;
      const redirectLocation = response.res.headers.location;
      // Resolve relative redirect against currentUrl
      currentUrl = new URL(redirectLocation, currentUrl).toString();
      continue;
    }

    // 4. Validate Content-Type allowlist
    const rawContentType = response.res.headers['content-type'];
    if (rawContentType && allowedContentTypes.length > 0) {
      const parsedContentType = (rawContentType.split(';')[0] ?? '').trim().toLowerCase();
      const isAllowed = allowedContentTypes.some(
        (allowed) => allowed.toLowerCase() === parsedContentType || parsedContentType.includes(allowed)
      );
      if (!isAllowed) {
        throw new DisallowedContentTypeException(parsedContentType, allowedContentTypes);
      }
    }

    // 5. Build and return SafeFetchResponse
    const rawBuffer = Buffer.concat(response.chunks);
    const bodyText = rawBuffer.toString('utf-8');

    return {
      statusCode,
      statusText,
      headers: response.res.headers,
      url: currentUrl,
      body: bodyText,
      buffer: rawBuffer,
      json: <T = unknown>() => JSON.parse(bodyText) as T,
    };
  }
}
