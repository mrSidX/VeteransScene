export default {
  name: 'Notifications',
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Back to Dashboard -->
      <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </router-link>

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">Notifications</h1>
          <p class="text-gray-400 text-sm">All your notifications in one place</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="hasUnread"
            @click="markAllAsRead"
            :disabled="markingAll"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {{ markingAll ? 'Marking...' : 'Mark All as Read' }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-gray-800 border border-indigo-500/30 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select
              v-model="filters.read"
              @change="loadNotifications"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
            <select
              v-model="filters.sort"
              @change="loadNotifications"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Items Per Page</label>
            <select
              v-model.number="pagination.limit"
              @change="loadNotifications"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>

      <!-- Notifications List -->
      <div v-else-if="notifications.length > 0" class="space-y-3 mb-6">
        <div
          v-for="notification in notifications"
          :key="notification._id"
          @click="handleNotificationClick(notification)"
          :class="[
            'bg-gray-800 border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg',
            !notification.read ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700'
          ]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-white font-semibold text-base">{{ notification.title }}</h3>
                <span v-if="!notification.read" class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                  New
                </span>
              </div>
              <p v-if="notification.message" class="text-gray-400 text-sm mb-2">{{ notification.message }}</p>
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span>{{ formatDate(notification.createdAt) }}</span>
              </div>
            </div>
            <div class="flex-shrink-0">
              <button
                @click.stop="deleteNotification(notification)"
                class="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                title="Delete notification"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <div class="inline-block p-4 bg-gray-800 rounded-full mb-4">
          <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No notifications</h3>
        <p class="text-gray-400">You're all caught up!</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="flex items-center justify-center gap-2 mt-6">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page === 1"
          class="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Previous
        </button>
        <span class="text-gray-400 text-sm">
          Page {{ pagination.page }} of {{ pagination.pages }}
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page === pagination.pages"
          class="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  `,

  data() {
    return {
      loading: true,
      markingAll: false,
      notifications: [],
      filters: {
        read: '',
        sort: '-createdAt'
      },
      pagination: {
        page: 1,
        limit: 20,
        pages: 1,
        total: 0
      },
      user: JSON.parse(localStorage.getItem('vs_user_data') || localStorage.getItem('user') || '{}')
    };
  },

  computed: {
    hasUnread() {
      return this.notifications.some(n => !n.read);
    }
  },

  async mounted() {
    await this.loadNotifications();
  },

  methods: {
    async loadNotifications() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          sort: this.filters.sort
        };

        if (this.filters.read !== '') {
          params.read = this.filters.read === 'true';
        }

        const response = await window.api.getNotifications(params);
        console.log('Notifications API response:', response);

        if (response && response.success) {
          // Try multiple response formats
          let notificationsList = [];
          let pageInfo = { page: 1, pages: 1, total: 0 };

          // Check if response.data is an array (direct list)
          if (Array.isArray(response.data)) {
            notificationsList = response.data;
          }
          // Check if response.data has notifications property
          else if (response.data?.notifications) {
            notificationsList = Array.isArray(response.data.notifications)
              ? response.data.notifications
              : response.data.notifications.recent || [];
          }
          // Check if response has a notifications array directly
          else if (response.notifications && Array.isArray(response.notifications)) {
            notificationsList = response.notifications;
          }

          // Extract pagination if available
          if (response.data?.page) pageInfo.page = response.data.page;
          if (response.data?.pages) pageInfo.pages = response.data.pages;
          if (response.data?.total) pageInfo.total = response.data.total;

          this.notifications = notificationsList;
          this.pagination = { ...this.pagination, ...pageInfo };

          console.log('Parsed notifications:', this.notifications);
        }
      } catch (err) {
        console.error('Load notifications error:', err);
        this.$root.showToast?.('Failed to load notifications', 'error');
      } finally {
        this.loading = false;
      }
    },

    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.pages) {
        this.pagination.page = newPage;
        this.loadNotifications();
      }
    },

    async markAllAsRead() {
      if (!this.hasUnread) return;

      this.markingAll = true;
      try {
        const response = await window.api.markAllNotificationsAsRead();
        if (response && response.success) {
          this.$root.showToast?.('All notifications marked as read', 'success');
          await this.loadNotifications();
        }
      } catch (err) {
        console.error('Mark all as read error:', err);
        this.$root.showToast?.('Failed to mark all as read', 'error');
      } finally {
        this.markingAll = false;
      }
    },

    async handleNotificationClick(notification) {
      if (!notification.read) {
        try {
          await window.api.markNotificationAsRead(notification._id);
          notification.read = true;
        } catch (err) {
          console.error('Mark as read error:', err);
        }
      }

      if (notification.actionUrl) {
        this.$router.push(notification.actionUrl);
      }
    },

    async deleteNotification(notification) {
      if (!confirm('Delete this notification?')) return;

      try {
        const response = await window.api.deleteNotification(notification._id);
        if (response && response.success) {
          this.$root.showToast?.('Notification deleted', 'success');
          await this.loadNotifications();
        }
      } catch (err) {
        console.error('Delete notification error:', err);
        this.$root.showToast?.('Failed to delete notification', 'error');
      }
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
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
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }
};
