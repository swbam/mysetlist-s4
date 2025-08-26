"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/alert";
import { Button } from "@repo/design-system/button";
import { Checkbox } from "@repo/design-system/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/dialog";
import { Input } from "@repo/design-system/input";
import { Label } from "@repo/design-system/label";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../providers/auth-provider";

export function DeleteAccountDialog() {
  const router = useRouter();
  const { user: _user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<
    "confirm" | "verify" | "deleting" | "success"
  >("confirm");
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!password || confirmationText !== "DELETE" || !confirmDeletion) {
      setError("Please complete all required fields");
      return;
    }

    setStep("deleting");
    setError(null);

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmationText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      setStep("success");

      // Sign out and redirect after a short delay
      setTimeout(async () => {
        await signOut();
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting your account");
      setStep("verify");
    }
  };

  const resetDialog = () => {
    setStep("confirm");
    setPassword("");
    setConfirmationText("");
    setConfirmDeletion(false);
    setError(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    if (step !== "deleting") {
      setIsOpen(false);
      resetDialog();
    }
  };

  const isVerifyStepValid =
    password && confirmationText === "DELETE" && confirmDeletion;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setIsOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This action will permanently delete your TheSet account and all
                associated data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This action cannot be undone.</strong> All of the
                  following will be permanently deleted:
                </AlertDescription>
              </Alert>

              <ul className="ml-4 space-y-2 text-sm">
                <li>• Your profile and account information</li>
                <li>• All your votes and setlist contributions</li>
                <li>• Your following list and preferences</li>
                <li>• All activity history and data</li>
                <li>• Email notification preferences</li>
              </ul>

              <Alert>
                <AlertDescription>
                  If you're having issues with your account, consider contacting
                  support instead of deleting your account.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep("verify")}
                className="w-full sm:w-auto"
              >
                Continue with Deletion
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Verify Account Deletion
              </DialogTitle>
              <DialogDescription>
                Please confirm your password and type "DELETE" to proceed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="delete-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type "DELETE" to confirm (case sensitive)
                </Label>
                <Input
                  id="delete-confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type DELETE here"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm-deletion"
                  checked={confirmDeletion}
                  onCheckedChange={(checked) =>
                    setConfirmDeletion(checked === true)
                  }
                />
                <Label htmlFor="confirm-deletion" className="text-sm leading-5">
                  I understand that this action is permanent and cannot be
                  undone. I want to delete my account and all my data.
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setStep("confirm")}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isVerifyStepValid}
                className="w-full sm:w-auto"
              >
                Delete My Account
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "deleting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Deleting Account
              </DialogTitle>
              <DialogDescription>
                Please wait while we delete your account and all associated
                data...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-center text-muted-foreground text-sm">
                This may take a few moments. Please do not close this window.
              </p>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Account Deleted
              </DialogTitle>
              <DialogDescription>
                Your account has been successfully deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
              <p className="mb-2 text-center text-sm">
                Your TheSet account and all associated data have been
                permanently deleted.
              </p>
              <p className="text-center text-muted-foreground text-xs">
                You will be signed out and redirected to the homepage shortly.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
