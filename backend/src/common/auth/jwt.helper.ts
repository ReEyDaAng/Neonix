import jwt from 'jsonwebtoken';

/**
 * Shape of the JWT payload Neonix issues for authenticated users.
 */
export interface NeonixJwtPayload {
  sub: string;
}

/**
 * Resolve the JWT secret from environment.
 *
 * In production we **fail loudly** if `JWT_SECRET` is missing — silently using
 * a development default would let attackers forge tokens.
 *
 * @returns secret string used to sign and verify Neonix JWTs
 * @throws Error in production when `JWT_SECRET` is unset
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be set to a strong value (>=16 chars) in production',
      );
    }
    return secret || 'dev_secret_change_me';
  }
  return secret;
}

/**
 * Sign a Neonix JWT with the configured secret and a 7 day TTL.
 *
 * @param payload payload to sign
 * @returns signed JWT
 */
export function signJwt(payload: NeonixJwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Verify a Neonix JWT and return its payload, or null on any error.
 *
 * @param token raw JWT string
 * @returns decoded payload or null
 */
export function verifyJwt(
  token: string | undefined | null,
): NeonixJwtPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as NeonixJwtPayload;
    if (typeof decoded?.sub !== 'string' || decoded.sub.length === 0)
      return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract a bearer token from an `Authorization` header value.
 *
 * @param header raw Authorization header value (or undefined)
 * @returns the token portion or empty string
 */
export function extractBearer(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}
