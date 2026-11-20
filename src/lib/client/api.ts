// Browser-side fetch helper: turns the API's { error: { code, message } } shape into thrown ApiErrors.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: string; body?: unknown; formData?: FormData };

export async function apiFetch<T = unknown>(url: string, { method = "GET", body, formData }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection.");
  }
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "request_failed", err?.message ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}
