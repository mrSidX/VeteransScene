export default {
  name: 'CommentThread',
  template: `
    <div class="comment-thread bg-gray-800 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
      <!-- Comments Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-yellow-600/20 rounded-lg">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">{{ commentType === 'internal' ? 'Internal Notes' : 'Comments' }}</h3>
            <p class="text-sm text-gray-400">{{ totalComments }} {{ totalComments === 1 ? 'comment' : 'comments' }} in this thread</p>
          </div>
        </div>

        <!-- Toggle for admins/moderators -->
        <div v-if="canViewInternal" class="flex gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-700">
          <button
            @click="commentType = 'public'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
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
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
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
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p class="text-gray-400 mt-2">Loading comments...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Comments List -->
      <div v-else>
        <!-- New Comment Form -->
        <div class="mb-6">
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <textarea
              v-model="newCommentContent"
              :placeholder="commentType === 'internal' ? 'Add an internal note (staff only)...' : 'Add a comment...'"
              rows="3"
              class="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              @keydown.ctrl.enter="submitComment"
              @keydown.meta.enter="submitComment"
            ></textarea>

            <div class="flex items-center justify-between mt-3">
              <p class="text-sm text-gray-400">
                {{ commentType === 'internal' ? '🔒 Only visible to admins and moderators' : '👥 Visible to all team members' }}
                <span class="ml-2 text-gray-500">• Use @[Name](userId) to mention someone</span>
              </p>
              <button
                @click="submitComment"
                :disabled="!newCommentContent.trim() || submitting"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ submitting ? 'Posting...' : 'Post Comment' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div v-if="filteredComments.length === 0" class="text-center py-8 text-gray-400">
          <p class="text-lg mb-2">{{ commentType === 'internal' ? '📝' : '💬' }}</p>
          <p>{{ commentType === 'internal' ? 'No internal notes yet' : 'No comments yet' }}</p>
          <p class="text-sm mt-1">Be the first to {{ commentType === 'internal' ? 'add a note' : 'comment' }}!</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="comment in filteredComments"
            :key="comment._id"
            :class="[
              'bg-gray-800 rounded-lg p-4 border transition-colors',
              comment.isPinned ? 'border-yellow-500 bg-gray-800/80' : 'border-gray-700',
              comment.type === 'internal' ? 'border-l-4 border-l-yellow-500' : ''
            ]"
          >
            <!-- Pinned Badge -->
            <div v-if="comment.isPinned" class="flex items-center gap-2 text-yellow-500 text-sm mb-2">
              <span>📌</span>
              <span class="font-medium">Pinned</span>
            </div>

            <!-- Comment Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {{ getInitials(comment.author) }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-white">
                      {{ comment.author.firstName }} {{ comment.author.lastName }}
                    </span>
                    <span v-if="comment.author.role" class="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                      {{ comment.author.role }}
                    </span>
                    <span v-if="comment.type === 'internal'" class="text-xs px-2 py-1 rounded bg-yellow-900 text-yellow-300">
                      🔒 Internal
                    </span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ formatDate(comment.createdAt) }}
                    <span v-if="comment.isEdited" class="ml-2">(edited)</span>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <!-- Pin button (moderators only) -->
                <button
                  v-if="canModerate"
                  @click="togglePin(comment)"
                  class="text-gray-400 hover:text-yellow-500 transition-colors"
                  :title="comment.isPinned ? 'Unpin comment' : 'Pin comment'"
                >
                  {{ comment.isPinned ? '📌' : '📍' }}
                </button>

                <!-- Edit button (own comments) -->
                <button
                  v-if="isAuthor(comment)"
                  @click="startEdit(comment)"
                  class="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Edit comment"
                >
                  ✏️
                </button>

                <!-- Delete button -->
                <button
                  v-if="canDelete(comment)"
                  @click="deleteComment(comment)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete comment"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Comment Content -->
            <div v-if="editingCommentId === comment._id" class="mb-3">
              <textarea
                v-model="editContent"
                rows="3"
                class="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button
                  @click="saveEdit(comment)"
                  class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div v-else class="text-gray-200 mb-3 whitespace-pre-wrap" v-html="renderContent(comment.content)"></div>

            <!-- Reactions -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <button
                  v-for="emoji in availableEmojis"
                  :key="emoji"
                  @click="toggleReaction(comment, emoji)"
                  :class="[
                    'px-2 py-1 rounded transition-colors text-sm',
                    hasReacted(comment, emoji)
                      ? 'bg-blue-900 border border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                  ]"
                  :title="getReactionUsers(comment, emoji)"
                >
                  {{ emoji }} {{ getReactionCount(comment, emoji) }}
                </button>
              </div>

              <!-- Reply button -->
              <button
                @click="startReply(comment)"
                class="text-sm text-gray-400 hover:text-blue-500 transition-colors"
              >
                💬 Reply
              </button>
            </div>

            <!-- Reply Form -->
            <div v-if="replyingToId === comment._id" class="mt-4 ml-8 bg-gray-900 rounded-lg p-3 border border-gray-700">
              <textarea
                v-model="replyContent"
                placeholder="Write a reply..."
                rows="2"
                class="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button
                  @click="submitReply(comment)"
                  :disabled="!replyContent.trim()"
                  class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reply
                </button>
                <button
                  @click="cancelReply"
                  class="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            <!-- Replies -->
            <div v-if="comment.replies && comment.replies.length > 0" class="mt-4 ml-8 space-y-3">
              <div
                v-for="reply in comment.replies"
                :key="reply._id"
                class="bg-gray-900 rounded-lg p-3 border border-gray-700"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                      {{ getInitials(reply.author) }}
                    </div>
                    <div>
                      <span class="font-semibold text-white text-sm">
                        {{ reply.author.firstName }} {{ reply.author.lastName }}
                      </span>
                      <div class="text-xs text-gray-400">{{ formatDate(reply.createdAt) }}</div>
                    </div>
                  </div>
                  <button
                    v-if="canDelete(reply)"
                    @click="deleteComment(reply)"
                    class="text-gray-400 hover:text-red-500 transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>
                <div class="text-gray-200 text-sm whitespace-pre-wrap" v-html="renderContent(reply.content)"></div>
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
