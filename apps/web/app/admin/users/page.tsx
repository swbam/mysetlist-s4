import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { format } from "date-fns";
import { AlertTriangle, Ban, Download, Filter, Search } from "lucide-react";
import { createClient } from "~/lib/supabase/server";
import UserActionsDialog from "./components/user-actions-dialog";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();

  // Fetch users with additional info
  const { data: users } = await supabase
    .from("users")
    .select(
      `
      *,
      user_profiles (
        concert_count,
        is_public
      ),
      _count:votes(count),
      _setlists:setlists(count),
      _reviews:venue_reviews(count),
      _photos:venue_photos(count)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  // Get ban information
  const { data: activeBans } = await supabase
    .from("user_bans")
    .select("user_id")
    .is("lifted_at", null);

  const bannedUserIds = new Set(activeBans?.map((ban) => ban.user_id) ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">User Management</h1>
          <p className="mt-2 text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Users
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                <DropdownMenuItem>All Users</DropdownMenuItem>
                <DropdownMenuItem>Admins</DropdownMenuItem>
                <DropdownMenuItem>Moderators</DropdownMenuItem>
                <DropdownMenuItem>Regular Users</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuItem>Active</DropdownMenuItem>
                <DropdownMenuItem>Banned</DropdownMenuItem>
                <DropdownMenuItem>Warned</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => {
                const isBanned = bannedUserIds.has(user.id);
                const hasWarnings = user.warning_count > 0;

                return (
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
                            {user.display_name || "Anonymous"}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin"
                            ? "destructive"
                            : user.role === "moderator"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isBanned ? (
                        <Badge variant="destructive">
                          <Ban className="mr-1 h-3 w-3" />
                          Banned
                        </Badge>
                      ) : hasWarnings ? (
                        <Badge variant="outline" className="text-yellow-600">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {user.warning_count} warning
                          {user.warning_count > 1 ? "s" : ""}
                        </Badge>
                      ) : user.email_verified ? (
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{user._setlists?.[0]?.count ?? 0} setlists</p>
                        <p className="text-muted-foreground">
                          {user._reviews?.[0]?.count ?? 0} reviews,{" "}
                          {user._photos?.[0]?.count ?? 0} photos
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
                      <UserActionsDialog user={user} isBanned={isBanned} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
