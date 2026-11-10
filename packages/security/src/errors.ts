export class SecurityException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityException';
  }
}

export class SsrfBlockedException extends SecurityException {
  constructor(ipOrHost: string, reason: string) {
    super(`SSRF Protection Blocked Request: ${ipOrHost} is not permitted (${reason})`);
    this.name = 'SsrfBlockedException';
  }
}

export class InvalidSchemeException extends SecurityException {
  constructor(scheme: string) {
    super(`Invalid URL scheme: "${scheme}". Only http: and https: protocols are permitted.`);
    this.name = 'InvalidSchemeException';
  }
}

export class TooManyRedirectsException extends SecurityException {
  constructor(maxRedirects: number) {
    super(`Exceeded maximum allowed redirects (${maxRedirects}). Possible redirect loop.`);
    this.name = 'TooManyRedirectsException';
  }
}

export class PayloadTooLargeException extends SecurityException {
  constructor(bytesReceived: number, maxBytes: number) {
    super(`Response size exceeded maximum allowed limit of ${maxBytes} bytes (received ${bytesReceived} bytes).`);
    this.name = 'PayloadTooLargeException';
  }
}

export class DisallowedContentTypeException extends SecurityException {
  constructor(contentType: string, allowed: string[]) {
    super(`Disallowed Content-Type "${contentType}". Permitted: [${allowed.join(', ')}]`);
    this.name = 'DisallowedContentTypeException';
  }
}
