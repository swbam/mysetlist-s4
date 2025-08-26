"use client";

export const dynamic = "force-dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/alert";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Input } from "@repo/design-system/input";
import { Label } from "@repo/design-system/label";
import { ArrowLeft, CheckCircle, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../providers/auth-provider";

const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFromReset, setIsFromReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    const fromReset = searchParams.get("from") === "reset";
    setIsFromReset(fromReset);
  }, [searchParams]);

  // Redirect if not authenticated
  if (!session) {
    router.push("/auth/sign-in");
    return null;
  }

  const onSubmit = async (data: UpdatePasswordForm) => {
    setIsLoading(true);
    setError(null);

    try {
      await updatePassword(data.password);
      setSuccess(true);

      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Password Updated!</CardTitle>
              <CardDescription>
                Your password has been successfully updated. You will be
                redirected to your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={isFromReset ? "/auth/sign-in" : "/settings"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isFromReset ? "Back to Sign In" : "Back to Settings"}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Shield className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">
              {isFromReset ? "Reset Your Password" : "Update Your Password"}
            </CardTitle>
            <CardDescription>
              {isFromReset
                ? "Enter a new password for your account"
                : "Choose a new secure password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    {...register("password")}
                    className="mt-1"
                  />
                  {errors.password && (
                    <p className="mt-1 text-destructive text-sm">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="mt-1 text-muted-foreground text-xs">
                    Must be at least 8 characters with uppercase, lowercase, and
                    number
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    {...register("confirmPassword")}
                    className="mt-1"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-destructive text-sm">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-muted-foreground text-sm">
              <Link
                href="/auth/sign-in"
                className="font-medium text-primary hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
