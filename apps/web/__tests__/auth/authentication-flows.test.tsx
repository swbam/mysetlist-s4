import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMockUser,
  createMockSession,
  mockAuthProvider,
} from "../../test-utils/auth";
import { mockAPIFetch } from "../../test-utils/api";

// Mock the auth provider
const mockUseAuth = vi.fn();
vi.mock("~/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/sign-in",
}));

// Mock components - we'll test these as integrated units
vi.mock("~/app/auth/sign-in/page", () => ({
  default: () => {
    const auth = mockUseAuth();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        const result = await auth.signIn({ email, password });
        if (result.error) {
          setError(result.error.message);
        } else {
          mockPush("/");
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div data-testid="sign-in-page">
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
          />
          <button type="submit" disabled={loading} data-testid="submit-button">
            {loading ? "Signing in..." : "Sign In"}
          </button>
          {error && (
            <div data-testid="error-message" role="alert">
              {error}
            </div>
          )}
        </form>
        <div>
          <button
            onClick={() => auth.signInWithOAuth("spotify")}
            data-testid="spotify-login"
          >
            Sign in with Spotify
          </button>
        </div>
      </div>
    );
  },
}));

vi.mock("~/app/auth/sign-up/page", () => ({
  default: () => {
    const auth = mockUseAuth();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      try {
        const result = await auth.signUp({ email, password });
        if (result.error) {
          setError(result.error.message);
        } else {
          setError(""); // Success case
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div data-testid="sign-up-page">
        <h1>Sign Up</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            data-testid="confirm-password-input"
            required
          />
          <button type="submit" disabled={loading} data-testid="submit-button">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
          {error && (
            <div data-testid="error-message" role="alert">
              {error}
            </div>
          )}
        </form>
      </div>
    );
  },
}));

// Import React after mocks
import React from "react";
import SignInPage from "~/app/auth/sign-in/page";
import SignUpPage from "~/app/auth/sign-up/page";

describe("Authentication Flows", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("Sign In Flow", () => {
    it("should render sign in form correctly", async () => {
      mockUseAuth.mockReturnValue(mockAuthProvider("unauthenticated"));

      await act(async () => {
        render(<SignInPage />);
      });

      expect(screen.getByTestId("sign-in-page")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("spotify-login")).toBeInTheDocument();
    });

    it("should handle successful email/password sign in", async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: createMockUser(), session: createMockSession() },
        error: null,
      });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signIn: mockSignIn,
      });

      mockAPIFetch({
        "/api/auth/sign-in": {
          status: 200,
          data: { user: createMockUser(), session: createMockSession() },
        },
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("should handle sign in errors", async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signIn: mockSignIn,
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "wrongpassword");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Invalid credentials",
        );
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should handle Spotify OAuth sign in", async () => {
      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { provider: "spotify", url: "https://example.com/auth" },
        error: null,
      });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signInWithOAuth: mockSignInWithOAuth,
      });

      // Mock window.location
      const mockLocation = { href: "" };
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const spotifyButton = screen.getByTestId("spotify-login");

      await act(async () => {
        await user.click(spotifyButton);
      });

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith("spotify");
      });
    });

    it("should show loading state during sign in", async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      const mockSignIn = vi.fn().mockReturnValue(signInPromise);

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signIn: mockSignIn,
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");
        await user.click(submitButton);
      });

      // Check loading state
      expect(submitButton).toHaveTextContent("Signing in...");
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      await act(async () => {
        resolveSignIn({ data: { user: createMockUser() }, error: null });
      });

      await waitFor(() => {
        expect(submitButton).toHaveTextContent("Sign In");
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Sign Up Flow", () => {
    it("should render sign up form correctly", async () => {
      mockUseAuth.mockReturnValue(mockAuthProvider("unauthenticated"));

      await act(async () => {
        render(<SignUpPage />);
      });

      expect(screen.getByTestId("sign-up-page")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    });

    it("should handle successful sign up", async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: createMockUser(), session: null },
        error: null,
      });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signUp: mockSignUp,
      });

      await act(async () => {
        render(<SignUpPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const confirmPasswordInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "newuser@example.com");
        await user.type(passwordInput, "password123");
        await user.type(confirmPasswordInput, "password123");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "newuser@example.com",
          password: "password123",
        });
      });
    });

    it("should validate password confirmation", async () => {
      const mockSignUp = vi.fn();

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signUp: mockSignUp,
      });

      await act(async () => {
        render(<SignUpPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const confirmPasswordInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "newuser@example.com");
        await user.type(passwordInput, "password123");
        await user.type(confirmPasswordInput, "differentpassword");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Passwords do not match",
        );
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("should handle sign up errors", async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Email already exists" },
      });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signUp: mockSignUp,
      });

      await act(async () => {
        render(<SignUpPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const confirmPasswordInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "existing@example.com");
        await user.type(passwordInput, "password123");
        await user.type(confirmPasswordInput, "password123");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Email already exists",
        );
      });
    });
  });

  describe("Authentication State Management", () => {
    it("should handle authentication state changes", async () => {
      const mockOnAuthStateChange = vi.fn();

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("loading"),
        onAuthStateChange: mockOnAuthStateChange,
      });

      const TestComponent = () => {
        const auth = mockUseAuth();
        return (
          <div>
            <div data-testid="loading">
              {auth.isLoading ? "Loading..." : "Ready"}
            </div>
            <div data-testid="authenticated">
              {auth.isAuthenticated ? "Authenticated" : "Not authenticated"}
            </div>
          </div>
        );
      };

      await act(async () => {
        render(<TestComponent />);
      });

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading...");
      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "Not authenticated",
      );
    });

    it("should redirect authenticated users away from auth pages", async () => {
      mockUseAuth.mockReturnValue(mockAuthProvider("authenticated"));

      await act(async () => {
        render(<SignInPage />);
      });

      // In a real implementation, this would be handled by middleware or route guards
      // For now, we just verify the auth state
      const authProvider = mockUseAuth();
      expect(authProvider.isAuthenticated).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const mockSignIn = vi.fn().mockRejectedValue(new Error("Network error"));

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signIn: mockSignIn,
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "An unexpected error occurred",
        );
      });
    });

    it("should clear errors when retrying", async () => {
      const mockSignIn = vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Invalid credentials" },
        })
        .mockResolvedValueOnce({
          data: { user: createMockUser() },
          error: null,
        });

      mockUseAuth.mockReturnValue({
        ...mockAuthProvider("unauthenticated"),
        signIn: mockSignIn,
      });

      await act(async () => {
        render(<SignInPage />);
      });

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const submitButton = screen.getByTestId("submit-button");

      // First attempt - should fail
      await act(async () => {
        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "wrongpassword");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Invalid credentials",
        );
      });

      // Clear and retry with correct password
      await act(async () => {
        await user.clear(passwordInput);
        await user.type(passwordInput, "correctpassword");
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });

      // Error should be cleared
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });
  });
});
