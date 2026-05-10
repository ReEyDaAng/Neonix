const isDev = process.env.NODE_ENV !== "production";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (isDev ? "http://localhost:4000" : "");

if (!API_URL) {
  // у проді краще “впасти”, ніж мовчки піти в localhost
  throw new Error("NEXT_PUBLIC_API_URL is missing (required in production)");
}

interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
}

/**
 * Room interface for chat rooms.
 */
export interface Room {
  id: string;
  name: string;
  meta?: string;
  badge?: string;
  ownerId?: string | null;
}

/**
 * Room with the owner profile expanded — returned by GET /rooms/:id.
 */
export interface RoomWithOwner extends Room {
  owner?: { id: string; displayName: string; username: string } | null;
}

/**
 * Channel kind discriminating between text, voice, and video channels.
 */
export type ChannelKind = "TEXT" | "VOICE" | "VIDEO";

/**
 * Channel interface for chat channels within rooms.
 */
export interface Channel {
  id: string;
  name: string;
  kind?: ChannelKind;
}

/**
 * Message interface for chat messages.
 */
export interface Message {
  id: string;
  who: string;
  text: string;
  time: string;
  me: boolean;
  createdAt: string;
}

/**
 * Response shape returned by the calls token endpoint.
 */
export interface CallTokenResponse {
  token: string;
  url: string;
  roomName: string;
  expiresAt: number;
}

/**
 * Public state of an active call session.
 */
export interface CallStateResponse {
  presenterUserId: string | null;
  raisedHands: string[];
  participantsCount: number;
}

/**
 * Custom error thrown by `http()` so callers can branch on status / kind.
 *
 * The constructor tries to parse the response body as a NestJS exception
 * filter response (`{ message, statusCode, ... }`) and uses its `message`
 * field as the user-facing `Error.message`. This way `err.message` in UI
 * code is "Channel \"general\" already exists in this room" instead of
 * the full JSON payload. The original raw body is still kept on
 * `err.body` for debugging.
 */
export class ApiError extends Error {
  status: number;
  body: string;
  /**
   * @param status HTTP status code
   * @param body raw response body (text)
   */
  constructor(status: number, body: string) {
    let friendly = body || `Request failed (${status})`;
    if (body) {
      try {
        const parsed = JSON.parse(body) as
          | { message?: string | string[] }
          | null;
        const msg = parsed?.message;
        if (typeof msg === "string" && msg.length > 0) {
          friendly = msg;
        } else if (Array.isArray(msg) && msg.length > 0) {
          // class-validator returns an array of validation errors
          friendly = msg.join("; ");
        }
      } catch {
        // Not JSON — fall back to the raw body.
      }
    }
    super(friendly);
    this.status = status;
    this.body = body;
  }
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("nx_token");
  } catch {
    return null;
  }
}

/**
 * Fired when any HTTP request returns 401 — let `auth.tsx` listen and signOut.
 */
function emitUnauthorized() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nx:unauthorized"));
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(API_URL + path, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      emitUnauthorized();
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    /**
     * Authenticate user with email and password.
     * @param body login credentials
     * @param body.email user email
     * @param body.password user password
     * @returns promise with token and user data
     */
    login: (body: { email: string; password: string }) =>
      http<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    /**
     * Register new user account.
     * @param body registration data
     * @param body.email user email
     * @param body.password user password
     * @param body.displayName optional display name
     * @returns promise with token and user data
     */
    register: (body: { email: string; password: string; displayName?: string }) =>
      http<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    /**
     * Resolve current user from JWT.
     * @returns promise with current user public profile
     */
    me: () => http<User>("/auth/me"),
  },
  chat: {
    /**
     * Fetch list of all chat rooms.
     * @returns promise with array of rooms
     */
    rooms: () => http<Room[]>("/rooms"),
    /**
     * Fetch a single room with its owner profile expanded.
     * @param roomId target room
     * @returns promise with room + owner mini-profile
     */
    room: (roomId: string) => http<RoomWithOwner>(`/rooms/${roomId}`),
    /**
     * Create a new room (server). Backend seeds a "general" text channel.
     * @param body room creation payload
     * @returns promise with created room
     */
    createRoom: (body: { name: string; meta?: string; badge?: string }) =>
      http<Room>("/rooms", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    /**
     * Fetch channels for a specific room.
     * @param roomId room identifier
     * @returns promise with array of channels
     */
    channels: (roomId: string) => http<Channel[]>(`/rooms/${roomId}/channels`),
    /**
     * Create a new channel inside a room.
     * @param roomId target room
     * @param body channel payload (name + kind)
     * @returns promise with the created channel
     */
    createChannel: (
      roomId: string,
      body: { name: string; kind: ChannelKind },
    ) =>
      http<Channel>(`/rooms/${roomId}/channels`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    /**
     * Fetch messages for a specific channel in a room.
     * @param roomId room identifier
     * @param channelId channel identifier
     * @returns promise with array of messages
     */
    messages: (roomId: string, channelId: string) =>
      http<Message[]>(`/rooms/${roomId}/channels/${channelId}/messages`),
    /**
     * Send a new message to a channel. The display name is resolved server-side
     * from the authenticated user — only `text` (and optional `time`) are sent.
     * @param roomId room identifier
     * @param channelId channel identifier
     * @param body message data
     * @returns promise with created message
     */
    send: (
      roomId: string,
      channelId: string,
      body: { text: string; time?: string },
    ) =>
      http<Message>(`/rooms/${roomId}/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  calls: {
    /**
     * Issue a LiveKit access token for the given channel.
     * @param channelId target channel
     * @returns promise resolving to token + url + room name
     */
    token: (channelId: string) =>
      http<CallTokenResponse>("/calls/token", {
        method: "POST",
        body: JSON.stringify({ channelId }),
      }),
    /**
     * Fetch the current state of an active call.
     * @param channelId channel identifier
     * @returns promise with active call state
     */
    state: (channelId: string) =>
      http<CallStateResponse>(`/calls/${channelId}/state`),
    /**
     * Fetch the latest annotation snapshot.
     * @param channelId channel identifier
     * @returns latest snapshot row or null
     */
    annotations: (channelId: string) =>
      http<{ payload?: { strokes?: unknown[]; version?: number } } | null>(
        `/calls/${channelId}/annotations`,
      ),
    /**
     * Persist an annotation snapshot.
     * @param channelId channel identifier
     * @param payload opaque snapshot
     * @returns id and createdAt
     */
    saveAnnotation: (
      channelId: string,
      payload: Record<string, unknown>,
    ) =>
      http<{ id: string; createdAt: string }>(
        `/calls/${channelId}/annotations`,
        {
          method: "POST",
          body: JSON.stringify({ payload }),
        },
      ),
  },
};
