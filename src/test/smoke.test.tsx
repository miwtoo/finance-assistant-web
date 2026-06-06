import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomePage } from "../features/home/HomePage.tsx";

const mockDraft = {
  amount: 350,
  currency: "THB",
  description: "Lunch at food court",
  spentAt: "2026-06-06",
  merchant: "Food Court",
  categoryHint: "food",
  confidence: 0.95,
  rawText: "Paid 350 baht for lunch at the food court today",
};

describe("HomePage", () => {
  beforeEach(() => {
    // Mock fetch to avoid real API calls
    globalThis.fetch = vi.fn();
    // Clear localStorage
    localStorage.clear();
  });

  it("renders heading", () => {
    render(<HomePage />);
    expect(screen.getByText("Finance Assistant")).toBeInTheDocument();
  });

  it("renders input area and parse button", () => {
    render(<HomePage />);
    expect(
      screen.getByPlaceholderText(/e\.g\. Paid 350 baht/),
    ).toBeInTheDocument();
    expect(screen.getByText("Parse with AI")).toBeInTheDocument();
  });

  it("mock parse → edit amount & description → confirm locally and assert confirmed draft", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft: mockDraft }),
    });

    render(<HomePage />);

    // Type input text
    const input = screen.getByPlaceholderText(/e\.g\. Paid 350 baht/);
    fireEvent.change(input, {
      target: { value: "Paid 350 baht for lunch at the food court today" },
    });

    // Click parse button
    fireEvent.click(screen.getByText("Parse with AI"));

    // Wait for draft card to appear
    await waitFor(() => {
      expect(screen.getByText("Parsed Draft")).toBeInTheDocument();
    });

    // Verify initial parsed values are shown
    const amountInput = screen.getByLabelText("Amount") as HTMLInputElement;
    expect(amountInput.value).toBe("350");

    const descInput = screen.getByLabelText("Description") as HTMLInputElement;
    expect(descInput.value).toBe("Lunch at food court");

    // Edit fields
    fireEvent.change(amountInput, { target: { value: "380" } });
    fireEvent.change(descInput, { target: { value: "Lunch at central food court" } });

    // Confirm locally
    fireEvent.click(screen.getByText("Confirm Locally"));

    // Assert confirmed draft appears
    await waitFor(() => {
      expect(screen.getByText("Lunch at central food court")).toBeInTheDocument();
      expect(screen.getByText(/380\.00 THB/)).toBeInTheDocument();
    });

    // Verify draft card is gone after confirm
    expect(screen.queryByText("Parsed Draft")).not.toBeInTheDocument();
  });

  it("shows validation error when amount is empty", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft: mockDraft }),
    });

    render(<HomePage />);

    const input = screen.getByPlaceholderText(/e\.g\. Paid 350 baht/);
    fireEvent.change(input, {
      target: { value: "Paid 350 baht for lunch" },
    });
    fireEvent.click(screen.getByText("Parse with AI"));

    await waitFor(() => {
      expect(screen.getByText("Parsed Draft")).toBeInTheDocument();
    });

    // Clear amount
    const amountInput = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: "" } });

    fireEvent.click(screen.getByText("Confirm Locally"));

    await waitFor(() => {
      expect(
        screen.getByText("Amount must be a positive number."),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error when date is invalid", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft: mockDraft }),
    });

    render(<HomePage />);

    const input = screen.getByPlaceholderText(/e\.g\. Paid 350 baht/);
    fireEvent.change(input, {
      target: { value: "Paid 350 baht for lunch" },
    });
    fireEvent.click(screen.getByText("Parse with AI"));

    await waitFor(() => {
      expect(screen.getByText("Parsed Draft")).toBeInTheDocument();
    });

    // Set invalid date
    const dateInput = screen.getByLabelText("Date (YYYY-MM-DD)") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "not-a-date" } });

    fireEvent.click(screen.getByText("Confirm Locally"));

    await waitFor(() => {
      expect(
        screen.getByText("Date must be in YYYY-MM-DD format."),
      ).toBeInTheDocument();
    });
  });
});
