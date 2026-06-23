import { render, screen } from "@testing-library/react";
import { Spinner } from "../Spinner";

describe("Spinner", () => {
  it("keeps a live loading status available when motion is reduced", () => {
    render(<Spinner />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading");
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
    expect(status.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses a custom accessible loading label", () => {
    render(<Spinner label="Fetching transactions" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Fetching transactions",
    );
  });
});
