import { supabase } from "@/lib/supabase/client";
import { Notification, NotificationType } from "@/types/database";

/**
 * Create a notification
 */
export async function createNotification(data: {
  userId: string | number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<Notification> {
  const { data: notification, error } = await supabase.rpc(
    "create_notification",
    {
      p_user_id: typeof data.userId === "string" ? parseInt(data.userId) : data.userId,
      p_type: data.type,
      p_title: data.title,
      p_message: data.message,
      p_entity_type: data.entityType || null,
      p_entity_id:
        data.entityId !== null && data.entityId !== undefined
          ? typeof data.entityId === "string"
            ? parseInt(data.entityId)
            : data.entityId
          : null,
      p_metadata: data.metadata || null,
    }
  );

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return notification as Notification;
}

/**
 * Get notifications for a user
 */
export async function getNotifications(params?: {
  userId?: string | number;
  isRead?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.userId) {
    const userId =
      typeof params.userId === "string"
        ? parseInt(params.userId)
        : params.userId;
    query = query.eq("user_id", userId);
  }

  if (params?.isRead !== undefined) {
    query = query.eq("is_read", params.isRead);
  }

  if (params?.type) {
    query = query.eq("type", params.type);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return (data || []) as Notification[];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string | number
): Promise<number> {
  const userIdNum =
    typeof userId === "string" ? parseInt(userId) : userId;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userIdNum)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to fetch notification count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string | number,
  userId: string | number
): Promise<boolean> {
  const notificationIdNum =
    typeof notificationId === "string"
      ? parseInt(notificationId)
      : notificationId;
  const userIdNum =
    typeof userId === "string" ? parseInt(userId) : userId;

  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationIdNum,
    p_user_id: userIdNum,
  });

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  return data as boolean;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string | number
): Promise<number> {
  const userIdNum =
    typeof userId === "string" ? parseInt(userId) : userId;

  const { data, error } = await supabase.rpc("mark_all_notifications_read", {
    p_user_id: userIdNum,
  });

  if (error) {
    throw new Error(
      `Failed to mark all notifications as read: ${error.message}`
    );
  }

  return (data as number) || 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string | number,
  userId: string | number
): Promise<boolean> {
  const notificationIdNum =
    typeof notificationId === "string"
      ? parseInt(notificationId)
      : notificationId;
  const userIdNum =
    typeof userId === "string" ? parseInt(userId) : userId;

  const { data, error } = await supabase.rpc("delete_notification", {
    p_notification_id: notificationIdNum,
    p_user_id: userIdNum,
  });

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }

  return data as boolean;
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  notificationId: string | number
): Promise<Notification | null> {
  const notificationIdNum =
    typeof notificationId === "string"
      ? parseInt(notificationId)
      : notificationId;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationIdNum)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch notification: ${error.message}`);
  }

  return data as Notification;
}

