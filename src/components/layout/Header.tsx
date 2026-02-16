'use client';

import { User, Center } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  user: User;
  centers: Center[];
  selectedCenterId: string | null;
  onCenterChange: (centerId: string) => void;
  onSignOut: () => void;
  onMenuClick: () => void;
}

export function Header({
  user,
  centers,
  selectedCenterId,
  onCenterChange,
  onSignOut,
  onMenuClick,
}: HeaderProps) {
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : (user.email?.[0] || 'U').toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden -ml-2"
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Center selector */}
          {centers.length > 1 && (
            <Select value={selectedCenterId ?? ''} onValueChange={onCenterChange}>
              <SelectTrigger className="w-36 sm:w-48">
                <SelectValue placeholder="Select center" />
              </SelectTrigger>
              <SelectContent>
                {user.role === 'super_admin' && (
                  <SelectItem value="all">All Centers</SelectItem>
                )}
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {centers.length === 1 && (
            <span className="text-sm font-medium text-gray-700">
              {centers[0].name}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 focus:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user.name || user.email.split('@')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name || 'User'}</span>
                <span className="text-xs font-normal text-gray-500 truncate">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
