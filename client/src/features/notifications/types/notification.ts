export type NotificationType =
  | 'notice'
  | 'complaint'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
};