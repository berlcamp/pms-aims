"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { User } from "@/types/database";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface UserSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  excludedTypes?: string[]; // User types to exclude from the list
}

export function UserSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select a user",
  excludedTypes = [],
}: UserSelectProps) {
  const divisionId = process.env.NEXT_PUBLIC_DIVISION_ID || null;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const previousDebouncedQuery = useRef<string>("");
  const previousIsOpen = useRef<boolean>(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users with search
  useEffect(() => {
    const fetchUsers = async () => {
      if (!divisionId) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from("users")
          .select()
          .eq("division_id", divisionId)
          .eq("is_active", true)
          .order("name")
          .limit(100); // Limit to 100 results for performance

        // Exclude specific user types
        if (excludedTypes.length > 0) {
          excludedTypes.forEach((type) => {
            query = query.neq("type", type);
          });
        }

        // Add search filter if query exists
        if (debouncedQuery.trim()) {
          query = query.or(
            `name.ilike.%${debouncedQuery.trim()}%,email.ilike.%${debouncedQuery.trim()}%`
          );
        }

        const { data, error } = await query;

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (!isOpen) {
      // Reset loading state when dropdown closes
      setLoading(false);
      setSearchQuery("");
      previousDebouncedQuery.current = "";
      previousIsOpen.current = false;
      return;
    }

    if (!divisionId) {
      // Reset loading state when dropdown is open but no divisionId
      setLoading(false);
      setUsers([]);
      previousIsOpen.current = isOpen;
      return;
    }

    // Only fetch if dropdown just opened or if debouncedQuery changed while open
    const justOpened = !previousIsOpen.current && isOpen;
    const queryChanged = previousDebouncedQuery.current !== debouncedQuery;

    if (justOpened || queryChanged) {
      previousDebouncedQuery.current = debouncedQuery;
      previousIsOpen.current = isOpen;
      fetchUsers();
    } else {
      previousIsOpen.current = isOpen;
    }
  }, [isOpen, divisionId, debouncedQuery, excludedTypes]);

  // Fetch selected user when value changes
  useEffect(() => {
    const fetchSelectedUser = async () => {
      if (!value || !divisionId) {
        setSelectedUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select()
          .eq("id", String(value))
          .eq("division_id", divisionId)
          .eq("is_active", true)
          .single();

        if (error) throw error;
        setSelectedUser(data);
      } catch (error) {
        console.error("Error fetching selected user:", error);
        setSelectedUser(null);
      }
    };

    fetchSelectedUser();
  }, [value, divisionId]);

  const handleSelect = (user: User) => {
    onChange(String(user.id));
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    setSelectedUser(null);
    setSearchQuery("");
  };

  const isButtonDisabled = disabled || !divisionId;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative w-full">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            disabled={isButtonDisabled}
            className={cn(
              "h-10 w-full justify-between font-normal",
              !selectedUser && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedUser
                ? `${selectedUser.name}${
                    selectedUser.email ? ` (${selectedUser.email})` : ""
                  }`
                : placeholder}
            </span>
            <div className="flex items-center gap-1">
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        {selectedUser && !disabled && (
          <div
            onClick={handleClear}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-sm opacity-50 hover:opacity-100 cursor-pointer z-10 h-4 w-4"
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleClear(e as unknown as React.MouseEvent);
              }
            }}
          >
            <X className="h-4 w-4 shrink-0" />
          </div>
        )}
      </div>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
        align="start"
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="max-h-[300px]">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {debouncedQuery.trim()
                  ? "No users found"
                  : divisionId
                  ? "No users available"
                  : "Please select a division"}
              </div>
            ) : (
              <div className="p-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      String(selectedUser?.id) === String(user.id) &&
                        "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(selectedUser?.id) === String(user.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{user.name}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      )}
                      {user.position && (
                        <span className="text-xs text-muted-foreground truncate">
                          {user.position}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer hint */}
          {users.length > 0 && debouncedQuery.trim() && (
            <div className="border-t p-2 text-xs text-muted-foreground text-center">
              Showing {users.length} result{users.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
