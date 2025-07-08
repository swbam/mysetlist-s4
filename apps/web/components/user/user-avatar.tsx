'use client';

import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Crown, Music, Shield, User } from 'lucide-react';

interface UserAvatarProps {
  user: {
    id: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    role?: 'user' | 'moderator' | 'admin';
    verified?: boolean;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  showRole?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export function UserAvatar({
  user,
  size = 'md',
  showBadge = true,
  showRole = false,
  className,
}: UserAvatarProps) {
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin':
        return <Crown className={cn(iconSizes[size], 'text-yellow-500')} />;
      case 'moderator':
        return <Shield className={cn(iconSizes[size], 'text-blue-500')} />;
      default:
        return <User className={cn(iconSizes[size])} />;
    }
  };

  const getRoleBadge = () => {
    if (!showRole || user.role === 'user') return null;

    const roleConfig = {
      admin: {
        label: 'Admin',
        variant: 'default' as const,
        className: 'bg-yellow-100 text-yellow-800',
      },
      moderator: {
        label: 'Mod',
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800',
      },
    };

    const config = roleConfig[user.role as keyof typeof roleConfig];
    if (!config) return null;

    return (
      <Badge
        variant={config.variant}
        className={cn('text-xs', config.className)}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], className)}>
          <AvatarImage src={user.avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 font-medium text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Verification Badge */}
        {showBadge && user.verified && (
          <div className="-bottom-1 -right-1 absolute rounded-full bg-green-500 p-1">
            <Music className="h-2 w-2 text-white" />
          </div>
        )}

        {/* Role Indicator */}
        {showBadge && user.role && user.role !== 'user' && (
          <div className="-top-1 -right-1 absolute rounded-full bg-white p-0.5 shadow-sm">
            {getRoleIcon()}
          </div>
        )}
      </div>

      {/* Role Badge */}
      {getRoleBadge()}
    </div>
  );
}

// Component for user display with name
interface UserDisplayProps extends UserAvatarProps {
  showName?: boolean;
  showEmail?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export function UserDisplay({
  user,
  showName = true,
  showEmail = false,
  layout = 'horizontal',
  ...avatarProps
}: UserDisplayProps) {
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  if (layout === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <UserAvatar user={user} {...avatarProps} />
        {showName && (
          <div className="space-y-1">
            <p className="font-medium text-sm">{displayName}</p>
            {showEmail && user.email && (
              <p className="text-muted-foreground text-xs">{user.email}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <UserAvatar user={user} {...avatarProps} />
      {showName && (
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{displayName}</p>
          {showEmail && user.email && (
            <p className="truncate text-muted-foreground text-xs">
              {user.email}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Minimal avatar for comments, lists, etc.
export function UserAvatarMini({ user, className, ...props }: UserAvatarProps) {
  return (
    <UserAvatar
      user={user}
      size="xs"
      showBadge={false}
      showRole={false}
      className={cn('border', className)}
      {...props}
    />
  );
}
