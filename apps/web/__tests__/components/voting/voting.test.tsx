import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RealtimeVoting } from "~/app/components/realtime-voting";
import { RealtimeProvider } from "~/app/providers/realtime-provider";

// Mock fetch
global.fetch = vi.fn();

// Mock Supabase client
vi.mock("~/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  }),
}));

const mockVoteData = {
  upvotes: 5,
  downvotes: 2,
  netVotes: 3,
  userVote: null as "up" | "down" | null,
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(<RealtimeProvider>{component}</RealtimeProvider>);
};

describe("RealtimeVoting Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it("renders vote counts correctly", () => {
    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument(); // upvotes
    expect(screen.getByText("2")).toBeInTheDocument(); // downvotes
    expect(screen.getByText("+3")).toBeInTheDocument(); // net votes
  });

  it("handles upvote correctly", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        userVote: "up",
        upvotes: 6,
        downvotes: 2,
        netVotes: 4,
      }),
    });

    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    const upvoteButton = screen.getByRole("button", { name: /5/ });
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId: "test-song-id",
          voteType: "up",
        }),
      });
    });
  });

  it("handles downvote correctly", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        userVote: "down",
        upvotes: 5,
        downvotes: 3,
        netVotes: 2,
      }),
    });

    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    const downvoteButton = screen.getByRole("button", { name: /2/ });
    fireEvent.click(downvoteButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId: "test-song-id",
          voteType: "down",
        }),
      });
    });
  });

  it("shows login prompt when user is not authenticated", () => {
    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId={undefined}
      />,
    );

    const upvoteButton = screen.getByRole("button", { name: /5/ });
    expect(upvoteButton).toBeDisabled();
  });

  it("handles API errors gracefully", async () => {
    (fetch as any).mockRejectedValueOnce(new Error("API Error"));

    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    const upvoteButton = screen.getByRole("button", { name: /5/ });
    fireEvent.click(upvoteButton);

    // Should revert to original state on error
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("+3")).toBeInTheDocument();
    });
  });

  it("implements optimistic updates", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (fetch as any).mockReturnValueOnce(promise);

    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    const upvoteButton = screen.getByRole("button", { name: /5/ });
    fireEvent.click(upvoteButton);

    // Should immediately show optimistic update
    expect(screen.getByText("6")).toBeInTheDocument(); // upvotes increased
    expect(screen.getByText("+4")).toBeInTheDocument(); // net votes increased

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        success: true,
        userVote: "up",
        upvotes: 6,
        downvotes: 2,
        netVotes: 4,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("+4")).toBeInTheDocument();
    });
  });

  it("prevents double voting while request is in progress", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (fetch as any).mockReturnValueOnce(promise);

    renderWithProvider(
      <RealtimeVoting
        setlistSongId="test-song-id"
        initialVotes={mockVoteData}
        userId="test-user-id"
      />,
    );

    const upvoteButton = screen.getByRole("button", { name: /5/ });

    // First click
    fireEvent.click(upvoteButton);

    // Second click should be ignored
    fireEvent.click(upvoteButton);

    expect(fetch).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        success: true,
        userVote: "up",
        upvotes: 6,
        downvotes: 2,
        netVotes: 4,
      }),
    });
  });
});
