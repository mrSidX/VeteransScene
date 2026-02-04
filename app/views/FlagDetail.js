export default {
  name: 'FlagDetail',
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>

      <!-- Flag Detail -->
      <div v-else-if="flag" class="space-y-6">
        <!-- Header with Back Button -->
        <div class="flex items-center gap-4 mb-6">
          <button
            @click="goBack"
            class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-white mb-1">{{ flag.title }}</h1>
            <div class="flex items-center gap-2">
              <span :class="getPriorityBadge(flag.priority)" class="px-2 py-1 text-xs font-bold rounded">
                {{ flag.priority.toUpperCase() }}
              </span>
              <span :class="getStatusBadge(flag.status)" class="px-2 py-1 text-xs rounded">
                {{ formatStatus(flag.status) }}
              </span>
              <span class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                {{ formatFlagType(flag.flagType) }}
              </span>
              <span class="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded">
                {{ flag.resourceType }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="canEdit"
              @click="showEditModal = true"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              v-if="canResolve && flag.status !== 'resolved'"
              @click="resolveFlag"
              class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
            >
              Resolve
            </button>
            <button
              v-if="canDismiss && flag.status !== 'dismissed'"
              @click="dismissFlag"
              class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              Dismiss
            </button>
            <button
              v-if="canEscalate && flag.status !== 'escalated'"
              @click="showEscalateModal = true"
              class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
            >
              Escalate
            </button>
          </div>
        </div>

        <!-- Flag Details Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="text-sm font-medium text-gray-400 mb-2">Raised By</h3>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-sm font-bold">
                  {{ getInitials(flag.raisedBy) }}
                </div>
                <div>
                  <p class="text-white text-sm">{{ getUserName(flag.raisedBy) }}</p>
                  <p class="text-gray-500 text-xs">{{ formatDate(flag.createdAt) }}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium text-gray-400 mb-2">Assigned To</h3>
              <div v-if="flag.assignedTo && flag.assignedTo.length > 0" class="flex flex-wrap gap-2">
                <div
                  v-for="user in flag.assignedTo"
                  :key="user._id"
                  class="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded"
                >
                  <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {{ getInitials(user) }}
                  </div>
                  <span class="text-white text-sm">{{ getUserName(user) }}</span>
                </div>
              </div>
              <p v-else class="text-gray-500 text-sm">Not assigned</p>
            </div>

            <div v-if="flag.resolvedBy">
              <h3 class="text-sm font-medium text-gray-400 mb-2">Resolved By</h3>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                  {{ getInitials(flag.resolvedBy) }}
                </div>
                <div>
                  <p class="text-white text-sm">{{ getUserName(flag.resolvedBy) }}</p>
                  <p class="text-gray-500 text-xs">{{ formatDate(flag.resolvedAt) }}</p>
                </div>
              </div>
            </div>

            <div v-if="flag.resolutionNotes">
              <h3 class="text-sm font-medium text-gray-400 mb-2">Resolution Notes</h3>
              <p class="text-gray-300 text-sm">{{ flag.resolutionNotes }}</p>
            </div>
          </div>

          <div v-if="flag.description">
            <h3 class="text-sm font-medium text-gray-400 mb-2">Description</h3>
            <p class="text-gray-300 text-sm whitespace-pre-wrap">{{ flag.description }}</p>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Comments & Coordination</h2>

          <!-- Add Comment Form -->
          <div class="mb-6">
            <textarea
              v-model="newComment"
              rows="3"
              placeholder="Add a comment to coordinate with the team..."
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 placeholder-gray-400 focus:border-yellow-500 focus:outline-none resize-none"
            ></textarea>
            <div class="flex justify-end mt-2">
              <button
                @click="addComment"
                :disabled="!newComment.trim() || addingComment"
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-medium text-sm rounded transition-colors"
              >
                {{ addingComment ? 'Posting...' : 'Post Comment' }}
              </button>
            </div>
          </div>

          <!-- Comments List -->
          <div v-if="loadingComments" class="flex items-center justify-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>

          <div v-else-if="comments.length === 0" class="text-center py-8">
            <p class="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="comment in comments"
              :key="comment._id"
              class="bg-gray-750 border border-gray-600 rounded-lg p-4"
            >
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex items-start gap-3 flex-1">
                  <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {{ getInitials(comment.author) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-white font-medium text-sm">{{ comment.author?.firstName }} {{ comment.author?.lastName }}</span>
                      <span v-if="comment.author?.role" class="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                        {{ comment.author.role }}
                      </span>
                      <span v-if="comment.isEdited" class="text-gray-500 text-xs">(edited)</span>
                    </div>
                    <p class="text-gray-500 text-xs">{{ formatDate(comment.createdAt) }}</p>
                  </div>
                </div>
                <div v-if="canEditComment(comment) || canDeleteComment(comment)" class="flex items-center gap-1">
                  <button
                    v-if="canEditComment(comment)"
                    @click="startEditComment(comment)"
                    class="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Edit comment"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    v-if="canDeleteComment(comment)"
                    @click="deleteComment(comment)"
                    class="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete comment"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Edit Mode -->
              <div v-if="editingComment && editingComment._id === comment._id" class="mt-3">
                <textarea
                  v-model="editCommentContent"
                  rows="3"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none resize-none"
                ></textarea>
                <div class="flex justify-end gap-2 mt-2">
                  <button
                    @click="cancelEditComment"
                    class="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    @click="saveEditComment"
                    :disabled="!editCommentContent.trim() || savingComment"
                    class="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium rounded transition-colors"
                  >
                    {{ savingComment ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>

              <!-- Display Mode -->
              <p v-else class="text-gray-300 text-sm whitespace-pre-wrap mt-2">{{ comment.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="text-center py-16">
        <div class="inline-block p-4 bg-gray-800 rounded-full mb-4">
          <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Flag Not Found</h3>
        <p class="text-gray-400 mb-6">The flag you're looking for doesn't exist or has been deleted.</p>
        <button
          @click="goBack"
          class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="closeEditModal">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Edit Flag</h2>
            <button @click="closeEditModal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>

          <form @submit.prevent="updateFlag" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  v-model="editForm.status"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  v-model="editForm.priority"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                v-model="editForm.title"
                type="text"
                maxlength="200"
                class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                v-model="editForm.description"
                rows="4"
                maxlength="2000"
                class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="closeEditModal"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="updating"
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium text-sm rounded transition-colors"
              >
                {{ updating ? 'Updating...' : 'Update Flag' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Escalate Modal -->
      <div v-if="showEscalateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="closeEscalateModal">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Escalate Flag</h2>
            <button @click="closeEscalateModal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>

          <form @submit.prevent="escalateFlagConfirm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Escalation Notes</label>
              <textarea
                v-model="escalateNotes"
                rows="4"
                placeholder="Explain why this flag needs to be escalated..."
                required
                class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="closeEscalateModal"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="escalating"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-medium text-sm rounded transition-colors"
              >
                {{ escalating ? 'Escalating...' : 'Escalate' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      flag: null,
      loading: true,
      comments: [],
      loadingComments: false,
      newComment: '',
      addingComment: false,
      editingComment: null,
      editCommentContent: '',
      savingComment: false,
      showEditModal: false,
      showEscalateModal: false,
      updating: false,
      escalating: false,
      escalateNotes: '',
      editForm: {
        status: '',
        priority: '',
        title: '',
        description: ''
      },
      user: JSON.parse(localStorage.getItem('vs_user_data') || localStorage.getItem('user') || '{}')
    };
  },

  computed: {
    canEdit() {
      if (!this.flag) return false;
      return this.user.role === 'admin' ||
             this.user.role === 'moderator' ||
             this.flag.raisedBy?._id === this.user._id;
    },
    canResolve() {
      if (!this.flag) return false;
      return this.user.role === 'admin' ||
             this.user.role === 'moderator' ||
             (this.flag.assignedTo && this.flag.assignedTo.some(u => u._id === this.user._id));
    },
    canDismiss() {
      return this.user.role === 'admin' || this.user.role === 'moderator';
    },
    canEscalate() {
      return this.user.role === 'admin' || this.user.role === 'moderator';
    }
  },

  async mounted() {
    const flagId = this.$route?.params?.id;
    if (flagId) {
      await this.loadFlag(flagId);
      await this.loadComments();
    }
  },

  methods: {
    async loadFlag(flagId) {
      this.loading = true;
      try {
        const response = await window.api.getFlagById(flagId);
        if (response.success) {
          this.flag = response.data;
        }
      } catch (err) {
        console.error('Load flag error:', err);
        this.$root.showToast?.('Failed to load flag', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadComments() {
      this.loadingComments = true;
      try {
        const response = await window.api.getFlagComments(this.flag._id);
        if (response.success) {
          this.comments = response.data;
        }
      } catch (err) {
        console.error('Load comments error:', err);
      } finally {
        this.loadingComments = false;
      }
    },

    async addComment() {
      if (!this.newComment.trim()) return;

      const content = this.newComment.trim();
      this.newComment = '';
      this.addingComment = true;

      try {
        const response = await window.api.addFlagComment(this.flag._id, content);
        if (response.success) {
          this.comments.push(response.data);
          this.$root.showToast?.('Comment added', 'success');
        }
      } catch (err) {
        console.error('Add comment error:', err);
        this.newComment = content;
        this.$root.showToast?.('Failed to add comment', 'error');
      } finally {
        this.addingComment = false;
      }
    },

    startEditComment(comment) {
      this.editingComment = comment;
      this.editCommentContent = comment.content;
    },

    cancelEditComment() {
      this.editingComment = null;
      this.editCommentContent = '';
    },

    async saveEditComment() {
      if (!this.editCommentContent.trim()) return;

      this.savingComment = true;
      try {
        const response = await window.api.updateFlagComment(
          this.flag._id,
          this.editingComment._id,
          this.editCommentContent.trim()
        );
        if (response.success) {
          const index = this.comments.findIndex(c => c._id === this.editingComment._id);
          if (index !== -1) {
            this.comments[index] = response.data;
          }
          this.$root.showToast?.('Comment updated', 'success');
          this.cancelEditComment();
        }
      } catch (err) {
        console.error('Update comment error:', err);
        this.$root.showToast?.('Failed to update comment', 'error');
      } finally {
        this.savingComment = false;
      }
    },

    async deleteComment(comment) {
      if (!confirm('Delete this comment?')) return;

      try {
        const response = await window.api.deleteFlagComment(this.flag._id, comment._id);
        if (response.success) {
          this.comments = this.comments.filter(c => c._id !== comment._id);
          this.$root.showToast?.('Comment deleted', 'success');
        }
      } catch (err) {
        console.error('Delete comment error:', err);
        this.$root.showToast?.('Failed to delete comment', 'error');
      }
    },

    canEditComment(comment) {
      return comment.author?._id === this.user._id || this.user.role === 'admin';
    },

    canDeleteComment(comment) {
      return comment.author?._id === this.user._id ||
             this.user.role === 'admin' ||
             this.user.role === 'moderator';
    },

    async updateFlag() {
      this.updating = true;
      try {
        const response = await window.api.updateFlag(this.flag._id, this.editForm);
        if (response.success) {
          this.flag = response.data;
          this.$root.showToast?.('Flag updated', 'success');
          this.closeEditModal();
        }
      } catch (err) {
        console.error('Update flag error:', err);
        this.$root.showToast?.('Failed to update flag', 'error');
      } finally {
        this.updating = false;
      }
    },

    async resolveFlag() {
      const notes = prompt('Add resolution notes (optional):');
      if (notes === null) return; // User cancelled

      try {
        const response = await window.api.resolveFlag(this.flag._id, notes);
        if (response.success) {
          this.flag = response.data;
          this.$root.showToast?.('Flag resolved', 'success');
        }
      } catch (err) {
        console.error('Resolve flag error:', err);
        this.$root.showToast?.('Failed to resolve flag', 'error');
      }
    },

    async dismissFlag() {
      const notes = prompt('Add dismissal notes (optional):');
      if (notes === null) return; // User cancelled

      try {
        const response = await window.api.dismissFlag(this.flag._id, notes);
        if (response.success) {
          this.flag = response.data;
          this.$root.showToast?.('Flag dismissed', 'success');
        }
      } catch (err) {
        console.error('Dismiss flag error:', err);
        this.$root.showToast?.('Failed to dismiss flag', 'error');
      }
    },

    async escalateFlagConfirm() {
      this.escalating = true;
      try {
        const response = await window.api.escalateFlag(this.flag._id, this.escalateNotes, []);
        if (response.success) {
          this.flag = response.data;
          this.$root.showToast?.('Flag escalated', 'success');
          this.closeEscalateModal();
        }
      } catch (err) {
        console.error('Escalate flag error:', err);
        this.$root.showToast?.('Failed to escalate flag', 'error');
      } finally {
        this.escalating = false;
      }
    },

    closeEditModal() {
      this.showEditModal = false;
      this.editForm = {
        status: this.flag.status,
        priority: this.flag.priority,
        title: this.flag.title,
        description: this.flag.description
      };
    },

    closeEscalateModal() {
      this.showEscalateModal = false;
      this.escalateNotes = '';
    },

    goBack() {
      if (this.$router) {
        this.$router.push('/flags');
      } else {
        window.location.href = '#/flags';
      }
    },

    getPriorityBadge(priority) {
      const classes = {
        urgent: 'bg-red-600 text-white',
        high: 'bg-orange-600 text-white',
        medium: 'bg-yellow-600 text-gray-900',
        low: 'bg-gray-600 text-gray-300'
      };
      return classes[priority] || 'bg-gray-600 text-gray-300';
    },

    getStatusBadge(status) {
      const classes = {
        open: 'bg-blue-900/30 text-blue-300',
        in_progress: 'bg-yellow-900/30 text-yellow-300',
        resolved: 'bg-green-900/30 text-green-300',
        dismissed: 'bg-gray-600 text-gray-300',
        escalated: 'bg-red-900/30 text-red-300'
      };
      return classes[status] || 'bg-gray-600 text-gray-300';
    },

    formatStatus(status) {
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    formatFlagType(type) {
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    },

    getInitials(user) {
      if (!user) return '?';
      const firstName = user.firstName || user.name?.split(' ')[0] || '';
      const lastName = user.lastName || user.name?.split(' ')[1] || '';
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '?';
    },

    getUserName(user) {
      if (!user) return 'Unknown';
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      if (user.name) return user.name; // Fallback for old data
      return user.email || 'Unknown';
    }
  },

  watch: {
    '$route.params.id': {
      immediate: false,
      async handler(newId) {
        if (newId) {
          await this.loadFlag(newId);
          await this.loadComments();
        }
      }
    },
    'showEditModal'(newVal) {
      if (newVal && this.flag) {
        this.editForm = {
          status: this.flag.status,
          priority: this.flag.priority,
          title: this.flag.title,
          description: this.flag.description
        };
      }
    }
  }
};
