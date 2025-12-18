/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { useAppSelector } from "@/lib/redux/hook";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";

export default function HeaderDropdown() {
  const user = useAppSelector((state) => state.user.user);
  const { theme, toggleTheme, mounted } = useTheme();

  // Get avatar URL from user_meta or user_metadata (Supabase uses user_metadata)
  const avatarUrl =
    (user as any)?.user_meta?.avatar_url ||
    (user as any)?.user_metadata?.avatar_url ||
    null;

  // Get user initials for fallback
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-auto px-2 py-1.5 hover:bg-transparent"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={avatarUrl || undefined}
                alt={user?.name || "User"}
              />
              <AvatarFallback className="bg-gray-600 text-white text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* User info section */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={user?.name || "User"}
                />
                <AvatarFallback className="bg-gray-600 text-white text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Theme toggle */}
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sign out */}
          <DropdownMenuItem asChild>
            <form action="/auth/signout" method="post" className="w-full">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="w-full pl-6 text-left justify-start cursor-pointer h-auto py-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </Button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
