'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Button } from '@repo/design-system/components/ui/button';
import { Label } from '@repo/design-system/components/ui/label';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@repo/design-system/components/ui/radio-group';
import { Input } from '@repo/design-system/components/ui/input';
import { toast } from '@repo/design-system/components/ui/use-toast';
import { 
  MoreHorizontal, 
  Shield, 
  Ban, 
  AlertTriangle,
  Mail,
  UserCheck,
  UserX,
  Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, addDays } from 'date-fns';

interface UserActionsDialogProps {
  user: any;
  isBanned: boolean;
  locale: string;
}

export default function UserActionsDialog({ user, isBanned, locale }: UserActionsDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'ban' | 'warn' | 'role' | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDays, setBanDays] = useState('7');
  const [newRole, setNewRole] = useState(user.role);
  
  const router = useRouter();
  const supabase = createClient();
  
  const handleBanUser = async () => {
    setLoading(true);
    try {
      const bannedUntil = banType === 'temporary' ? 
        addDays(new Date(), parseInt(banDays)).toISOString() : 
        null;
      
      // Create ban record
      const { error: banError } = await supabase
        .from('user_bans')
        .insert({
          user_id: user.id,
          banned_by: (await supabase.auth.getUser()).data.user?.id,
          reason,
          ban_type: banType,
          banned_until: bannedUntil
        });
      
      if (banError) throw banError;
      
      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: reason,
          banned_until: bannedUntil
        })
        .eq('id', user.id);
      
      if (userError) throw userError;
      
      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'ban_user',
        target_type: 'user',
        target_id: user.id,
        reason,
        metadata: { ban_type: banType, ban_days: banType === 'temporary' ? banDays : null }
      });
      
      toast('User banned', {
        description: `${user.display_name || user.email} has been banned ${banType === 'temporary' ? `for ${banDays} days` : 'permanently'}.`,
      });
      
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast('Error', {
        description: 'Failed to ban user. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLiftBan = async () => {
    setLoading(true);
    try {
      // Find active ban
      const { data: activeBan } = await supabase
        .from('user_bans')
        .select('id')
        .eq('user_id', user.id)
        .is('lifted_at', null)
        .single();
      
      if (activeBan) {
        // Lift ban
        const { error: banError } = await supabase
          .from('user_bans')
          .update({
            lifted_at: new Date().toISOString(),
            lifted_by: (await supabase.auth.getUser()).data.user?.id,
            lift_reason: 'Manual unban by admin'
          })
          .eq('id', activeBan.id);
        
        if (banError) throw banError;
      }
      
      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_until: null
        })
        .eq('id', user.id);
      
      if (userError) throw userError;
      
      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'unban_user',
        target_type: 'user',
        target_id: user.id,
        reason: 'Manual unban'
      });
      
      toast('Ban lifted', {
        description: `The ban on ${user.display_name || user.email} has been lifted.`,
      });
      
      router.refresh();
    } catch (error) {
      toast('Error', {
        description: 'Failed to lift ban. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleWarnUser = async () => {
    setLoading(true);
    try {
      // Update user warning count
      const { error } = await supabase
        .from('users')
        .update({
          warning_count: (user.warning_count || 0) + 1,
          last_warning_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'warn_user',
        target_type: 'user',
        target_id: user.id,
        reason,
        metadata: { warning_count: (user.warning_count || 0) + 1 }
      });
      
      // TODO: Send warning email notification
      
      toast('Warning issued', {
        description: `${user.display_name || user.email} has been warned.`,
      });
      
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast('Error', {
        description: 'Failed to warn user. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoleChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'change_role',
        target_type: 'user',
        target_id: user.id,
        reason: `Role changed from ${user.role} to ${newRole}`,
        metadata: { old_role: user.role, new_role: newRole }
      });
      
      toast('Role updated', {
        description: `${user.display_name || user.email}'s role has been changed to ${newRole}.`,
      });
      
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast('Error', {
        description: 'Failed to update role. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setDialogType('role');
              setDialogOpen(true);
              setNewRole(user.role);
            }}
          >
            <Shield className="mr-2 h-4 w-4" />
            Change Role
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setDialogType('warn');
              setDialogOpen(true);
              setReason('');
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Issue Warning
          </DropdownMenuItem>
          {isBanned ? (
            <DropdownMenuItem
              onClick={handleLiftBan}
              className="text-green-600"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Lift Ban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                setDialogType('ban');
                setDialogOpen(true);
                setReason('');
                setBanType('temporary');
                setBanDays('7');
              }}
              className="text-red-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Ban User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {dialogType === 'ban' && (
            <>
              <DialogHeader>
                <DialogTitle>Ban User</DialogTitle>
                <DialogDescription>
                  Ban {user.display_name || user.email} from the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ban Type</Label>
                  <RadioGroup value={banType} onValueChange={(v) => setBanType(v as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="temporary" id="temporary" />
                      <Label htmlFor="temporary">Temporary</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="permanent" id="permanent" />
                      <Label htmlFor="permanent">Permanent</Label>
                    </div>
                  </RadioGroup>
                </div>
                {banType === 'temporary' && (
                  <div className="space-y-2">
                    <Label htmlFor="days">Duration (days)</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      value={banDays}
                      onChange={(e) => setBanDays(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the reason for this ban..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBanUser}
                  disabled={loading || !reason}
                >
                  {loading ? 'Banning...' : 'Ban User'}
                </Button>
              </DialogFooter>
            </>
          )}
          
          {dialogType === 'warn' && (
            <>
              <DialogHeader>
                <DialogTitle>Issue Warning</DialogTitle>
                <DialogDescription>
                  Send a warning to {user.display_name || user.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                  <p className="text-sm">
                    This user has {user.warning_count || 0} previous warning{(user.warning_count || 0) !== 1 ? 's' : ''}.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warning-reason">Warning Message</Label>
                  <Textarea
                    id="warning-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the warning message..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleWarnUser}
                  disabled={loading || !reason}
                >
                  {loading ? 'Sending...' : 'Issue Warning'}
                </Button>
              </DialogFooter>
            </>
          )}
          
          {dialogType === 'role' && (
            <>
              <DialogHeader>
                <DialogTitle>Change User Role</DialogTitle>
                <DialogDescription>
                  Update role for {user.display_name || user.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Role</Label>
                  <RadioGroup value={newRole} onValueChange={setNewRole}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user">Regular User</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="moderator" id="moderator" />
                      <Label htmlFor="moderator">Moderator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin">Administrator</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRoleChange}
                  disabled={loading || newRole === user.role}
                >
                  {loading ? 'Updating...' : 'Update Role'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}