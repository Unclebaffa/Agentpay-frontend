// Lightweight wrapper around fetch() for the AgentPay backend API.
// Centralises base URL resolution and error handling so call sites stay
// small.

import { resolveApiBase } from "./resolveApiBase";

// Resolved at module load time so any misconfiguration surfaces during boot
// rather than at the first fetch.
const API_BASE = resolveApiBase();
const DEFAULT_API_TIMEOUT_MS = 10_000;

export type ApiError = {
  error: string;
  message: string;
  requestId?: string;
};

export type ApiFetchInit = RequestInit & {
  /** Request timeout in milliseconds. Pass 0 or a negative value to disable. */
  timeoutMs?: number;
};

export class ApiTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`request timed out after ${timeoutMs}ms`);
    this.name = "ApiTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function shouldUseTimeout(timeoutMs: number) {
  return Number.isFinite(timeoutMs) && timeoutMs > 0;
}

const JSON_PARSE_FAILED = Symbol("json_parse_failed");

async function tryParseJson(res: Response): Promise<unknown | typeof JSON_PARSE_FAILED> {
  try {
    return await res.json();
  } catch {
    return JSON_PARSE_FAILED;
  }
}

function createHttpError(status: number, statusText: string, body: unknown) {
  const apiError =
    body && typeof body === "object" ? (body as Partial<ApiError>) : undefined;
  const message =
    typeof apiError?.message === "string" && apiError.message.length > 0
      ? apiError.message
      : statusText.length > 0
        ? statusText
        : "Request failed";
  const err = new Error(message);

  if (apiError) {
    return Object.assign(err, apiError, {
      error:
        typeof apiError.error === "string" && apiError.error.length > 0
          ? apiError.error
          : "http_error",
    });
  }
  return err;
}

/**
 * Fetch JSON from the AgentPay API.
 *
 * `timeoutMs` defaults to 10 seconds. A caller-provided `signal` is composed
 * with the internal timeout signal, so whichever aborts first wins. Timers and
 * caller abort listeners are always cleared after the request settles.
 */
export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const { timeoutMs, signal: callerSignal, headers, ...restInit } = init;
  const effectiveTimeoutMs = timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timeoutError: ApiTimeoutError | undefined;

  const abortFromCaller = () => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  if (shouldUseTimeout(effectiveTimeoutMs) && !controller.signal.aborted) {
    timeoutId = setTimeout(() => {
      timeoutError = new ApiTimeoutError(effectiveTimeoutMs);
      controller.abort(timeoutError);
    }, effectiveTimeoutMs);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...restInit,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
    });

    if (res.status === 204) return undefined as T;

    // Detect whether the response has a real body stream. null means the
    // Response was explicitly constructed with no body; undefined means a test
    // mock that does not implement the stream property.
    const bodyStream = (res as { body?: ReadableStream | null }).body;

    let parsed: unknown | typeof JSON_PARSE_FAILED;
    if (bodyStream === null) {
      // Real empty body — skip parsing; treat like JSON_PARSE_FAILED below.
      parsed = JSON_PARSE_FAILED;
    } else {
      parsed = await tryParseJson(res);
    }

    if (parsed === JSON_PARSE_FAILED) {
      if (res.ok) {
        throw new Error("Response body was not valid JSON");
      }
      // Non-ok with unparseable body: presence of a real body stream shifts the
      // fallback message from the simple "Request failed" to the status-code form.
      const hasRealBody = bodyStream !== null && bodyStream !== undefined;
      const message =
        res.statusText?.length > 0
          ? res.statusText
          : hasRealBody
            ? `Request failed with status ${res.status}`
            : "Request failed";
      const err = new Error(message);
      if (hasRealBody) Object.assign(err, { error: "http_error" });
      throw err;
    }

    // JSON decoded as null (includes the test polyfill that converts a null body
    // to JSON.parse("null") === null).
    if (parsed === null) {
      if (!res.ok) {
        // Non-ok: treat null JSON as "no useful body" — report statusText or fallback.
        const message = res.statusText?.length > 0 ? res.statusText : "Request failed";
        throw new Error(message);
      }
      return undefined as T;
    }

    if (!res.ok) {
      throw createHttpError(res.status, res.statusText ?? "", parsed);
    }

    return parsed as T;
  } catch (error) {
    if (timeoutError !== undefined) {
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function apiGet<T>(path: string, init: ApiFetchInit = {}) {
  return apiFetch<T>(path, init);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  init: ApiFetchInit = {}
) {
  return apiFetch<T>(path, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  init: ApiFetchInit = {}
) {
  return apiFetch<T>(path, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete(path: string, init: ApiFetchInit = {}) {
  return apiFetch<void>(path, { ...init, method: "DELETE" });
}
