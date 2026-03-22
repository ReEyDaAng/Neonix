const isDev = process.env.NODE_ENV !== "production";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (isDev ? "http://localhost:4000" : "");

if (!API_URL) {
  // у проді краще “впасти”, ніж мовчки піти в localhost
  throw new Error("NEXT_PUBLIC_API_URL is missing (required in production)");
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
    login: (body: { email: string; password: string }) =>
      http<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    register: (body: { email: string; password: string; displayName?: string }) =>
      http<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  chat: {
    rooms: () => http<any[]>("/rooms"),
    channels: (roomId: string) => http<any[]>(`/rooms/${roomId}/channels`),
    messages: (roomId: string, channelId: string) =>
      http<any[]>(`/rooms/${roomId}/channels/${channelId}/messages`),
    send: (roomId: string, channelId: string, body: { who: string; text: string; time: string }) =>
      http<any>(`/rooms/${roomId}/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
