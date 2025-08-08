import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoteButton } from "~/components/voting/vote-button";

describe("VoteButton", () => {
  it("renders upvote button and count", () => {
    render(<VoteButton setlistSongId="test-song-id" upvotes={10} />);
    expect(screen.getByLabelText(/upvote/i)).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();
  });

  it("calls onVote with up on click", () => {
    const onVote = vi.fn();
    render(<VoteButton setlistSongId="test-song-id" upvotes={10} onVote={onVote} />);
    const upvoteButton = screen.getByTestId("vote-up");
    fireEvent.click(upvoteButton);
    expect(onVote).toHaveBeenCalledWith("up");
  });

  it("toggles to null when already upvoted", () => {
    const onVote = vi.fn();
    render(
      <VoteButton setlistSongId="test-song-id" upvotes={10} currentVote="up" onVote={onVote} />,
    );
    const upvoteButton = screen.getByTestId("vote-up");
    fireEvent.click(upvoteButton);
    expect(onVote).toHaveBeenCalledWith(null);
  });

  it("has proper ARIA attributes", () => {
    render(<VoteButton setlistSongId="test-song-id" upvotes={10} />);
    const upvoteButton = screen.getByTestId("vote-up");
    expect(upvoteButton).toHaveAttribute("aria-label", "Upvote song");
    expect(upvoteButton).toHaveAttribute("aria-pressed", "false");
  });
});
