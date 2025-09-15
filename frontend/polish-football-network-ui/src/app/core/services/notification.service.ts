import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { APP_CONSTANTS } from '../constants';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  readonly type?: NotificationType;
  readonly duration?: number;
  readonly action?: string;
  readonly persistent?: boolean;
  readonly data?: unknown;
}

export interface Notification {
  readonly id: string;
  readonly message: string;
  readonly type: NotificationType;
  readonly timestamp: Date;
  readonly duration?: number;
  readonly action?: string;
  readonly persistent?: boolean;
  readonly data?: unknown;
}

export interface NotificationState {
  readonly notifications: Notification[];
  readonly count: number;
  readonly hasVisible: boolean;
}

/**
 * Notification service with toast-like functionality using signals
 * Can be enhanced later with Angular Material SnackBar
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Notification state management with signals
  private readonly _notifications = signal<Notification[]>([]);

  // Action subjects for notification interactions
  private readonly actionSubjects = new Map<string, Subject<void>>();

  // Public computed signals
  public readonly notifications = computed(() => this._notifications());
  public readonly count = computed(() => this._notifications().length);
  public readonly hasNotifications = computed(() => this._notifications().length > 0);

  // Notification state as computed signal
  public readonly state = computed<NotificationState>(() => ({
    notifications: this._notifications(),
    count: this.count(),
    hasVisible: this.hasNotifications(),
  }));

  /**
   * Show success notification
   */
  public success(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'success',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.SUCCESS,
      ...options
    });
  }

  /**
   * Show error notification
   */
  public error(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'error',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.ERROR,
      ...options
    });
  }

  /**
   * Show warning notification
   */
  public warning(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'warning',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.WARNING,
      ...options
    });
  }

  /**
   * Show info notification
   */
  public info(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'info',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.INFO,
      ...options
    });
  }

  /**
   * Show generic notification
   */
  public show(message: string, options: NotificationOptions = {}): string {
    const id = this.generateId();
    const notification: Notification = {
      id,
      message,
      type: options.type || 'info',
      timestamp: new Date(),
      duration: options.duration,
      action: options.action,
      persistent: options.persistent || false,
      data: options.data,
    };

    this.addNotification(notification);

    // Auto-dismiss after duration if not persistent
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }

    return id;
  }

  /**
   * Show notification with action button
   */
  public showWithAction(
    message: string,
    action: string,
    options: NotificationOptions = {}
  ): Observable<void> {
    const subject = new Subject<void>();
    const id = this.show(message, {
      ...options,
      action,
      persistent: true, // Keep open until action is taken
    });

    this.actionSubjects.set(id, subject);
    return subject.asObservable();
  }

  /**
   * Trigger action for notification
   */
  public triggerAction(notificationId: string): void {
    const subject = this.actionSubjects.get(notificationId);
    if (subject) {
      subject.next();
      subject.complete();
      this.actionSubjects.delete(notificationId);
    }
    this.dismiss(notificationId);
  }

  /**
   * Dismiss specific notification
   */
  public dismiss(notificationId: string): void {
    const currentNotifications = this._notifications();
    const filteredNotifications = currentNotifications.filter(n => n.id !== notificationId);
    this._notifications.set(filteredNotifications);

    // Clean up action subject if exists
    const subject = this.actionSubjects.get(notificationId);
    if (subject && !subject.closed) {
      subject.complete();
      this.actionSubjects.delete(notificationId);
    }
  }

  /**
   * Dismiss all notifications
   */
  public dismissAll(): void {
    this._notifications.set([]);

    // Clean up all action subjects
    this.actionSubjects.forEach(subject => {
      if (!subject.closed) {
        subject.complete();
      }
    });
    this.actionSubjects.clear();
  }

  /**
   * Get notification by ID
   */
  public getNotification(id: string): Notification | undefined {
    return this._notifications().find(n => n.id === id);
  }

  /**
   * Get notifications by type
   */
  public getNotificationsByType(type: NotificationType): Notification[] {
    return this._notifications().filter(n => n.type === type);
  }

  /**
   * Check if notification exists
   */
  public hasNotification(id: string): boolean {
    return this._notifications().some(n => n.id === id);
  }

  /**
   * Add notification to state
   */
  private addNotification(notification: Notification): void {
    const currentNotifications = this._notifications();

    // Limit notifications to max count
    const maxNotifications = APP_CONSTANTS.NOTIFICATIONS.MAX_NOTIFICATIONS;
    let notifications = [...currentNotifications, notification];

    if (notifications.length > maxNotifications) {
      // Remove oldest notifications first
      notifications = notifications.slice(-maxNotifications);
    }

    this._notifications.set(notifications);
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
