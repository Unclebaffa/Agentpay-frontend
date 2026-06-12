import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  it("renders the title when provided", () => {
    render(<Card title="My title">body</Card>);
    expect(screen.getByText(/my title/i)).toBeInTheDocument();
    expect(screen.getByText(/body/)).toBeInTheDocument();
  });

  it("renders the footer when provided", () => {
    render(
      <Card title="t" footer={<span>footer-text</span>}>
        body
      </Card>
    );
    expect(screen.getByText(/footer-text/)).toBeInTheDocument();
  });
});
