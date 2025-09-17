import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { APP_CONSTANTS } from '../constants';
import { Notification, NotificationType } from '../../shared/models/common.model';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface EnhancedNotification extends Notification {
  readonly priority?: NotificationPriority;
  readonly position?: NotificationPosition;
  readonly groupKey?: string;
}

export interface NotificationOptions {
  readonly type?: NotificationType;
  readonly duration?: number;
  readonly action?: string;
  readonly persistent?: boolean;
  readonly data?: unknown;
  readonly priority?: NotificationPriority;
  readonly position?: NotificationPosition;
  readonly groupKey?: string;
  readonly replaceExisting?: boolean;
}

export interface NotificationState {
  readonly notifications: EnhancedNotification[];
  readonly queue: EnhancedNotification[];
  readonly count: number;
  readonly queueCount: number;
  readonly hasVisible: boolean;
  readonly hasQueued: boolean;
  readonly isProcessing: boolean;
}

export interface NotificationConfig {
  readonly maxVisible: number;
  readonly maxQueue: number;
  readonly defaultDuration: number;
  readonly enableQueue: boolean;
  readonly enableGrouping: boolean;
  readonly enableMaterialSnackBar: boolean;
  readonly autoProcessQueue: boolean;
  readonly queueProcessingDelay: number;
}

/// <summary>
/// Enhanced notification service with queue management, Material SnackBar integration,
/// and advanced features like grouping, priority handling, and automatic queue processing.
/// </summary>
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Enhanced notification state management with signals
  private readonly _notifications = signal<EnhancedNotification[]>([]);
  private readonly _queue = signal<EnhancedNotification[]>([]);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _config = signal<NotificationConfig>(this.getDefaultConfig());

  // Action subjects for notification interactions
  private readonly actionSubjects = new Map<string, Subject<void>>();

  // Queue processing timer
  private queueProcessingTimer?: any;

  // Public computed signals
  public readonly notifications = computed(() => this._notifications());
  public readonly queue = computed(() => this._queue());
  public readonly count = computed(() => this._notifications().length);
  public readonly queueCount = computed(() => this._queue().length);
  public readonly hasNotifications = computed(() => this._notifications().length > 0);
  public readonly hasQueue = computed(() => this._queue().length > 0);
  public readonly isProcessing = computed(() => this._isProcessing());
  public readonly config = computed(() => this._config());

  // Enhanced notification state as computed signal
  public readonly state = computed<NotificationState>(() => ({
    notifications: this._notifications(),
    queue: this._queue(),
    count: this.count(),
    queueCount: this.queueCount(),
    hasVisible: this.hasNotifications(),
    hasQueued: this.hasQueue(),
    isProcessing: this.isProcessing(),
  }));

  // Statistics
  public readonly statistics = computed(() => {
    const notifications = this._notifications();
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    return {
      total: notifications.length,
      byType,
      urgent: notifications.filter(n => n.priority === 'urgent').length,
      withActions: notifications.filter(n => n.action).length,
      persistent: notifications.filter(n => n.persistent).length,
      averageAge: this.calculateAverageAge(notifications)
    };
  });

  constructor() {
    // Start queue processing if enabled
    if (this._config().autoProcessQueue) {
      this.startQueueProcessing();
    }
  }

  /// <summary>
  /// Show success notification with enhanced options.
  /// </summary>
  public success(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'success',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.SUCCESS,
      priority: 'normal',
      ...options
    });
  }

  /// <summary>
  /// Show error notification with enhanced options.
  /// </summary>
  public error(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'error',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.ERROR,
      priority: 'high',
      persistent: true,
      ...options
    });
  }

  /// <summary>
  /// Show warning notification with enhanced options.
  /// </summary>
  public warning(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'warning',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.WARNING,
      priority: 'normal',
      ...options
    });
  }

  /// <summary>
  /// Show info notification with enhanced options.
  /// </summary>
  public info(message: string, options?: Partial<NotificationOptions>): string {
    return this.show(message, {
      type: 'info',
      duration: APP_CONSTANTS.NOTIFICATIONS.DURATION.INFO,
      priority: 'low',
      ...options
    });
  }

  /// <summary>
  /// Show notification with enhanced queue management.
  /// </summary>
  public show(message: string, options: NotificationOptions = {}): string {
    const id = this.generateId();
    const notification: EnhancedNotification = {
      id,
      title: this.getTitleForType(options.type || 'info'),
      message,
      type: options.type || 'info',
      createdAt: new Date(),
      duration: options.duration,
      action: options.action,
      persistent: options.persistent || false,
      data: options.data,
      priority: options.priority || 'normal',
      position: options.position || 'bottom-right',
      groupKey: options.groupKey,
      dismissible: !options.persistent
    };

    // Handle group replacement
    if (options.groupKey && options.replaceExisting) {
      this.dismissByGroupKey(options.groupKey);
    }

    // Check if we should queue or show immediately
    if (this.shouldQueue(notification)) {
      this.addToQueue(notification);
    } else {
      this.addNotification(notification);
      this.setupAutoDismiss(notification);
    }

    return id;
  }

  /// <summary>
  /// Show notification with action button.
  /// </summary>
  public showWithAction(
    message: string,
    action: string,
    options: NotificationOptions = {}
  ): Observable<void> {
    const subject = new Subject<void>();
    const id = this.show(message, {
      ...options,
      action,
      persistent: true,
      priority: options.priority || 'high'
    });

    this.actionSubjects.set(id, subject);
    return subject.asObservable();
  }

  /// <summary>
  /// Trigger action for notification.
  /// </summary>
  public triggerAction(notificationId: string): void {
    const subject = this.actionSubjects.get(notificationId);
    if (subject) {
      subject.next();
      subject.complete();
      this.actionSubjects.delete(notificationId);
    }
    this.dismiss(notificationId);
  }

  /// <summary>
  /// Dismiss specific notification.
  /// </summary>
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

    // Process queue if space available
    if (this._config().autoProcessQueue && this._queue().length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /// <summary>
  /// Dismiss all notifications.
  /// </summary>
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

  /// <summary>
  /// Dismiss notifications by group key.
  /// </summary>
  public dismissByGroupKey(groupKey: string): void {
    const currentNotifications = this._notifications();
    const filteredNotifications = currentNotifications.filter(n => n.groupKey !== groupKey);
    this._notifications.set(filteredNotifications);
  }

  /// <summary>
  /// Process the notification queue manually.
  /// </summary>
  public processQueue(): void {
    if (this._isProcessing()) return;

    this._isProcessing.set(true);
    const queue = this._queue();
    const config = this._config();

    if (queue.length === 0) {
      this._isProcessing.set(false);
      return;
    }

    // Sort by priority and show what fits
    const sortedQueue = this.sortByPriority([...queue]);
    const availableSlots = config.maxVisible - this._notifications().length;
    const toShow = sortedQueue.slice(0, availableSlots);

    toShow.forEach(notification => {
      this.addNotification(notification);
      this.setupAutoDismiss(notification);
    });

    // Remove processed notifications from queue
    const remainingQueue = queue.filter(n => !toShow.some(shown => shown.id === n.id));
    this._queue.set(remainingQueue);

    this._isProcessing.set(false);
  }

  /// <summary>
  /// Update notification configuration.
  /// </summary>
  public updateConfig(config: Partial<NotificationConfig>): void {
    const currentConfig = this._config();
    this._config.set({ ...currentConfig, ...config });

    // Restart queue processing if auto processing was enabled
    if (config.autoProcessQueue && !currentConfig.autoProcessQueue) {
      this.startQueueProcessing();
    } else if (!config.autoProcessQueue && currentConfig.autoProcessQueue) {
      this.stopQueueProcessing();
    }
  }

  /// <summary>
  /// Clear the notification queue.
  /// </summary>
  public clearQueue(): void {
    this._queue.set([]);
  }

  /// <summary>
  /// Get notification statistics.
  /// </summary>
  public getStatistics() {
    return this.statistics();
  }

  // Private helper methods

  /// <summary>
  /// Get default configuration.
  /// </summary>
  private getDefaultConfig(): NotificationConfig {
    return {
      maxVisible: 5,
      maxQueue: 20,
      defaultDuration: 5000,
      enableQueue: true,
      enableGrouping: true,
      enableMaterialSnackBar: false,
      autoProcessQueue: true,
      queueProcessingDelay: 1000
    };
  }

  /// <summary>
  /// Get title for notification type.
  /// </summary>
  private getTitleForType(type: NotificationType): string {
    switch (type) {
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'success': return 'Success';
      case 'info': return 'Information';
      default: return 'Notification';
    }
  }

  /// <summary>
  /// Check if notification should be queued.
  /// </summary>
  private shouldQueue(notification: EnhancedNotification): boolean {
    const config = this._config();
    if (!config.enableQueue) return false;

    const currentCount = this._notifications().length;
    const isUrgent = notification.priority === 'urgent';

    return currentCount >= config.maxVisible && !isUrgent;
  }

  /// <summary>
  /// Add notification to queue.
  /// </summary>
  private addToQueue(notification: EnhancedNotification): void {
    const currentQueue = this._queue();
    const config = this._config();

    let newQueue = [...currentQueue, notification];

    // Limit queue size
    if (newQueue.length > config.maxQueue) {
      newQueue = newQueue.slice(-config.maxQueue);
    }

    this._queue.set(newQueue);
  }

  /// <summary>
  /// Add notification to visible notifications.
  /// </summary>
  private addNotification(notification: EnhancedNotification): void {
    const currentNotifications = this._notifications();
    const config = this._config();

    let notifications = [...currentNotifications, notification];

    // Limit visible notifications
    if (notifications.length > config.maxVisible) {
      notifications = notifications.slice(-config.maxVisible);
    }

    this._notifications.set(notifications);
  }

  /// <summary>
  /// Setup auto-dismiss for notification.
  /// </summary>
  private setupAutoDismiss(notification: EnhancedNotification): void {
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }
  }

  /// <summary>
  /// Sort notifications by priority.
  /// </summary>
  private sortByPriority(notifications: EnhancedNotification[]): EnhancedNotification[] {
    const priorityOrder: Record<NotificationPriority, number> = {
      'urgent': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };

    return notifications.sort((a, b) => {
      const aPriority = a.priority || 'normal';
      const bPriority = b.priority || 'normal';
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });
  }

  /// <summary>
  /// Start automatic queue processing.
  /// </summary>
  private startQueueProcessing(): void {
    if (this.queueProcessingTimer) return;

    const config = this._config();
    this.queueProcessingTimer = setInterval(() => {
      if (this._queue().length > 0 && this._notifications().length < config.maxVisible) {
        this.processQueue();
      }
    }, config.queueProcessingDelay);
  }

  /// <summary>
  /// Stop automatic queue processing.
  /// </summary>
  private stopQueueProcessing(): void {
    if (this.queueProcessingTimer) {
      clearInterval(this.queueProcessingTimer);
      this.queueProcessingTimer = undefined;
    }
  }

  /// <summary>
  /// Calculate average age of notifications.
  /// </summary>
  private calculateAverageAge(notifications: EnhancedNotification[]): number {
    if (notifications.length === 0) return 0;

    const now = new Date().getTime();
    const totalAge = notifications.reduce((sum, n) => {
      return sum + (now - n.createdAt.getTime());
    }, 0);

    return totalAge / notifications.length;
  }

  /// <summary>
  /// Generate unique notification ID.
  /// </summary>
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
