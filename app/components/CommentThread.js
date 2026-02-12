export default {
  name: 'CommentThread',
  template: `
    <div class="comment-thread bg-gray-800 border border-yellow-500/30 rounded-xl p-2.5 md:p-4 lg:p-6 shadow-lg">
      <!-- Comments Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mb-3 md:mb-4">
        <div class="flex items-center gap-2 md:gap-3">
          <div class="p-1.5 md:p-2 bg-yellow-600/20 rounded-lg flex-shrink-0">
            <svg class="w-5 h-5 md:w-6 md:h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-lg md:text-xl font-bold text-white">{{ commentType === 'internal' ? 'Notes' : 'Comments' }}</h3>
            <p class="text-xs md:text-sm text-gray-400">{{ totalComments }} {{ totalComments === 1 ? 'comment' : 'comments' }}</p>
          </div>
        </div>

        <!-- Toggle for admins/moderators -->
        <div v-if="canViewInternal" class="flex gap-0.5 md:gap-1 bg-gray-900/50 rounded-lg p-0.5 md:p-1 border border-gray-700 flex-shrink-0">
          <button
            @click="commentType = 'public'"
            :class="[
              'px-2 md:px-4 py-1 md:py-2 rounded text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap',
              commentType === 'public'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            ]"
          >
            Public
          </button>
          <button
            @click="commentType = 'internal'"
            :class="[
              'px-2 md:px-4 py-1 md:py-2 rounded text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap',
              commentType === 'internal'
                ? 'bg-yellow-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            ]"
          >
            Internal
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-6 md:py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p class="text-gray-400 mt-2 text-xs md:text-sm">Loading comments...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500 rounded-lg p-2.5 md:p-4 mb-3 md:mb-4">
        <p class="text-red-400 text-xs md:text-sm">{{ error }}</p>
      </div>

      <!-- Comments List -->
      <div v-else>
        <!-- New Comment Form -->
        <div class="mb-3 md:mb-4">
          <div class="bg-gray-800 rounded-lg p-2.5 md:p-4 border border-gray-700">
            <textarea
              v-model="newCommentContent"
              :placeholder="commentType === 'internal' ? 'Add note...' : 'Add comment...'"
              rows="2"
              class="w-full bg-gray-900 text-white rounded-lg p-2 md:p-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-xs md:text-sm"
              @keydown.ctrl.enter="submitComment"
              @keydown.meta.enter="submitComment"
            ></textarea>

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mt-2 md:mt-3">
              <p class="text-xs md:text-sm text-gray-400 min-w-0">
                <span class="block md:inline">{{ commentType === 'internal' ? '🔒 Staff only' : '👥 All members' }}</span>
              </p>
              <button
                @click="submitComment"
                :disabled="!newCommentContent.trim() || submitting"
                class="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded text-xs md:text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {{ submitting ? 'Posting...' : 'Post' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div v-if="filteredComments.length === 0" class="text-center py-6 md:py-8 text-gray-400">
          <p class="text-lg mb-1">{{ commentType === 'internal' ? '📝' : '💬' }}</p>
          <p class="text-xs md:text-sm">{{ commentType === 'internal' ? 'No notes' : 'No comments' }}</p>
        </div>

        <div v-else class="space-y-2 md:space-y-3">
          <div
            v-for="comment in filteredComments"
            :key="comment._id"
            :class="[
              'bg-gray-800 rounded-lg p-2 md:p-3 border transition-colors',
              comment.isPinned ? 'border-yellow-500 bg-gray-800/80' : 'border-gray-700',
              comment.type === 'internal' ? 'border-l-4 border-l-yellow-500' : ''
            ]"
          >
            <!-- Pinned Badge -->
            <div v-if="comment.isPinned" class="flex items-center gap-2 text-yellow-500 text-xs md:text-sm mb-1.5">
              <span>📌</span>
              <span class="font-medium">Pinned</span>
            </div>

            <!-- Comment Header -->
            <div class="flex items-start justify-between gap-2 mb-2 md:mb-3">
              <div class="flex items-start gap-2 min-w-0 flex-1">
                <!-- Avatar Image or Initials -->
                <div v-if="comment.author?.profile?.avatarUrl" class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                  <img :src="comment.author.avatarUrl" :alt="comment.author.firstName" class="w-full h-full object-cover">
                </div>
                <div v-else class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                  {{ getInitials(comment.author) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 flex-wrap">
                    <span class="font-semibold text-white text-xs md:text-sm">
                      {{ comment.author.firstName }}
                    </span>
                    <span v-if="comment.author.role" class="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 hidden sm:inline">
                      {{ comment.author.role }}
                    </span>
                    <span v-if="comment.type === 'internal'" class="text-xs px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300">
                      🔒
                    </span>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    {{ formatDate(comment.createdAt) }}
                    <span v-if="comment.isEdited" class="ml-1">(edited)</span>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <!-- Pin button (moderators only) -->
                <button
                  v-if="canModerate"
                  @click="togglePin(comment)"
                  class="text-gray-400 hover:text-yellow-500 transition-colors text-sm"
                  :title="comment.isPinned ? 'Unpin' : 'Pin'"
                >
                  {{ comment.isPinned ? '📌' : '📍' }}
                </button>

                <!-- Edit button (own comments) -->
                <button
                  v-if="isAuthor(comment)"
                  @click="startEdit(comment)"
                  class="text-gray-400 hover:text-blue-500 transition-colors text-sm"
                  title="Edit"
                >
                  ✏️
                </button>

                <!-- Delete button -->
                <button
                  v-if="canDelete(comment)"
                  @click="deleteComment(comment)"
                  class="text-gray-400 hover:text-red-500 transition-colors text-sm"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Comment Content -->
            <div v-if="editingCommentId === comment._id" class="mb-2 md:mb-3">
              <textarea
                v-model="editContent"
                rows="2"
                class="w-full bg-gray-900 text-white rounded-lg p-2 md:p-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-xs md:text-sm"
              ></textarea>
              <div class="flex gap-1 md:gap-2 mt-1.5 md:mt-2">
                <button
                  @click="saveEdit(comment)"
                  class="px-2 md:px-3 py-1 bg-blue-600 text-white text-xs md:text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="px-2 md:px-3 py-1 bg-gray-700 text-white text-xs md:text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div v-else class="text-gray-200 text-xs md:text-sm mb-2 md:mb-3 whitespace-pre-wrap break-words" v-html="renderContent(comment.content)"></div>

            <!-- Reactions & Reply -->
            <div class="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm">
              <div class="flex flex-wrap items-center gap-1">
                <button
                  v-for="emoji in availableEmojis"
                  :key="emoji"
                  @click="toggleReaction(comment, emoji)"
                  :class="[
                    'px-1.5 md:px-2 py-0.5 md:py-1 rounded transition-colors text-xs md:text-sm',
                    hasReacted(comment, emoji)
                      ? 'bg-blue-900 border border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                  ]"
                  :title="getReactionUsers(comment, emoji)"
                >
                  {{ emoji }}<span class="hidden sm:inline"> {{ getReactionCount(comment, emoji) }}</span>
                </button>
              </div>

              <!-- Reply button -->
              <button
                @click="startReply(comment)"
                class="text-xs md:text-sm text-gray-400 hover:text-blue-500 transition-colors whitespace-nowrap"
              >
                💬 Reply
              </button>
            </div>

            <!-- Reply Form -->
            <div v-if="replyingToId === comment._id" class="mt-2 md:mt-3 ml-4 md:ml-6 bg-gray-900 rounded-lg p-2 md:p-3 border border-gray-700">
              <textarea
                v-model="replyContent"
                placeholder="Write reply..."
                rows="2"
                class="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-xs md:text-sm"
              ></textarea>
              <div class="flex gap-1 md:gap-2 mt-1.5 md:mt-2">
                <button
                  @click="submitReply(comment)"
                  :disabled="!replyContent.trim()"
                  class="px-2 md:px-3 py-1 bg-blue-600 text-white text-xs md:text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Reply
                </button>
                <button
                  @click="cancelReply"
                  class="px-2 md:px-3 py-1 bg-gray-700 text-white text-xs md:text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            <!-- Replies -->
            <div v-if="comment.replies && comment.replies.length > 0" class="mt-2 md:mt-3 ml-4 md:ml-6 space-y-1.5 md:space-y-2">
              <div
                v-for="reply in comment.replies"
                :key="reply._id"
                class="bg-gray-900 rounded-lg p-2 md:p-3 border border-gray-700"
              >
                <div class="flex items-start justify-between gap-1 mb-1">
                  <div class="flex items-center gap-1.5 min-w-0 flex-1">
                    <!-- Avatar Image or Initials -->
                    <div v-if="reply.author?.profile?.avatarUrl" class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                      <img :src="reply.author.avatarUrl" :alt="reply.author.firstName" class="w-full h-full object-cover">
                    </div>
                    <div v-else class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-xs md:text-sm font-semibold flex-shrink-0">
                      {{ getInitials(reply.author) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <span class="font-semibold text-white text-xs md:text-sm">
                        {{ reply.author.firstName }}
                      </span>
                      <div class="text-xs text-gray-400">{{ formatDate(reply.createdAt) }}</div>
                    </div>
                  </div>
                  <button
                    v-if="canDelete(reply)"
                    @click="deleteComment(reply)"
                    class="text-gray-400 hover:text-red-500 transition-colors text-sm flex-shrink-0"
                  >
                    🗑️
                  </button>
                </div>
                <div class="text-gray-200 text-xs md:text-sm whitespace-pre-wrap break-words" v-html="renderContent(reply.content)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  props: {
    segmentId: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      comments: [],
      loading: false,
      error: null,
      commentType: 'public', // 'public' or 'internal'
      newCommentContent: '',
      submitting: false,
      editingCommentId: null,
      editContent: '',
      replyingToId: null,
      replyContent: '',
      availableEmojis: ['👍', '❤️', '🎉', '👏', '🔥', '✅']
    };
  },

  computed: {
    currentUser() {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    },

    canViewInternal() {
      return this.currentUser && ['admin', 'moderator'].includes(this.currentUser.role);
    },

    canModerate() {
      return this.currentUser && ['admin', 'moderator'].includes(this.currentUser.role);
    },

    filteredComments() {
      if (this.commentType === 'all') return this.comments;
      return this.comments.filter(c => c.type === this.commentType);
    },

    totalComments() {
      return this.comments.filter(c => c.type === this.commentType).length;
    }
  },

  mounted() {
    this.loadComments();
  },

  methods: {
    async loadComments() {
      this.loading = true;
      this.error = null;

      try {
        const params = {
          type: this.canViewInternal ? 'all' : 'public',
          includeReplies: 'true'
        };

        const response = await window.api.getSegmentComments(this.segmentId, params);

        if (response.success) {
          this.comments = response.data;
        } else {
          this.error = response.message || 'Failed to load comments';
        }
      } catch (err) {
        console.error('Load comments error:', err);
        this.error = err.message || 'Failed to load comments';
      } finally {
        this.loading = false;
      }
    },

    async submitComment() {
      if (!this.newCommentContent.trim() || this.submitting) return;

      this.submitting = true;
      this.error = null;

      try {
        const response = await window.api.createComment(this.segmentId, {
          content: this.newCommentContent,
          type: this.commentType
        });

        if (response.success) {
          this.newCommentContent = '';
          await this.loadComments();
        } else {
          this.error = response.message || 'Failed to post comment';
        }
      } catch (err) {
        console.error('Submit comment error:', err);
        this.error = err.message || 'Failed to post comment';
      } finally {
        this.submitting = false;
      }
    },

    async toggleReaction(comment, emoji) {
      try {
        await window.api.toggleCommentReaction(comment._id, emoji);
        await this.loadComments();
      } catch (err) {
        console.error('Toggle reaction error:', err);
      }
    },

    async togglePin(comment) {
      try {
        await window.api.toggleCommentPin(comment._id);
        await this.loadComments();
      } catch (err) {
        console.error('Toggle pin error:', err);
      }
    },

    startEdit(comment) {
      this.editingCommentId = comment._id;
      this.editContent = comment.content;
    },

    cancelEdit() {
      this.editingCommentId = null;
      this.editContent = '';
    },

    async saveEdit(comment) {
      if (!this.editContent.trim()) return;

      try {
        await window.api.updateComment(comment._id, { content: this.editContent });
        this.cancelEdit();
        await this.loadComments();
      } catch (err) {
        console.error('Edit comment error:', err);
        this.error = err.message || 'Failed to update comment';
      }
    },

    async deleteComment(comment) {
      if (!confirm('Are you sure you want to delete this comment?')) return;

      try {
        await window.api.deleteComment(comment._id);
        await this.loadComments();
      } catch (err) {
        console.error('Delete comment error:', err);
        this.error = err.message || 'Failed to delete comment';
      }
    },

    startReply(comment) {
      this.replyingToId = comment._id;
      this.replyContent = '';
    },

    cancelReply() {
      this.replyingToId = null;
      this.replyContent = '';
    },

    async submitReply(comment) {
      if (!this.replyContent.trim()) return;

      try {
        await window.api.createComment(this.segmentId, {
          content: this.replyContent,
          type: this.commentType,
          parentComment: comment._id
        });
        this.cancelReply();
        await this.loadComments();
      } catch (err) {
        console.error('Submit reply error:', err);
        this.error = err.message || 'Failed to post reply';
      }
    },

    isAuthor(comment) {
      return this.currentUser && comment.author._id === this.currentUser._id;
    },

    canDelete(comment) {
      if (!this.currentUser) return false;
      return this.isAuthor(comment) || ['admin', 'moderator'].includes(this.currentUser.role);
    },

    hasReacted(comment, emoji) {
      if (!this.currentUser) return false;
      return comment.reactions?.some(
        r => r.emoji === emoji && r.user._id === this.currentUser._id
      );
    },

    getReactionCount(comment, emoji) {
      const count = comment.reactions?.filter(r => r.emoji === emoji).length || 0;
      return count > 0 ? count : '';
    },

    getReactionUsers(comment, emoji) {
      const users = comment.reactions
        ?.filter(r => r.emoji === emoji)
        .map(r => `${r.user.firstName} ${r.user.lastName}`)
        .join(', ');
      return users || 'No reactions yet';
    },

    getInitials(author) {
      if (!author) return '?';
      return `${author.firstName?.[0] || ''}${author.lastName?.[0] || ''}`.toUpperCase();
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
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    },

    renderContent(content) {
      if (!content) return '';

      // Convert @mentions to clickable links
      return content.replace(
        /@\[([^\]]+)\]\(([a-f0-9]{24})\)/g,
        '<span class="text-blue-400 font-medium">@$1</span>'
      );
    }
  }
};
