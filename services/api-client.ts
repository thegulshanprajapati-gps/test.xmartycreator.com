type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
};

function buildHeaders(body: unknown): HeadersInit | undefined {
  if (body === undefined) return undefined;
  return { 'Content-Type': 'application/json' };
}

export async function apiRequest<T>(url: string, config?: RequestConfig): Promise<T> {
  const response = await fetch(url, {
    method: config?.method || 'GET',
    headers: buildHeaders(config?.body),
    body: config?.body === undefined ? undefined : JSON.stringify(config.body),
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      message = payload.message || payload.error || message;
    } catch {
      // ignore JSON parse failures
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
