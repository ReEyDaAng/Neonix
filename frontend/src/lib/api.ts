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
 * Channel interface for chat channels within rooms.
 */
export interface Channel {
  id: string;
  name: string;
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
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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
     * Send a new message to a channel.
     * @param roomId room identifier
     * @param channelId channel identifier
     * @param body message data
     * @param body.who sender name
     * @param body.text message text
     * @param body.time message timestamp
     * @returns promise with created message
     */
    send: (roomId: string, channelId: string, body: { who: string; text: string; time: string }) =>
      http<Message>(`/rooms/${roomId}/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
