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

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("nx_token");
  } catch {
    return null;
  }
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
  if (!res.ok) throw new Error(await res.text());
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
     * Fetch channels for a specific room.
     * @param roomId room identifier
     * @returns promise with array of channels
     */
    channels: (roomId: string) => http<Channel[]>(`/rooms/${roomId}/channels`),
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
  },
};
