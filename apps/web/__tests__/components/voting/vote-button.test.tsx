import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteButton } from "~/components/voting/vote-button";
import { mockSupabase } from "~/test-utils";

describe("VoteButton", () => {
  beforeEach(() => {
    mockSupabase();
  });

  it("renders vote buttons correctly", () => {
    render(
      <VoteButton setlistSongId="test-song-id" upvotes={10} downvotes={2} />,
    );

    expect(screen.getByLabelText(/upvote/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/downvote/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("handles upvote click for authenticated user", async () => {
    const onVote = vi.fn();
    render(
      <VoteButton
        setlistSongId="test-song-id"
        upvotes={10}
        downvotes={2}
        onVote={onVote}
      />,
    );

    const upvoteButton = screen.getByLabelText(/upvote/i);

    await act(async () => {
      fireEvent.click(upvoteButton);
    });

    await waitFor(() => {
      expect(onVote).toHaveBeenCalled();
      expect(screen.getByText("11")).toBeInTheDocument();
    });
  });

  it("shows auth prompt for anonymous users", async () => {
    vi.mock("~/lib/supabase/server", () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      })),
    }));

    render(
      <VoteButton setlistSongId="test-song-id" upvotes={10} downvotes={2} />,
    );

    const upvoteButton = screen.getByLabelText(/upvote/i);

    await act(async () => {
      fireEvent.click(upvoteButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });

  it("toggles vote when clicking same button", async () => {
    render(
      <VoteButton
        setlistSongId="test-song-id"
        upvotes={10}
        downvotes={2}
        currentVote="up"
      />,
    );

    const upvoteButton = screen.getByLabelText(/upvote/i);

    await act(async () => {
      fireEvent.click(upvoteButton);
    });

    await waitFor(() => {
      expect(screen.getByText("9")).toBeInTheDocument();
    });
  });

  it("switches vote from up to down", async () => {
    render(
      <VoteButton
        setlistSongId="test-song-id"
        upvotes={10}
        downvotes={2}
        currentVote="up"
      />,
    );

    const downvoteButton = screen.getByLabelText(/downvote/i);

    await act(async () => {
      fireEvent.click(downvoteButton);
    });

    await waitFor(() => {
      expect(screen.getByText("9")).toBeInTheDocument(); // upvotes decreased
      expect(screen.getByText("3")).toBeInTheDocument(); // downvotes increased
    });
  });

  it("handles API errors gracefully", async () => {
    const mockError = new Error("API Error");
    vi.mock("~/lib/supabase/server", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockRejectedValue(mockError),
      })),
    }));

    render(
      <VoteButton
        setlistSongId="test-song-id"
        initialVotes={{ upvotes: 10, downvotes: 2 }}
      />,
    );

    const upvoteButton = screen.getByTestId("vote-up");

    await act(async () => {
      fireEvent.click(upvoteButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to record vote")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument(); // Vote count unchanged
    });
  });

  it("prevents multiple simultaneous votes", async () => {
    const onVote = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

    render(
      <VoteButton
        setlistSongId="test-song-id"
        initialVotes={{ upvotes: 10, downvotes: 2 }}
        onVote={onVote}
      />,
    );

    const upvoteButton = screen.getByTestId("vote-up");

    // Click multiple times quickly
    await act(async () => {
      fireEvent.click(upvoteButton);
      fireEvent.click(upvoteButton);
      fireEvent.click(upvoteButton);
    });

    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("updates optimistically", async () => {
    render(
      <VoteButton
        setlistSongId="test-song-id"
        initialVotes={{ upvotes: 10, downvotes: 2 }}
        optimistic={true}
      />,
    );

    const upvoteButton = screen.getByTestId("vote-up");

    await act(async () => {
      fireEvent.click(upvoteButton);
    });

    // Should update immediately
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(
        <VoteButton
          setlistSongId="test-song-id"
          initialVotes={{ upvotes: 10, downvotes: 2 }}
        />,
      );

      const upvoteButton = screen.getByTestId("vote-up");
      const downvoteButton = screen.getByTestId("vote-down");

      expect(upvoteButton).toHaveAttribute("aria-label", "Upvote song");
      expect(downvoteButton).toHaveAttribute("aria-label", "Downvote song");
      expect(upvoteButton).toHaveAttribute("aria-pressed", "false");
    });

    it("is keyboard navigable", async () => {
      render(
        <VoteButton
          setlistSongId="test-song-id"
          initialVotes={{ upvotes: 10, downvotes: 2 }}
        />,
      );

      const upvoteButton = screen.getByTestId("vote-up");
      upvoteButton.focus();

      expect(document.activeElement).toBe(upvoteButton);

      await act(async () => {
        fireEvent.keyDown(upvoteButton, { key: "Enter" });
      });

      expect(screen.getByText("11")).toBeInTheDocument();
    });
  });
});
