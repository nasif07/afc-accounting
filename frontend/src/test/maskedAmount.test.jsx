import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

import MaskedAmount from "../components/common/MaskedAmount";
import KPICard from "../components/reports/KPICard";

const MASK = "••••••";

describe("MaskedAmount", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    // Flushing inside act(): a still-pending auto-hide fires a setState, and
    // draining it outside act() is what produced the "not wrapped in act"
    // warnings rather than any real problem in the component.
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  // fireEvent/userEvent both need real timers or an explicit advance; clicking
  // the DOM node directly keeps the fake-timer clock authoritative.
  const clickToggle = () => act(() => screen.getByRole("button").click());

  it("hides the amount until the eye is clicked", () => {
    render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);

    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.queryByText("BDT 4,905.00")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Show amount");
  });

  it("reveals the amount on click", () => {
    render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);
    clickToggle();

    expect(screen.getByText("BDT 4,905.00")).toBeInTheDocument();
    expect(screen.queryByText(MASK)).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Hide amount");
  });

  it("stays visible just before 10s and hides itself at 10s", () => {
    render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);
    clickToggle();

    act(() => vi.advanceTimersByTime(9_999));
    expect(screen.getByText("BDT 4,905.00")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.queryByText("BDT 4,905.00")).not.toBeInTheDocument();
  });

  it("re-hides immediately when clicked again, and does not re-hide later", () => {
    render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);

    clickToggle(); // reveal
    clickToggle(); // hide early
    expect(screen.getByText(MASK)).toBeInTheDocument();

    clickToggle(); // reveal again — the first timer must not fire and hide this
    act(() => vi.advanceTimersByTime(9_000));
    expect(screen.getByText("BDT 4,905.00")).toBeInTheDocument();
  });

  it("restarts the countdown on each reveal", () => {
    render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);

    clickToggle();
    act(() => vi.advanceTimersByTime(8_000));
    clickToggle(); // hide
    clickToggle(); // reveal — full 10s again

    act(() => vi.advanceTimersByTime(9_000));
    expect(screen.getByText("BDT 4,905.00")).toBeInTheDocument();
  });

  it("does not update state after unmount", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<MaskedAmount>BDT 4,905.00</MaskedAmount>);

    clickToggle();
    unmount();
    act(() => vi.advanceTimersByTime(20_000));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("KPICard masking", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("masks currency cards by default", () => {
    render(<KPICard title="Total Balance" value={3600} />);

    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Show Total Balance");
  });

  it("leaves count cards (format=text) visible with no toggle", () => {
    render(<KPICard title="Active Accounts" value={3} format="text" />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("honours an explicit maskable on a pre-formatted text card", () => {
    render(<KPICard title="Bank Balance" value="BDT 3,600.00" format="text" maskable />);

    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.queryByText("BDT 3,600.00")).not.toBeInTheDocument();
  });

  it("allows a currency card to opt out", () => {
    render(<KPICard title="Total Debit" value={100} maskable={false} />);

    expect(screen.queryByText(MASK)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
