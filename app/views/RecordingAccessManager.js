import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'RecordingAccessManager',
  setup() {
    const authStore = useAuthStore();
    const activeTab = ref('grant'); // 'grant', 'manage', or 'invite'
    const users = ref([]);
    const filteredUsers = ref([]);
    const allSessions = ref([]);
    const loading = ref(false);
    const searchQuery = ref('');
    const selectedUser = ref(null);
    const showGrantModal = ref(false);
    const showDeleteModal = ref(false);
    const sessionToDelete = ref(null);

    // Invitation form state
    const inviteForm = ref({
      emailInput: '',
      emails: [],
      personalMessage: '',
      sessionType: 'one-time',
      sessionDurationHours: 24,
      mediaMode: 'video'
    });
    const invitations = ref([]);
    const inviteLoading = ref(false);
    const inviteError = ref('');
    const inviteSuccess = ref('');

    const getAvatarUrl = (user) => {
      if (!user?.profile?.avatarUrl || !user?.id) return '';
      const url = `${window.APP_CONFIG?.API_URL || 'http://localhost:5000/api'}/auth/avatar/${user.id}`;
      return `${url}?v=${encodeURIComponent(user.profile.avatarUrl)}`;
    };

    const grantForm = ref({
      sessionType: 'time-limited',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxRecordings: 1,
      description: '',
      purpose: 'Podcast Recording',
      mediaMode: 'video'
    });

    const sessionTypeOptions = [
      { value: 'one-time', label: 'One-Time Recording', description: 'User can upload 1 recording' },
      { value: 'time-limited', label: 'Time-Limited', description: 'Access expires on specified date' },
      { value: 'unlimited', label: 'Unlimited', description: 'User can upload multiple recordings' }
    ];

    const loadUsers = async () => {
      loading.value = true;
      try {
        const response = await window.api.get('/users');
        if (response.success) {
          users.value = response.data.users || response.data;
          filterUsers();
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        loading.value = false;
      }
    };

    const filterUsers = () => {
      if (!searchQuery.value) {
        filteredUsers.value = users.value;
        return;
      }
      const query = searchQuery.value.toLowerCase();
      filteredUsers.value = users.value.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query)
      );
    };

    const openGrantModal = (user) => {
      selectedUser.value = user;
      grantForm.value = {
        sessionType: 'time-limited',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxRecordings: 1,
        description: `Recording session for ${user.firstName} ${user.lastName}`,
        purpose: 'Podcast Recording',
        mediaMode: 'video'
      };
      showGrantModal.value = true;
    };

    const grantAccess = async () => {
      if (!selectedUser.value) return;

      loading.value = true;
      try {
        const payload = {
          userId: selectedUser.value._id,
          sessionType: grantForm.value.sessionType,
          description: grantForm.value.description || 'Recording session',
          purpose: grantForm.value.purpose || 'Podcast Recording',
          mediaMode: grantForm.value.mediaMode || 'video'
        };

        console.log('Sending payload:', payload);

        if (grantForm.value.sessionType === 'time-limited') {
          const expiryDate = new Date(grantForm.value.expiresAt);
          if (isNaN(expiryDate.getTime())) {
            alert('Invalid expiry date');
            loading.value = false;
            return;
          }
          payload.expiresAt = expiryDate.toISOString();
        }

        const response = await window.api.grantRecordingAccess(payload);
        console.log('Grant response:', response);

        if (response.success) {
          const sessionId = response.data?.session?._id;
          alert(`✅ Recording access granted to ${selectedUser.value.firstName}!\n\nSession ID: ${sessionId}`);
          showGrantModal.value = false;
          selectedUser.value = null;
        } else {
          const errorMsg = response.error || response.message || 'Failed to grant access';
          console.error('Grant access error:', response);
          alert('❌ Error: ' + errorMsg);
        }
      } catch (error) {
        console.error('Error granting access:', error);
        let errorMsg = error.message;
        if (error.data) {
          errorMsg += '\n\nDetails: ' + (error.data.error || error.data.message || JSON.stringify(error.data));
        }
        alert('❌ Error: ' + errorMsg);
      } finally {
        loading.value = false;
      }
    };

    const getSessionTypeLabel = (type) => {
      const option = sessionTypeOptions.find(o => o.value === type);
      return option ? option.label : type;
    };

    const loadAllSessions = async () => {
      loading.value = true;
      try {
        const response = await window.api.getAllSessions();
        if (response.success) {
          allSessions.value = response.data.sessions || [];
          console.log(`Loaded ${allSessions.value.length} sessions`);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        loading.value = false;
      }
    };

    const openDeleteModal = (session) => {
      sessionToDelete.value = session;
      showDeleteModal.value = true;
    };

    const deleteSession = async () => {
      if (!sessionToDelete.value) return;

      loading.value = true;
      try {
        const sessionId = sessionToDelete.value._id;
        console.log(`[RecordingAccessManager] Attempting to delete session: ${sessionId}`);
        const response = await window.api.delete(`/recordings/sessions/${sessionId}`);

        console.log(`[RecordingAccessManager] Delete response:`, response);

        if (response.success) {
          alert(`✅ Session deleted successfully`);
          showDeleteModal.value = false;
          sessionToDelete.value = null;
          await loadAllSessions();
        } else {
          const errorMsg = response.error || response.message || 'Failed to delete session';
          console.error(`[RecordingAccessManager] Delete failed: ${errorMsg}`);
          alert('❌ Error: ' + errorMsg);
        }
      } catch (error) {
        console.error('[RecordingAccessManager] Error deleting session:', error);
        const errorMsg = error.data?.error || error.data?.message || error.message || 'Unknown error';
        alert('❌ Error: ' + errorMsg);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const parseEmails = () => {
      const input = inviteForm.value.emailInput;
      const emailList = input
        .split(/[,;\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      inviteForm.value.emails = emailList;
    };

    const sendInvites = async () => {
      if (inviteForm.value.emails.length === 0) {
        inviteError.value = 'Please enter at least one email address';
        return;
      }

      inviteLoading.value = true;
      inviteError.value = '';
      inviteSuccess.value = '';

      try {
        const response = await window.api.sendInvitations({
          emails: inviteForm.value.emails,
          personalMessage: inviteForm.value.personalMessage,
          sessionType: inviteForm.value.sessionType,
          sessionDurationHours: inviteForm.value.sessionType === 'time-limited' ? inviteForm.value.sessionDurationHours : undefined,
          mediaMode: inviteForm.value.mediaMode || 'video'
        });

        if (response.success) {
          inviteSuccess.value = `✅ Invitations sent to ${inviteForm.value.emails.length} recipient(s)`;
          inviteForm.value = {
            emailInput: '',
            emails: [],
            personalMessage: '',
            sessionType: 'one-time',
            sessionDurationHours: 24,
            mediaMode: 'video'
          };
          await loadInvitations();
        }
      } catch (error) {
        console.error('Error sending invitations:', error);
        inviteError.value = error.message || 'Failed to send invitations';
      } finally {
        inviteLoading.value = false;
      }
    };

    const loadInvitations = async () => {
      try {
        const response = await window.api.listInvitations({ limit: 50 });
        if (response.success) {
          invitations.value = response.data.invitations || [];
        }
      } catch (error) {
        console.error('Error loading invitations:', error);
      }
    };

    const revokeInvitation = async (id) => {
      if (!confirm('Are you sure you want to revoke this invitation?')) return;

      try {
        const response = await window.api.revokeInvitation(id);
        if (response.success) {
          await loadInvitations();
        }
      } catch (error) {
        console.error('Error revoking invitation:', error);
        alert('Failed to revoke invitation');
      }
    };

    const resendInvitation = async (id) => {
      try {
        const response = await window.api.resendInvitation(id);
        if (response.success) {
          await loadInvitations();
        }
      } catch (error) {
        console.error('Error resending invitation:', error);
        alert('Failed to resend invitation');
      }
    };

    onMounted(async () => {
      await loadUsers();
      await loadInvitations();
    });

    return {
      activeTab,
      users,
      filteredUsers,
      allSessions,
      loading,
      searchQuery,
      selectedUser,
      showGrantModal,
      showDeleteModal,
      sessionToDelete,
      grantForm,
      sessionTypeOptions,
      filterUsers,
      openGrantModal,
      grantAccess,
      getSessionTypeLabel,
      loadAllSessions,
      openDeleteModal,
      deleteSession,
      formatDate,
      getAvatarUrl,
      authStore,
      // Invitation methods and state
      inviteForm,
      invitations,
      inviteLoading,
      inviteError,
      inviteSuccess,
      parseEmails,
      sendInvites,
      loadInvitations,
      revokeInvitation,
      resendInvitation
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-yellow-400 mb-2">Recording Access Manager</h1>
          <p class="text-gray-400">Grant users access to record videos for the podcast</p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-6 border-b border-gray-700">
          <button
            @click="activeTab = 'grant'"
            :class="[
              'px-4 py-3 font-semibold transition border-b-2',
              activeTab === 'grant'
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            ]"
          >
            ➕ Grant Access
          </button>
          <button
            @click="activeTab = 'manage'"
            :class="[
              'px-4 py-3 font-semibold transition border-b-2',
              activeTab === 'manage'
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            ]"
          >
            🗂️ Manage Sessions
          </button>
          <button
            @click="activeTab = 'invite'"
            :class="[
              'px-4 py-3 font-semibold transition border-b-2',
              activeTab === 'invite'
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            ]"
          >
            📧 Invite by Email
          </button>
        </div>

        <!-- Grant Access Tab -->
        <div v-show="activeTab === 'grant'">
          <!-- Search Box -->
        <div class="mb-6">
          <input
            v-model="searchQuery"
            @input="filterUsers"
            type="text"
            placeholder="Search by name or email..."
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <!-- Users Grid -->
        <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="user in filteredUsers"
            :key="user._id"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-400 transition"
          >
            <!-- User Info -->
            <div class="flex items-start gap-3 mb-3">
              <div v-if="getAvatarUrl(user)" class="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                <img :src="getAvatarUrl(user)" :alt="user.firstName" class="w-full h-full object-cover">
              </div>
              <div v-else class="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-sm font-bold flex-shrink-0">
                {{ user.firstName[0] }}{{ user.lastName[0] }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-100">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-sm text-gray-400 truncate">{{ user.email }}</p>
              </div>
            </div>

            <!-- Role Badge -->
            <div class="mb-3">
              <span :class="[
                'text-xs font-semibold px-2 py-1 rounded',
                user.role === 'admin' ? 'bg-red-900 text-red-200' : user.role === 'moderator' ? 'bg-blue-900 text-blue-200' : 'bg-gray-700 text-gray-300'
              ]">
                {{ user.role }}
              </span>
            </div>

            <!-- User Status -->
            <p v-if="user.isActive" class="text-xs text-green-400 mb-3">✓ Active</p>
            <p v-else class="text-xs text-red-400 mb-3">✗ Inactive</p>

            <!-- Grant Button -->
            <button
              @click="openGrantModal(user)"
              :disabled="loading"
              class="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              Grant Access
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else class="text-center py-12">
          <p class="text-gray-400">Loading users...</p>
        </div>

        <!-- No Results -->
        <div v-if="!loading && filteredUsers.length === 0" class="text-center py-12">
          <p class="text-gray-400">No users found</p>
        </div>
        </div>

        <!-- Manage Sessions Tab -->
        <div v-show="activeTab === 'manage'" class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-white">All Recording Sessions</h2>
            <button
              @click="loadAllSessions"
              :disabled="loading"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>

          <!-- Note about manual cleanup -->
          <div class="bg-blue-900/30 border border-blue-500 text-blue-200 p-4 rounded-lg mb-4">
            <p class="text-sm">💡 <strong>Tip:</strong> You can delete expired or unwanted sessions below. This will prevent them from appearing in user dashboards.</p>
          </div>

          <!-- Loading State -->
          <div v-if="loading && allSessions.length === 0" class="text-center py-12">
            <p class="text-gray-400">Loading sessions...</p>
          </div>

          <!-- Sessions Grid -->
          <div v-else-if="allSessions.length > 0" class="grid grid-cols-1 gap-4">
            <div
              v-for="session in allSessions"
              :key="session._id"
              class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-400 transition"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <p class="font-semibold text-gray-100">{{ session.user?.firstName }} {{ session.user?.lastName }}</p>
                  <p class="text-sm text-gray-400">{{ session.user?.email }}</p>
                </div>
                <span :class="[
                  'text-xs font-bold px-2 py-1 rounded',
                  session.status === 'active' ? 'bg-green-900 text-green-200' :
                  session.status === 'expired' ? 'bg-red-900 text-red-200' :
                  session.status === 'revoked' ? 'bg-gray-700 text-gray-300' :
                  'bg-blue-900 text-blue-200'
                ]">
                  {{ session.status }}
                </span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-400 mb-3">
                <div>
                  <p class="text-gray-500">Type</p>
                  <p class="font-semibold text-gray-200">{{ session.sessionType }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Media</p>
                  <p class="font-semibold text-gray-200">{{ session.mediaMode === 'audio' ? 'Audio' : session.mediaMode === 'both' ? 'Video or Audio' : 'Video' }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Created</p>
                  <p class="font-semibold text-gray-200">{{ formatDate(session.createdAt) }}</p>
                </div>
                <div v-if="session.expiresAt">
                  <p class="text-gray-500">Expires</p>
                  <p class="font-semibold text-gray-200">{{ formatDate(session.expiresAt) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Recordings</p>
                  <p class="font-semibold text-gray-200">{{ session.recordingsCompleted || 0 }}/{{ session.maxRecordings }}</p>
                </div>
              </div>

              <button
                @click="openDeleteModal(session)"
                class="w-full bg-red-900 hover:bg-red-800 text-red-200 font-semibold py-2 px-4 rounded transition"
              >
                🗑️ Delete Session
              </button>
            </div>
          </div>

          <!-- No Sessions -->
          <div v-else class="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p class="text-gray-400 mb-2">No recording sessions found</p>
            <p class="text-sm text-gray-500">Click "Refresh" to load sessions, or grant access to users above.</p>
          </div>
        </div>

        <!-- Invite Tab -->
        <div v-show="activeTab === 'invite'" class="space-y-6">
          <!-- Email Input Section -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-2xl font-bold text-yellow-400 mb-4">Send Recording Invitations</h2>

            <!-- Error Alert -->
            <div v-if="inviteError" class="bg-red-900/30 border border-red-600 text-red-200 p-4 rounded-lg mb-4">
              {{ inviteError }}
            </div>

            <!-- Success Alert -->
            <div v-if="inviteSuccess" class="bg-green-900/30 border border-green-600 text-green-200 p-4 rounded-lg mb-4">
              {{ inviteSuccess }}
            </div>

            <div class="space-y-4">
              <!-- Email Addresses -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Email Addresses *</label>
                <textarea
                  v-model="inviteForm.emailInput"
                  @blur="parseEmails"
                  placeholder="One per line, or comma/semicolon-separated"
                  rows="4"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                ></textarea>
                <p v-if="inviteForm.emails.length > 0" class="text-xs text-gray-400 mt-1">
                  {{ inviteForm.emails.length }} email(s) parsed
                </p>
              </div>

              <!-- Personal Message -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Personal Message (Optional)</label>
                <textarea
                  v-model="inviteForm.personalMessage"
                  maxlength="500"
                  placeholder="Add a custom message to the invitation email"
                  rows="3"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                ></textarea>
                <p class="text-xs text-gray-400 mt-1">{{ inviteForm.personalMessage.length }}/500</p>
              </div>

              <!-- Session Type -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Session Type</label>
                <select
                  v-model="inviteForm.sessionType"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="one-time">One Recording</option>
                  <option value="time-limited">Time-Limited (24-48 hours)</option>
                  <option value="unlimited">Unlimited Access</option>
                </select>
              </div>

              <!-- Media Mode Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Recording Type</label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="inviteForm.mediaMode = 'video'"
                    :class="[
                      'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                      inviteForm.mediaMode === 'video'
                        ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                    ]"
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    @click="inviteForm.mediaMode = 'audio'"
                    :class="[
                      'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                      inviteForm.mediaMode === 'audio'
                        ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                    ]"
                  >
                    Audio Only
                  </button>
                  <button
                    type="button"
                    @click="inviteForm.mediaMode = 'both'"
                    :class="[
                      'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                      inviteForm.mediaMode === 'both'
                        ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                    ]"
                  >
                    Both (User's Choice)
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ inviteForm.mediaMode === 'both' ? 'User will choose between video or audio when recording' : '' }}</p>
              </div>

              <!-- Duration for time-limited sessions -->
              <div v-if="inviteForm.sessionType === 'time-limited'">
                <label class="block text-sm font-medium text-gray-300 mb-2">Session Duration (Hours)</label>
                <input
                  v-model.number="inviteForm.sessionDurationHours"
                  type="number"
                  min="1"
                  max="240"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <!-- Send Button -->
              <button
                @click="sendInvites"
                :disabled="inviteLoading || inviteForm.emails.length === 0"
                class="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="inviteLoading">⏳ Sending...</span>
                <span v-else>📧 Send Invitations</span>
              </button>
            </div>
          </div>

          <!-- Sent Invitations Table -->
          <div v-if="invitations.length > 0" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 class="text-xl font-bold text-white mb-4">Sent Invitations</h3>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-gray-700">
                  <tr class="text-gray-300">
                    <th class="text-left py-2">Email</th>
                    <th class="text-left py-2">Status</th>
                    <th class="text-left py-2">Sent By</th>
                    <th class="text-left py-2">Sent Date</th>
                    <th class="text-left py-2">Expires</th>
                    <th class="text-left py-2">Recordings</th>
                    <th class="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in invitations" :key="inv._id" class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="py-3">{{ inv.email }}</td>
                    <td class="py-3">
                      <span :class="[
                        'text-xs font-bold px-2 py-1 rounded',
                        inv.status === 'pending' ? 'bg-blue-900 text-blue-200' :
                        inv.status === 'redeemed' ? 'bg-green-900 text-green-200' :
                        inv.status === 'expired' ? 'bg-red-900 text-red-200' :
                        'bg-gray-700 text-gray-300'
                      ]">
                        {{ inv.status }}
                      </span>
                    </td>
                    <td class="py-3 text-gray-400">{{ inv.invitedBy?.firstName }}</td>
                    <td class="py-3 text-gray-400">{{ formatDate(inv.createdAt) }}</td>
                    <td class="py-3 text-gray-400">{{ formatDate(inv.expiresAt) }}</td>
                    <td class="py-3 text-gray-400">{{ inv.recordingsCompleted || 0 }}</td>
                    <td class="py-3 text-right space-x-2">
                      <button
                        v-if="inv.status === 'pending'"
                        @click="resendInvitation(inv._id)"
                        class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition"
                      >
                        Resend
                      </button>
                      <button
                        v-if="inv.status !== 'revoked'"
                        @click="revokeInvitation(inv._id)"
                        class="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Grant Modal -->
      <div v-if="showGrantModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4">
            Grant Recording Access
          </h2>

          <p class="text-gray-300 mb-6">
            User: <strong>{{ selectedUser?.firstName }} {{ selectedUser?.lastName }}</strong> ({{ selectedUser?.email }})
          </p>

          <div class="space-y-4">
            <!-- Session Type Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Session Type</label>
              <select
                v-model="grantForm.sessionType"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option v-for="option in sessionTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p class="text-xs text-gray-400 mt-1">
                {{ sessionTypeOptions.find(o => o.value === grantForm.sessionType)?.description }}
              </p>
            </div>

            <!-- Media Mode Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Recording Type</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="grantForm.mediaMode = 'video'"
                  :class="[
                    'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                    grantForm.mediaMode === 'video'
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                  ]"
                >
                  Video
                </button>
                <button
                  type="button"
                  @click="grantForm.mediaMode = 'audio'"
                  :class="[
                    'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                    grantForm.mediaMode === 'audio'
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                  ]"
                >
                  Audio Only
                </button>
                <button
                  type="button"
                  @click="grantForm.mediaMode = 'both'"
                  :class="[
                    'flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition border',
                    grantForm.mediaMode === 'both'
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                  ]"
                >
                  Both (User's Choice)
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ grantForm.mediaMode === 'both' ? 'User will choose between video or audio when recording' : '' }}</p>
            </div>

            <!-- Expiry Date (for time-limited) -->
            <div v-if="grantForm.sessionType === 'time-limited'">
              <label class="block text-sm font-medium text-gray-300 mb-2">Expires On</label>
              <input
                v-model="grantForm.expiresAt"
                type="date"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <!-- Max Recordings -->
            <div v-if="grantForm.sessionType !== 'time-limited'">
              <label class="block text-sm font-medium text-gray-300 mb-2">Max Recordings</label>
              <input
                v-model.number="grantForm.maxRecordings"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <!-- Purpose -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Purpose/Description</label>
              <input
                v-model="grantForm.purpose"
                type="text"
                placeholder="e.g., Podcast Recording, Interview"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <!-- Optional Description -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
              <textarea
                v-model="grantForm.description"
                placeholder="Any additional details..."
                rows="3"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              ></textarea>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 mt-6">
            <button
              @click="grantAccess"
              :disabled="loading"
              class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              <span v-if="loading">Granting...</span>
              <span v-else>Grant Access</span>
            </button>
            <button
              @click="showGrantModal = false"
              :disabled="loading"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 border border-red-700 rounded-lg p-6 w-full max-w-md">
          <h2 class="text-2xl font-bold text-red-400 mb-4">Delete Session?</h2>

          <div v-if="sessionToDelete" class="bg-gray-700/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
            <p><span class="text-gray-500">User:</span> <strong class="text-gray-100">{{ sessionToDelete.user?.firstName }} {{ sessionToDelete.user?.lastName }}</strong></p>
            <p><span class="text-gray-500">Type:</span> <strong class="text-gray-100">{{ sessionToDelete.sessionType }}</strong></p>
            <p><span class="text-gray-500">Status:</span> <strong class="text-gray-100">{{ sessionToDelete.status }}</strong></p>
            <p><span class="text-gray-500">Created:</span> <strong class="text-gray-100">{{ formatDate(sessionToDelete.createdAt) }}</strong></p>
          </div>

          <p class="text-gray-300 mb-6">
            Are you sure you want to delete this recording session? This action cannot be undone.
          </p>

          <!-- Buttons -->
          <div class="flex gap-3">
            <button
              @click="deleteSession"
              :disabled="loading"
              class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              <span v-if="loading">Deleting...</span>
              <span v-else>Delete</span>
            </button>
            <button
              @click="showDeleteModal = false"
              :disabled="loading"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
