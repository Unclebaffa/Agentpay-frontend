"use client";

import { useEffect, useReducer } from "react";
import { apiGet } from "./apiClient";

type State<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ok"; data: T };

/** Fetch JSON from the AgentPay backend and react to path changes. */
export function useApi<T>(path: string | null): State<T> {
  const [state, dispatch] = useReducer(
    (_state: State<T>, action: State<T>) => action,
    { status: "loading" } as State<T>
  );

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    dispatch({ status: "loading" });
    apiGet<T>(path)
      .then((data) => !cancelled && dispatch({ status: "ok", data }))
      .catch(
        (e) =>
          !cancelled &&
          dispatch({
            status: "error",
            error: (e as Error).message ?? "failed to load",
          })
      );
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
