type FrontendLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface FrontendLogPayload {
  level: FrontendLogLevel;
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
}

export async function sendFrontendLog(payload: FrontendLogPayload): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logs/frontend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }),
    });
  } catch (error) {
    console.error('Failed to send frontend log', error);
  }
}