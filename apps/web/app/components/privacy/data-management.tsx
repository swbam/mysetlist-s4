"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system";
import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  EyeOff,
  Shield,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface UserData {
  profile: {
    email: string;
    displayName?: string;
    createdAt: string;
    lastLoginAt?: string;
  };
  activity: {
    totalVotes: number;
    followedArtists: number;
    attendedShows: number;
    lastActivity: string;
  };
  preferences: {
    emailNotifications: boolean;
    publicProfile: boolean;
    dataSharing: boolean;
  };
}

interface DataExportRequest {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

interface DataManagementProps {
  userData: UserData;
  userId: string;
}

export function DataManagement({ userData, userId }: DataManagementProps) {
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const requestDataExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExportRequests((prev) => [data.exportRequest, ...prev]);
      } else {
        throw new Error("Failed to request data export");
      }
    } catch (error) {
      console.error("Error requesting data export:", error);
      alert("Failed to request data export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmationText !== "DELETE MY ACCOUNT") {
      alert('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: deleteConfirmationText,
        }),
      });

      if (response.ok) {
        // Redirect to goodbye page
        window.location.href = "/auth/account-deleted";
      } else {
        throw new Error("Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please contact support.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const updatePrivacyPreference = async (
    preference: keyof UserData["preferences"],
    value: boolean,
  ) => {
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [preference]: value,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }
    } catch (error) {
      console.error("Error updating preference:", error);
      alert("Failed to update preference. Please try again.");
    }
  };

  const getStatusIcon = (status: DataExportRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DataExportRequest["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data & Privacy</h1>
        <p className="text-muted-foreground">
          Manage your personal data and privacy settings
        </p>
      </div>

      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {userData.activity.totalVotes}
              </div>
              <div className="text-sm text-muted-foreground">Votes Cast</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {userData.activity.followedArtists}
              </div>
              <div className="text-sm text-muted-foreground">
                Artists Followed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {userData.activity.attendedShows}
              </div>
              <div className="text-sm text-muted-foreground">
                Shows Attended
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Member Since</div>
              <div className="text-sm text-muted-foreground">
                {new Date(userData.profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive updates about shows and artists you follow
              </div>
            </div>
            <Button
              variant={
                userData.preferences.emailNotifications ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                updatePrivacyPreference(
                  "emailNotifications",
                  !userData.preferences.emailNotifications,
                )
              }
            >
              {userData.preferences.emailNotifications ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Public Profile</div>
              <div className="text-sm text-muted-foreground">
                Allow others to see your voting activity and followed artists
              </div>
            </div>
            <Button
              variant={
                userData.preferences.publicProfile ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                updatePrivacyPreference(
                  "publicProfile",
                  !userData.preferences.publicProfile,
                )
              }
              className="gap-2"
            >
              {userData.preferences.publicProfile ? (
                <>
                  <Eye className="h-4 w-4" />
                  Public
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Private
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Data Sharing</div>
              <div className="text-sm text-muted-foreground">
                Share anonymized data to improve recommendations
              </div>
            </div>
            <Button
              variant={userData.preferences.dataSharing ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updatePrivacyPreference(
                  "dataSharing",
                  !userData.preferences.dataSharing,
                )
              }
            >
              {userData.preferences.dataSharing ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Download a copy of all your data including profile information,
            votes, and activity history.
          </p>

          <Button
            onClick={requestDataExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Requesting Export..." : "Request Data Export"}
          </Button>

          {exportRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Export Requests</h4>
              {exportRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <div className="font-medium">
                        Requested{" "}
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(request.status)}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  {request.status === "completed" && request.downloadUrl && (
                    <Button size="sm" asChild>
                      <a href={request.downloadUrl} download>
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. All your
              data including votes, followed artists, and account information
              will be permanently deleted.
            </AlertDescription>
          </Alert>

          {!showDeleteConfirmation ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirmation(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type "DELETE MY ACCOUNT" to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  disabled={
                    isDeletingAccount ||
                    deleteConfirmationText !== "DELETE MY ACCOUNT"
                  }
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeletingAccount ? "Deleting..." : "Confirm Deletion"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setDeleteConfirmationText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
