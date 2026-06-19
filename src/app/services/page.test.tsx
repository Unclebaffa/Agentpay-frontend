import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet } from "../../lib/apiClient";
import ServicesPage from "./page";

jest.mock("../../lib/apiClient", () => ({
  apiGet: jest.fn(),
}));

const apiGetMock = apiGet as jest.MockedFunction<typeof apiGet>;

function service(serviceId: string, priceStroops: number) {
  return { serviceId, priceStroops };
}

describe("ServicesPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("renders a spinner while the first page is loading", () => {
    apiGetMock.mockReturnValueOnce(new Promise(() => undefined) as never);

    render(<ServicesPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("shows the empty state with a New service action when there are no services", async () => {
    apiGetMock.mockResolvedValueOnce({
      services: [],
      page: 1,
      pageCount: 1,
    } as never);

    render(<ServicesPage />);

    expect(await screen.findByText(/No services registered yet/i)).toBeInTheDocument();
    const newServiceLinks = screen.getAllByRole("link", { name: /new service/i });
    expect(newServiceLinks).toHaveLength(2);
    expect(newServiceLinks.some((link) => link.getAttribute("href") === "/services/new")).toBe(
      true
    );
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("renders each service row as a link and omits pagination on a single page", async () => {
    apiGetMock.mockResolvedValueOnce({
      services: [service("svc/1", 42)],
      page: 1,
      pageCount: 1,
    } as never);

    render(<ServicesPage />);

    const rowLink = await screen.findByRole("link", { name: /svc\/1/i });
    expect(rowLink).toHaveAttribute("href", "/services/svc%2F1");
    expect(screen.getByText(/42 stroops \/ request/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("shows pagination only when there are multiple pages and refetches when Next is clicked", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        services: [service("svc-a", 10)],
        page: 1,
        pageCount: 2,
      } as never)
      .mockResolvedValueOnce({
        services: [service("svc-b", 20)],
        page: 2,
        pageCount: 2,
      } as never);

    render(<ServicesPage />);

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenLastCalledWith("/api/v1/services?page=2&limit=25");
    });

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /svc-b/i })).toHaveAttribute(
      "href",
      "/services/svc-b"
    );
  });

  it("disables Next on the last page", async () => {
    apiGetMock.mockResolvedValueOnce({
      services: [service("svc-last", 77)],
      page: 2,
      pageCount: 2,
    } as never);

    render(<ServicesPage />);

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("clamps an out-of-range page response to the server-provided page", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        services: [service("svc-a", 10)],
        page: 1,
        pageCount: 2,
      } as never)
      .mockResolvedValueOnce({
        services: [service("svc-b", 20)],
        page: 1,
        pageCount: 2,
      } as never);

    render(<ServicesPage />);

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenLastCalledWith("/api/v1/services?page=2&limit=25");
    });

    expect(await screen.findByRole("link", { name: /svc-b/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /svc-a/i })).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /svc-b/i })).toHaveAttribute(
      "href",
      "/services/svc-b"
    );
  });

  it("surfaces backend failures as a role=alert", async () => {
    apiGetMock.mockRejectedValueOnce(new Error("backend unavailable"));

    render(<ServicesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("backend unavailable");
  });
});
