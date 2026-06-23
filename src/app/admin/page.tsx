"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusDot } from "@/components/StatusDot";
import { useToast } from "@/components/ToastProvider";

type AdminStatus = { paused: boolean };

type ToggleKind = "pause" | "unpause";

type ToggleState = {
  paused: boolean;
  kind: ToggleKind;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
};

const getToggleState = (paused: boolean): ToggleState => {
  if (paused) {
    return {
      paused,
      kind: "unpause",
      confirmTitle: "Resume writes?",
      confirmDescription:
        "This will re-enable all backend writes across the protocol.",
      confirmLabel: "Resume",
    };
  }

  return {
    paused,
    kind: "pause",
    confirmTitle: "Pause all writes?",
    confirmDescription:
      "This will immediately disable all backend writes across the protocol.",
    confirmLabel: "Pause",
  };
};

export default function AdminPage() {
  const toast = useToast();

  const [paused, setPaused] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Used to detect and avoid stale status overwrites if an external change
  // happens concurrently with our toggle request.
  const [statusSeq, setStatusSeq] = useState(0);

  const load = useCallback(async () => {
    const seq = statusSeq + 1;
    setStatusSeq(seq);
    setError(null);
    try {
      const b = await apiGet<AdminStatus>("/api/v1/admin/status");
      // Only accept the latest load result.
      setPaused((prev) => {
        // if paused changes between seq scheduling, allow overwrite.
        // guarding with seq below ensures the latest promise wins.
        return b.paused;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [statusSeq]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleState = useMemo(() => {
    if (paused === null) return null;
    return getToggleState(paused);
  }, [paused]);

  const endpoint = useMemo(() => {
    if (!toggleState) return null;
    return toggleState.kind === "pause"
      ? "/api/v1/admin/pause"
      : "/api/v1/admin/unpause";
  }, [toggleState]);

  const refreshAfterAction = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await load();
  }, [load]);

  const onConfirm = useCallback(async () => {
    if (paused === null || !endpoint) return;

    setConfirmOpen(false);
    setError(null);
    setPending(true);

    try {
      await apiPost(endpoint, {});
      toast.push("Admin pause toggle applied.", "info");
      await refreshAfterAction();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast.push(message, "error");
    } finally {
      setPending(false);
    }
  }, [endpoint, paused, refreshAfterAction, toast]);

  const onOpenConfirm = useCallback(() => {
    if (paused === null) return;
    if (pending) return;
    setConfirmOpen(true);
  }, [paused, pending]);

  const statusVariant = paused ? "down" : "ok";

  const toggleButtonLabel = paused ? "Unpause" : "Pause";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col gap-6 p-8 focus:outline-none"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>

      {paused === null && !error && <p>Loading status…</p>}

      {paused !== null && (
        <section className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <StatusDot variant={statusVariant} />
            <p>
              Status: <strong>{paused ? "Paused" : "Live"}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenConfirm}
            disabled={pending}
            aria-disabled={pending}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {pending ? "Working…" : toggleButtonLabel}
          </button>
        </section>
      )}

      {confirmOpen && toggleState && endpoint && (
        <ConfirmDialog
          open={confirmOpen}
          title={toggleState.confirmTitle}
          description={toggleState.confirmDescription}
          confirmLabel={toggleState.confirmLabel}
          cancelLabel="Cancel"
          onConfirm={() => {
            void onConfirm();
          }}
          onCancel={() => {
            if (pending) return;
            setConfirmOpen(false);
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}

