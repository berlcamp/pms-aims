import { useAppSelector } from "@/lib/redux/hook";
import {
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/services/notifications";
import { supabase } from "@/lib/supabase/client";
import { Notification } from "@/types/database";
import { useEffect, useState } from "react";

interface UseNotificationsOptions {
  autoFetch?: boolean;
  realTime?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true, realTime = true } = options;
  const user = useAppSelector((state) => state.user.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.system_user_id;

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (limit = 20) => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string | number) => {
    if (!userId) return false;

    try {
      const success = await markNotificationAsRead(notificationId, userId);
      if (success) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            String(n.id) === String(notificationId)
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
      }
      return success;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return 0;

    try {
      const count = await markAllNotificationsAsRead(userId);
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      return count;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return 0;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (autoFetch && userId) {
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [userId, autoFetch]);

  // Real-time subscription
  useEffect(() => {
    if (!realTime || !userId) {
      return;
    }

    let isMounted = true;

    // Subscribe to notification changes for this user
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "procurements",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          if (isMounted) {
            await fetchUnreadCount();
            await fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, realTime]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refetch: () => {
      fetchUnreadCount();
      fetchNotifications();
    },
  };
}
