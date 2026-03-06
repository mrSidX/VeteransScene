export default {
  name: 'NotificationBell',
  template: `
    <div class="relative" ref="bellContainer">
      <!-- Bell Button -->
      <button
        @click.stop="toggleDropdown"
        class="relative p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
        title="Notifications"
      >
        <!-- Bell Icon -->
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        <!-- Unread Badge -->
        <span
          v-if="unreadCount > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 border-2 border-gray-800 rounded-full"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        @click.stop
        class="absolute right-0 mt-2 w-80 md:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-[28rem] overflow-hidden flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 class="text-base font-semibold text-white">Notifications</h3>
          <div class="flex items-center gap-3">
            <button
              v-if="unreadCount > 0"
              @click="markAllAsRead"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Mark all read
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p class="text-gray-400 mt-2 text-sm">Loading...</p>
        </div>

        <!-- Notifications List -->
        <div v-else-if="notifications.length > 0" class="overflow-y-auto flex-1">
          <div
            v-for="notification in notifications"
            :key="notification._id"
            :class="[
              'px-4 py-3 border-b border-gray-700/50 transition-colors',
              !notification.read ? 'bg-blue-900/10' : 'bg-gray-800'
            ]"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div :class="[
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
                getNotificationColor(notification.type)
              ]">
                {{ getNotificationIcon(notification.type) }}
              </div>

              <!-- Content (clickable to navigate) -->
              <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToNotification(notification)">
                <p class="text-sm font-medium text-white leading-tight">{{ notification.title }}</p>
                <p class="text-xs text-gray-400 mt-0.5 line-clamp-2">{{ notification.message }}</p>
                <span class="text-xs text-gray-500 mt-1 inline-block">{{ formatDate(notification.createdAt) }}</span>
              </div>

              <!-- Actions -->
              <div class="flex flex-col items-center gap-1 flex-shrink-0">
                <!-- Mark read/unread -->
                <button
                  v-if="!notification.read"
                  @click.stop="markAsRead(notification)"
                  class="p-1 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors"
                  title="Mark as read"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </button>
                <!-- Unread dot indicator -->
                <div v-if="!notification.read" class="w-2 h-2 bg-blue-500 rounded-full" title="Unread"></div>
                <!-- Delete -->
                <button
                  @click.stop="deleteNotification(notification)"
                  class="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                  title="Dismiss"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="p-8 text-center">
          <svg class="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p class="text-gray-400 text-sm">No notifications</p>
          <p class="text-xs text-gray-500 mt-1">You're all caught up!</p>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 border-t border-gray-700 bg-gray-800/80">
          <button
            @click="viewAllNotifications"
            class="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            View all notifications
          </button>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      isOpen: false,
      notifications: [],
      unreadCount: 0,
      loading: false,
      pollInterval: null,
      outsideClickHandler: null
    };
  },

  mounted() {
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => {
      this.loadUnreadCount();
    }, 30000);

    // Global click-outside handler
    this.outsideClickHandler = (event) => {
      if (this.isOpen && this.$refs.bellContainer && !this.$refs.bellContainer.contains(event.target)) {
        this.isOpen = false;
      }
    };
    document.addEventListener('click', this.outsideClickHandler);
  },

  beforeUnmount() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
  },

  methods: {
    async toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        await this.loadNotifications();
      }
    },

    async loadUnreadCount() {
      try {
        const response = await window.api.getUnreadNotificationCount();
        if (response && response.success) {
          this.unreadCount = response.data.count;
        }
      } catch (err) {
        // Silently fail - bell just won't show a count
      }
    },

    async loadNotifications() {
      this.loading = true;
      try {
        const response = await window.api.getNotifications({ limit: 15, page: 1 });
        if (response && response.success) {
          this.notifications = Array.isArray(response.data) ? response.data : [];
        }
      } catch (err) {
        console.error('Load notifications error:', err);
      } finally {
        this.loading = false;
      }
    },

    async markAsRead(notification) {
      try {
        await window.api.markNotificationAsRead(notification._id);
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      } catch (err) {
        console.error('Mark as read error:', err);
      }
    },

    async markAllAsRead() {
      try {
        await window.api.markAllNotificationsAsRead();
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
      } catch (err) {
        console.error('Mark all as read error:', err);
      }
    },

    async deleteNotification(notification) {
      try {
        await window.api.deleteNotification(notification._id);
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.notifications = this.notifications.filter(n => n._id !== notification._id);
      } catch (err) {
        console.error('Delete notification error:', err);
      }
    },

    navigateToNotification(notification) {
      // Mark as read
      if (!notification.read) {
        this.markAsRead(notification);
      }

      // Navigate
      if (notification.actionUrl) {
        this.isOpen = false;
        if (this.$router) {
          this.$router.push(notification.actionUrl);
        } else {
          window.location.href = notification.actionUrl;
        }
      }
    },

    viewAllNotifications() {
      this.isOpen = false;
      if (this.$router) {
        this.$router.push('/notifications');
      }
    },

    getNotificationIcon(type) {
      const icons = {
        segment_assigned: '\uD83D\uDC65',
        segment_unassigned: '\uD83D\uDC4B',
        segment_status_changed: '\uD83D\uDD04',
        segment_approved: '\u2705',
        segment_rejected: '\u274C',
        segment_scheduled: '\uD83D\uDCC5',
        segment_updated: '\uD83D\uDCDD',
        comment_mention: '@',
        comment_reply: '\uD83D\uDCAC',
        comment_on_segment: '\uD83D\uDCAD',
        followed_item_updated: '\u2B50',
        flag_assigned: '\uD83D\uDEA9',
        flag_updated: '\uD83D\uDEA9',
        flag_resolved: '\u2705',
        flag_dismissed: '\uD83D\uDEAB',
        flag_escalated: '\u26A0\uFE0F',
        approval_requested: '\uD83D\uDD14',
        approval_granted: '\u2705',
        approval_rejected: '\u274C',
        schedule_reminder: '\u23F0'
      };
      return icons[type] || '\uD83D\uDCE2';
    },

    getNotificationColor(type) {
      const colors = {
        segment_assigned: 'bg-blue-900 text-blue-300',
        segment_approved: 'bg-green-900 text-green-300',
        segment_rejected: 'bg-red-900 text-red-300',
        segment_scheduled: 'bg-purple-900 text-purple-300',
        segment_updated: 'bg-indigo-900 text-indigo-300',
        comment_mention: 'bg-yellow-900 text-yellow-300',
        comment_reply: 'bg-blue-900 text-blue-300',
        comment_on_segment: 'bg-teal-900 text-teal-300',
        followed_item_updated: 'bg-amber-900 text-amber-300',
        flag_assigned: 'bg-red-900 text-red-300',
        flag_escalated: 'bg-red-900 text-red-300',
        flag_resolved: 'bg-green-900 text-green-300',
        approval_requested: 'bg-orange-900 text-orange-300',
        schedule_reminder: 'bg-purple-900 text-purple-300'
      };
      return colors[type] || 'bg-gray-700 text-gray-300';
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
};
