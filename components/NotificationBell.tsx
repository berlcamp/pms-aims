"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { Notification } from "@/types/database";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface NotificationBellProps {
  /**
   * Custom redirect URL when clicking the bell (default: /notifications)
   */
  redirectUrl?: string;
  /**
   * Custom handler for notification clicks
   */
  onNotificationClick?: (notification: Notification) => void;
  /**
   * Maximum number of notifications to show in dropdown
   */
  maxNotifications?: number;
}

export function NotificationBell({
  redirectUrl = "/notifications",
  onNotificationClick,
  maxNotifications = 10,
}: NotificationBellProps) {
  const router = useRouter();
  const { unreadCount, notifications, loading, markAsRead, markAllAsRead } =
    useNotifications({ autoFetch: true, realTime: true });

  const displayNotifications = useMemo(
    () => notifications.slice(0, maxNotifications),
    [notifications, maxNotifications]
  );

  const handleBellClick = () => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Call custom handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
      return;
    }

    // Default behavior: navigate based on entity type
    if (notification.entity_type && notification.entity_id) {
      switch (notification.entity_type) {
        case "lasa_row":
          router.push(`/proponent-lasa`);
          break;
        case "ppmp":
          router.push(`/planning/ppmp`);
          break;
        case "purchase_request":
          router.push(`/purchase-requests`);
          break;
        default:
          if (redirectUrl) {
            router.push(redirectUrl);
          }
      }
    } else {
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-transparent"
          aria-label={`${unreadCount} unread notification${
            unreadCount !== 1 ? "s" : ""
          }`}
        >
          <Bell className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[400px] overflow-y-auto"
      >
        <div className="px-2 py-1.5 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {displayNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p
                        className={`text-sm font-medium ${
                          !notification.is_read ? "font-semibold" : ""
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await markAsRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            {notifications.length > maxNotifications && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-center justify-center"
                  onClick={handleBellClick}
                >
                  View all notifications
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
