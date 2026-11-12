/** notificationService — browser Notification API wrapper. */
export const notificationService = {
  supported() { return typeof Notification !== 'undefined' },
  permission(): NotificationPermission | 'unsupported' { return this.supported() ? Notification.permission : 'unsupported' },
  async request() { if (!this.supported()) return 'unsupported' as const; return Notification.requestPermission() },
  show(title: string, body?: string) {
    if (!this.supported() || Notification.permission !== 'granted' || document.hasFocus()) return
    try { new Notification(title, { body }) } catch { /* ignore */ }
  },
}
