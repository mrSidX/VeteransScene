import api from '../services/api.js';

export default {
  name: 'FollowButton',
  props: {
    resourceType: {
      type: String,
      required: true,
      validator: v => ['segment', 'application', 'highlight', 'flag'].includes(v)
    },
    resourceId: {
      type: String,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  template: `
    <div class="flex items-center gap-1">
      <!-- Star/Follow Toggle -->
      <button
        @click.stop="toggleFollow"
        :disabled="loading"
        :title="following ? 'Unfollow' : 'Follow'"
        :class="[
          'flex items-center gap-1 transition-all duration-300 rounded',
          compact
            ? 'px-1.5 py-0.5 text-xs'
            : 'px-2 md:px-2.5 py-0.5 md:py-1 text-xs md:text-sm',
          following
            ? 'bg-yellow-600 text-white hover:bg-yellow-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-yellow-400'
        ]"
      >
        <span class="transition-transform duration-300" :class="{ 'scale-110': following }">
          {{ following ? '\u2605' : '\u2606' }}
        </span>
        <span v-if="!compact">{{ following ? 'Following' : 'Follow' }}</span>
      </button>

      <!-- Bell/Email Toggle (only shown when following) -->
      <button
        v-if="following"
        @click.stop="toggleEmail"
        :disabled="emailLoading"
        :title="emailNotifications ? 'Disable email notifications' : 'Enable email notifications'"
        :class="[
          'flex items-center transition-all duration-300 rounded',
          compact
            ? 'px-1 py-0.5 text-xs'
            : 'px-1.5 md:px-2 py-0.5 md:py-1 text-xs md:text-sm',
          emailNotifications
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-blue-400'
        ]"
      >
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path v-if="emailNotifications" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          <path v-else d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" opacity="0.5"/>
        </svg>
      </button>
    </div>
  `,
  data() {
    return {
      following: false,
      emailNotifications: false,
      loading: false,
      emailLoading: false
    };
  },
  async mounted() {
    await this.fetchStatus();
  },
  watch: {
    resourceId() {
      this.fetchStatus();
    }
  },
  methods: {
    async fetchStatus() {
      if (!this.resourceId) return;
      try {
        const res = await api.getFollowStatus(this.resourceType, this.resourceId);
        if (res.success) {
          this.following = res.data.following;
          this.emailNotifications = res.data.emailNotifications;
        }
      } catch (err) {
        // Silently fail - button just shows default state
      }
    },

    async toggleFollow() {
      // Optimistic update
      const wasFollowing = this.following;
      const wasEmail = this.emailNotifications;
      this.following = !this.following;
      if (!this.following) this.emailNotifications = false;
      this.loading = true;

      try {
        const res = await api.toggleFollow(this.resourceType, this.resourceId);
        if (res.success) {
          this.following = res.data.following;
          this.emailNotifications = res.data.emailNotifications;
        } else {
          // Rollback
          this.following = wasFollowing;
          this.emailNotifications = wasEmail;
        }
      } catch (err) {
        // Rollback
        this.following = wasFollowing;
        this.emailNotifications = wasEmail;
      } finally {
        this.loading = false;
      }
    },

    async toggleEmail() {
      // Optimistic update
      const wasEmail = this.emailNotifications;
      this.emailNotifications = !this.emailNotifications;
      this.emailLoading = true;

      try {
        const res = await api.toggleFollowEmail(this.resourceType, this.resourceId);
        if (res.success) {
          this.emailNotifications = res.data.emailNotifications;
        } else {
          this.emailNotifications = wasEmail;
        }
      } catch (err) {
        this.emailNotifications = wasEmail;
      } finally {
        this.emailLoading = false;
      }
    }
  }
};
