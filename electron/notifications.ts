import { Notification } from 'electron';
import type { NotificationPayload } from '../src/types';

/** Sends a native OS notification when notifications are supported. */
export function sendNativeNotification(payload: NotificationPayload): void {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: false,
  });

  notification.show();
}
