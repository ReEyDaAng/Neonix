import { Socket } from 'socket.io';
import { extractBearer, verifyJwt } from '../auth/jwt.helper';

/**
 * Strongly-typed bag carried on a Socket.IO socket throughout its lifetime.
 */
export interface NeonixSocketData {
  userId?: string;
  displayName?: string;
  username?: string;
  callChannelId?: string;
}

/**
 * Read the typed Neonix payload from `socket.data` (avoids leaking the
 * `any`-typed default in socket.io types).
 *
 * @param client socket
 * @returns typed data bag (mutable)
 */
export function socketData(client: Socket): NeonixSocketData {
  const data = client.data as NeonixSocketData | undefined;
  if (!data) {
    const fresh: NeonixSocketData = {};
    (client as { data: NeonixSocketData }).data = fresh;
    return fresh;
  }
  return data;
}

/**
 * Authenticate a Socket.IO client and stash the resolved user id on `socket.data.userId`.
 *
 * Tokens may be supplied either via Socket.IO `handshake.auth.token` (preferred for
 * browser clients) or as a Bearer Authorization header for parity with REST callers.
 *
 * @param client connected Socket.IO socket
 * @returns userId on success, null otherwise (caller is expected to disconnect)
 */
export function authenticateSocket(client: Socket): string | null {
  const auth = (client.handshake?.auth ?? {}) as { token?: unknown };
  const headerToken = extractBearer(client.handshake?.headers?.authorization);
  const handshakeToken =
    typeof auth.token === 'string' && auth.token.length > 0 ? auth.token : '';
  const token = handshakeToken || headerToken;
  const payload = verifyJwt(token);

  if (!payload) {
    return null;
  }

  const data = socketData(client);
  data.userId = payload.sub;
  return payload.sub;
}

/**
 * Read the previously authenticated user id from a Socket.IO client.
 *
 * @param client socket
 * @returns userId or null when authentication has not been performed
 */
export function getSocketUserId(client: Socket): string | null {
  const id = socketData(client).userId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Read the cached display name for a socket (set during connection bootstrap).
 *
 * @param client socket
 * @returns display name or 'User' fallback
 */
export function getSocketDisplayName(client: Socket): string {
  return socketData(client).displayName || 'User';
}
