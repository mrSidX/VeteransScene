export default {
  name: 'NotificationBell',
  template: `
    <div class="relative">
      <!-- Bell Button -->
      <button
        @click="toggleDropdown"
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
        v-click-outside="closeDropdown"
        class="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">Notifications</h3>
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Mark all read
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p class="text-gray-400 mt-2 text-sm">Loading...</p>
        </div>

        <!-- Notifications List -->
        <div v-else-if="notifications.length > 0" class="overflow-y-auto flex-1">
          <div
            v-for="notification in notifications"
            :key="notification._id"
            @click="handleNotificationClick(notification)"
            :class="[
              'p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-700',
              !notification.read ? 'bg-gray-750' : 'bg-gray-800'
            ]"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div :class="[
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                getNotificationColor(notification.type)
              ]">
                {{ getNotificationIcon(notification.type) }}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white">{{ notification.title }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ notification.message }}</p>
                <div class="flex items-center gap-3 mt-2">
                  <span class="text-xs text-gray-500">{{ formatDate(notification.createdAt) }}</span>
                  <span
                    v-if="notification.priority === 'high' || notification.priority === 'urgent'"
                    :class="[
                      'text-xs px-2 py-0.5 rounded',
                      notification.priority === 'urgent' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'
                    ]"
                  >
                    {{ notification.priority }}
                  </span>
                </div>
              </div>

              <!-- Unread Indicator -->
              <div v-if="!notification.read" class="flex-shrink-0">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="p-8 text-center">
          <div class="text-4xl mb-2">🔔</div>
          <p class="text-gray-400">No notifications</p>
          <p class="text-sm text-gray-500 mt-1">You're all caught up!</p>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-700 bg-gray-750">
          <button
            @click="viewAllNotifications"
            class="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
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
      pollInterval: null
    };
  },

  mounted() {
    this.loadUnreadCount();
    // Poll for new notifications every 30 seconds
    this.pollInterval = setInterval(() => {
      this.loadUnreadCount();
    }, 30000);
  },

  beforeUnmount() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  },

  methods: {
    async toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        await this.loadNotifications();
      }
    },

    closeDropdown() {
      this.isOpen = false;
    },

    async loadUnreadCount() {
      try {
        const response = await window.api.getUnreadNotificationCount();
        if (response.success) {
          this.unreadCount = response.data.count;
        }
      } catch (err) {
        console.error('Load unread count error:', err);
      }
    },

    async loadNotifications() {
      this.loading = true;
      try {
        const response = await window.api.getNotifications({
          limit: 10,
          page: 1
        });

        if (response.success) {
          this.notifications = response.data;
        }
      } catch (err) {
        console.error('Load notifications error:', err);
      } finally {
        this.loading = false;
      }
    },

    async handleNotificationClick(notification) {
      // Mark as read if unread
      if (!notification.read) {
        try {
          await window.api.markNotificationAsRead(notification._id);
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        } catch (err) {
          console.error('Mark as read error:', err);
        }
      }

      // Navigate to the resource
      if (notification.actionUrl) {
        this.closeDropdown();
        // Use Vue Router if available
        if (this.$router) {
          this.$router.push(notification.actionUrl);
        } else {
          window.location.href = notification.actionUrl;
        }
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

    viewAllNotifications() {
      this.closeDropdown();
      // Navigate to notifications page (if you create one)
      if (this.$router) {
        this.$router.push('/notifications');
      }
    },

    getNotificationIcon(type) {
      const icons = {
        segment_assigned: '👥',
        segment_unassigned: '👋',
        segment_status_changed: '🔄',
        segment_approved: '✅',
        segment_rejected: '❌',
        segment_scheduled: '📅',
        segment_updated: '📝',
        comment_mention: '@',
        comment_reply: '💬',
        comment_on_segment: '💭',
        approval_requested: '🔔',
        approval_granted: '✅',
        approval_rejected: '❌',
        schedule_reminder: '⏰',
        default: '📢'
      };
      return icons[type] || icons.default;
    },

    getNotificationColor(type) {
      const colors = {
        segment_assigned: 'bg-blue-900 text-blue-300',
        segment_approved: 'bg-green-900 text-green-300',
        segment_rejected: 'bg-red-900 text-red-300',
        segment_scheduled: 'bg-purple-900 text-purple-300',
        comment_mention: 'bg-yellow-900 text-yellow-300',
        comment_reply: 'bg-blue-900 text-blue-300',
        approval_requested: 'bg-orange-900 text-orange-300',
        schedule_reminder: 'bg-purple-900 text-purple-300',
        default: 'bg-gray-700 text-gray-300'
      };
      return colors[type] || colors.default;
    },

    formatDate(dateString) {
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
  },

  directives: {
    'click-outside': {
      mounted(el, binding) {
        el.clickOutsideEvent = function(event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value();
          }
        };
        document.addEventListener('click', el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
      }
    }
  }
};
