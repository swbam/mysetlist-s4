"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle,
  Download,
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
  Search,
  Shield,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  role: "user" | "moderator" | "admin";
  created_at: string;
  last_login_at?: string;
  email_confirmed_at?: string;
  avatar_url?: string;
  is_banned?: boolean;
  ban_reason?: string;
  warning_count?: number;
}

interface UserStats {
  setlists_created: number;
  reviews_written: number;
  votes_cast: number;
  photos_uploaded: number;
}

export default function UserManagementEnhanced() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        throw new Error("Failed to fetch users");
      }
    } catch (_error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`);
      if (response.ok) {
        const stats = await response.json();
        setUserStats(stats);
      }
    } catch (_error) {}
  };

  const handleUserAction = async (
    action: string,
    userId: string,
    data?: any,
  ) => {
    try {
      const response = await fetch("/api/admin/users/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId,
          ...data,
        }),
      });

      if (response.ok) {
        toast.success(`User ${action} successful`);
        fetchUsers(); // Refresh user list
        setShowBanDialog(false);
        setBanReason("");
      } else {
        throw new Error(`Failed to ${action} user`);
      }
    } catch (_error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const openUserDetails = async (user: User) => {
    setSelectedUser(user);
    await fetchUserStats(user.id);
    setShowUserDialog(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" &&
        user.email_confirmed_at &&
        !user.is_banned) ||
      (statusFilter === "banned" && user.is_banned) ||
      (statusFilter === "unverified" && !user.email_confirmed_at);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getUserStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <Badge variant="destructive">Banned</Badge>;
    }
    if (!user.email_confirmed_at) {
      return <Badge variant="secondary">Unverified</Badge>;
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-600">
        Active
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: { variant: "destructive", className: "text-red-600 bg-red-100" },
      moderator: { variant: "default", className: "text-blue-600 bg-blue-100" },
      user: { variant: "secondary", className: "" },
    };

    const config = variants[role] || variants.user;
    return <Badge {...config}>{role}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
          <p className="mt-2 text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Bulk Actions
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{users.length}</div>
            <p className="text-muted-foreground text-xs">
              {users.filter((u) => u.email_confirmed_at).length} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {users.filter((u) => u.email_confirmed_at && !u.is_banned).length}
            </div>
            <p className="text-muted-foreground text-xs">
              {
                users.filter(
                  (u) =>
                    u.last_login_at &&
                    new Date(u.last_login_at) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ).length
              }{" "}
              active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Banned Users</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {users.filter((u) => u.is_banned).length}
            </div>
            <p className="text-muted-foreground text-xs">
              {
                users.filter((u) => u.warning_count && u.warning_count > 0)
                  .length
              }{" "}
              with warnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Staff Members</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600">
              {
                users.filter(
                  (u) => u.role === "admin" || u.role === "moderator",
                ).length
              }
            </div>
            <p className="text-muted-foreground text-xs">
              {users.filter((u) => u.role === "admin").length} admins,{" "}
              {users.filter((u) => u.role === "moderator").length} moderators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || user.email}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <span className="font-medium text-sm">
                            {(user.display_name ||
                              user.email)?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {user.display_name ||
                            user.username ||
                            user.email?.split("@")[0]}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {user.email}
                        </p>
                        {user.warning_count && user.warning_count > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-yellow-600">
                              {user.warning_count} warning
                              {user.warning_count > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getUserStatusBadge(user)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Moderate activity</p>
                      <p className="text-muted-foreground text-xs">
                        Last seen 2 days ago
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openUserDetails(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.role === "user" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUserAction("promote_moderator", user.id)
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Make Moderator
                          </DropdownMenuItem>
                        )}
                        {user.role === "moderator" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUserAction("demote_user", user.id)
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Remove Moderator
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {user.is_banned ? (
                          <DropdownMenuItem
                            onClick={() => handleUserAction("unban", user.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanDialog(true);
                            }}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No users found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about{" "}
              {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="moderation">Moderation</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Basic Information</h4>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <strong>Email:</strong> {selectedUser.email}
                      </div>
                      <div>
                        <strong>Display Name:</strong>{" "}
                        {selectedUser.display_name || "Not set"}
                      </div>
                      <div>
                        <strong>Username:</strong>{" "}
                        {selectedUser.username || "Not set"}
                      </div>
                      <div>
                        <strong>Role:</strong> {getRoleBadge(selectedUser.role)}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        {getUserStatusBadge(selectedUser)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Account Details</h4>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <strong>Joined:</strong>{" "}
                        {format(new Date(selectedUser.created_at), "PPP")}
                      </div>
                      <div>
                        <strong>Last Login:</strong>{" "}
                        {selectedUser.last_login_at
                          ? format(new Date(selectedUser.last_login_at), "PPP")
                          : "Never"}
                      </div>
                      <div>
                        <strong>Email Verified:</strong>{" "}
                        {selectedUser.email_confirmed_at ? (
                          <CheckCircle className="ml-1 inline h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="ml-1 inline h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                {userStats && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Content Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Setlists Created:</span>
                          <span className="font-medium">
                            {userStats.setlists_created}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reviews Written:</span>
                          <span className="font-medium">
                            {userStats.reviews_written}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Votes Cast:</span>
                          <span className="font-medium">
                            {userStats.votes_cast}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Photos Uploaded:</span>
                          <span className="font-medium">
                            {userStats.photos_uploaded}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Engagement</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Profile Views:</span>
                          <span className="font-medium">124</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Followers:</span>
                          <span className="font-medium">23</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Following:</span>
                          <span className="font-medium">45</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reputation Score:</span>
                          <span className="font-medium">87</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="content">
                <p className="text-muted-foreground">
                  User-generated content will be displayed here.
                </p>
              </TabsContent>

              <TabsContent value="moderation">
                <div className="space-y-4">
                  {selectedUser.warning_count &&
                  selectedUser.warning_count > 0 ? (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium">
                            {selectedUser.warning_count} warning
                            {selectedUser.warning_count > 1 ? "s" : ""} on
                            record
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span>No moderation issues on record</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedUser.is_banned && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Ban className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-red-800">
                              User is currently banned
                            </span>
                          </div>
                          {selectedUser.ban_reason && (
                            <p className="text-red-700 text-sm">
                              Reason: {selectedUser.ban_reason}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban{" "}
              {selectedUser?.display_name || selectedUser?.email}? This action
              will prevent them from accessing the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="font-medium text-sm">Reason for ban</label>
              <Textarea
                placeholder="Explain why this user is being banned..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedUser &&
                handleUserAction("ban", selectedUser.id, { reason: banReason })
              }
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
