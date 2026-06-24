import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";

import { useLocalState } from "../useLocalState";

function renderToString(element: ReactElement) {
  return (
    // Use the Node server renderer in Jest's jsdom environment.
    jest.requireActual<typeof import("react-dom/server")>("react-dom/server.node")
      .renderToString
  )(element);
}

function Probe({
  storageKey,
  initial,
  next = "updated",
  onRender,
}: {
  storageKey: string;
  initial: string;
  next?: string;
  onRender?: (value: string) => void;
}) {
  const [value, setValue] = useLocalState(storageKey, initial);
  onRender?.(value);

  return (
    <div>
      <output data-testid="value">{value}</output>
      <button type="button" onClick={() => setValue(next)}>
        update
      </button>
    </div>
  );
}

describe("useLocalState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it("renders the fallback on the server and hydrates from localStorage after mount", async () => {
    const storageKey = "agentpay.useLocalState.ssr";
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
    const onRender = jest.fn();

    const serverHtml = renderToString(
      <Probe storageKey={storageKey} initial="fallback" />
    );

    expect(serverHtml).toContain("fallback");
    expect(getItemSpy).not.toHaveBeenCalled();

    window.localStorage.setItem(storageKey, JSON.stringify("persisted"));

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    let root: Root | null = null;
    await act(async () => {
      root = hydrateRoot(
        container,
        <Probe
          storageKey={storageKey}
          initial="fallback"
          onRender={onRender}
        />
      );
    });

    expect(onRender.mock.calls[0]?.[0]).toBe("fallback");

    await waitFor(() => {
      expect(onRender).toHaveBeenLastCalledWith("persisted");
      expect(screen.getByTestId("value")).toHaveTextContent("persisted");
    });
    expect(getItemSpy).toHaveBeenCalledWith(storageKey);

    expect(root).not.toBeNull();
    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it("writes the next value to state and localStorage", () => {
    const storageKey = "agentpay.useLocalState.write";

    const { getByRole } = render(
      <Probe storageKey={storageKey} initial="fallback" next="saved value" />
    );

    fireEvent.click(getByRole("button", { name: "update" }));

    expect(screen.getByTestId("value")).toHaveTextContent("saved value");
    expect(window.localStorage.getItem(storageKey)).toBe(
      JSON.stringify("saved value")
    );
  });

  it("keeps the fallback when localStorage has no value for the key", async () => {
    const storageKey = "agentpay.useLocalState.missing";

    render(<Probe storageKey={storageKey} initial="fallback" />);

    await act(async () => {});

    expect(screen.getByTestId("value")).toHaveTextContent("fallback");
  });

  it("keeps the fallback when localStorage contains invalid JSON", async () => {
    const storageKey = "agentpay.useLocalState.invalid";
    window.localStorage.setItem(storageKey, "{not-json");

    render(<Probe storageKey={storageKey} initial="fallback" />);

    await act(async () => {});

    expect(screen.getByTestId("value")).toHaveTextContent("fallback");
  });

  it("updates React state even when localStorage.setItem throws", () => {
    const storageKey = "agentpay.useLocalState.quota";
    const setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    const { getByRole } = render(
      <Probe storageKey={storageKey} initial="fallback" next="state only" />
    );

    expect(() =>
      fireEvent.click(getByRole("button", { name: "update" }))
    ).not.toThrow();

    expect(screen.getByTestId("value")).toHaveTextContent("state only");
    expect(setItemSpy).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify("state only")
    );
  });
});
