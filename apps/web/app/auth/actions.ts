"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

// Validation schemas
const signUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Sign up action
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  // Validate form data
  const validationResult = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validationResult.success) {
    const firstError = Object.values(
      validationResult.error.flatten().fieldErrors,
    )[0]?.[0];
    redirect(
      `/auth/sign-up?error=${encodeURIComponent(firstError || "Validation error")}`,
    );
  }

  const { email, password } = validationResult.data;

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  // Check if email confirmation is required
  if (data?.user && !data.session) {
    redirect(
      `/auth/sign-up?message=${encodeURIComponent("Please check your email to confirm your account.")}`,
    );
  }

  // If user is immediately signed in (no email confirmation required)
  if (data?.session) {
    redirect("/");
  }

  redirect(
    `/auth/sign-up?message=${encodeURIComponent("Account created successfully!")}`,
  );
}

// Sign in action
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  // Validate form data
  const validationResult = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validationResult.success) {
    const firstError = Object.values(
      validationResult.error.flatten().fieldErrors,
    )[0]?.[0];
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(firstError || "Validation error")}`,
    );
  }

  const { email, password } = validationResult.data;
  // const rememberMe = formData.get('remember') === 'on'; // TODO: Implement remember me functionality

  // Sign in the user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorMessage =
      error.message === "Invalid login credentials"
        ? "Invalid email or password"
        : error.message;
    redirect(`/auth/sign-in?error=${encodeURIComponent(errorMessage)}`);
  }

  // Get the redirect URL from the query params or default to home
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  redirect(redirectTo);
}

// Sign in with OAuth provider
export async function signInWithProvider(provider: "spotify" | "google") {
  const supabase = await createClient();

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  const options: any = { redirectTo };
  if (provider === "spotify") {
    options.scopes =
      "user-read-email user-read-private user-top-read user-read-recently-played";
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  if (data?.url) {
    redirect(data.url);
  }

  return {
    error: {
      message: "Failed to initiate OAuth flow",
    },
  };
}

// Sign out action
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  redirect("/");
}

// Reset password action
export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email || !z.string().email().safeParse(email).success) {
    return {
      error: {
        message: "Please provide a valid email address",
      },
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {
    success: true,
    message: "Password reset instructions have been sent to your email.",
  };
}

// Update password action (for password reset flow)
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validate passwords
  if (!password || password.length < 8) {
    return {
      error: {
        message: "Password must be at least 8 characters long",
      },
    };
  }

  if (password !== confirmPassword) {
    return {
      error: {
        message: "Passwords do not match",
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  redirect("/");
}
