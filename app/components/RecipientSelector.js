import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'RecipientSelector',
  props: {
    modelValue: {
      type: Object,
      default: () => ({
        type: 'custom_emails',
        customEmails: [],
        roles: [],
        mailingListId: null,
        userIds: [],
        excludeUserIds: []
      })
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const recipientType = ref(props.modelValue.type || 'custom_emails');
    const customEmails = ref(props.modelValue.customEmails?.join(', ') || '');
    const selectedRoles = ref(props.modelValue.roles || []);
    const mailingLists = ref([]);
    const selectedMailingListId = ref(props.modelValue.mailingListId || null);
    const userSearch = ref('');
    const searchResults = ref([]);
    const selectedUsers = ref(props.modelValue.userIds || []);
    const excludeUserSearch = ref('');
    const excludeSearchResults = ref([]);
    const excludedUsers = ref(props.modelValue.excludeUserIds || []);
    const loadingLists = ref(false);
    const loadingSearch = ref(false);

    const roles = [
      { value: 'admin', label: 'Admins' },
      { value: 'moderator', label: 'Moderators' },
      { value: 'contributor', label: 'Contributors' },
      { value: 'participant', label: 'Participants' },
      { value: 'user', label: 'Users' },
      { value: 'viewer', label: 'Viewers' },
      { value: 'guest', label: 'Guests' }
    ];

    const toggleRole = (role) => {
      const index = selectedRoles.value.indexOf(role);
      if (index > -1) {
        selectedRoles.value.splice(index, 1);
      } else {
        selectedRoles.value.push(role);
      }
      emitUpdate();
    };

    const searchUsers = async (query, forExclusion = false) => {
      if (!query || query.length < 2) {
        if (forExclusion) {
          excludeSearchResults.value = [];
        } else {
          searchResults.value = [];
        }
        return;
      }

      loadingSearch.value = true;
      try {
        const response = await api.get(`/email/users/search?q=${encodeURIComponent(query)}&limit=10`);
        if (forExclusion) {
          excludeSearchResults.value = response.data.filter(
            u => !excludedUsers.value.find(eu => eu._id === u._id)
          );
        } else {
          searchResults.value = response.data.filter(
            u => !selectedUsers.value.find(su => su._id === u._id)
          );
        }
      } catch (error) {
        console.error('Search users error:', error);
      } finally {
        loadingSearch.value = false;
      }
    };

    const selectUser = (user) => {
      selectedUsers.value.push(user);
      userSearch.value = '';
      searchResults.value = [];
      emitUpdate();
    };

    const removeUser = (userId) => {
      selectedUsers.value = selectedUsers.value.filter(u => u._id !== userId);
      emitUpdate();
    };

    const selectExcludedUser = (user) => {
      excludedUsers.value.push(user);
      excludeUserSearch.value = '';
      excludeSearchResults.value = [];
      emitUpdate();
    };

    const removeExcludedUser = (userId) => {
      excludedUsers.value = excludedUsers.value.filter(u => u._id !== userId);
      emitUpdate();
    };

    const loadMailingLists = async () => {
      loadingLists.value = true;
      try {
        const response = await api.get('/email/lists?limit=50&isActive=true');
        mailingLists.value = response.data;
      } catch (error) {
        console.error('Load mailing lists error:', error);
      } finally {
        loadingLists.value = false;
      }
    };

    const emitUpdate = () => {
      emit('update:modelValue', {
        type: recipientType.value,
        customEmails: recipientType.value === 'custom_emails'
          ? customEmails.value.split(',').map(e => e.trim()).filter(e => e)
          : [],
        roles: recipientType.value === 'roles' ? selectedRoles.value : [],
        mailingListId: recipientType.value === 'mailing_list' ? selectedMailingListId.value : null,
        userIds: recipientType.value === 'users' ? selectedUsers.value.map(u => u._id) : [],
        excludeUserIds: excludedUsers.value.map(u => u._id)
      });
    };

    // Load mailing lists on mount
    onMounted(() => {
      loadMailingLists();
    });

    return {
      recipientType,
      customEmails,
      selectedRoles,
      mailingLists,
      selectedMailingListId,
      userSearch,
      searchResults,
      selectedUsers,
      excludeUserSearch,
      excludeSearchResults,
      excludedUsers,
      loadingLists,
      loadingSearch,
      roles,
      toggleRole,
      searchUsers,
      selectUser,
      removeUser,
      selectExcludedUser,
      removeExcludedUser,
      loadMailingLists,
      emitUpdate
    };
  },
  template: `
    <div class="space-y-6 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div>
        <label class="block text-sm font-semibold text-gray-300 mb-3">👥 Recipient Type</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="recipientType = 'custom_emails'; emitUpdate()"
            :class="recipientType === 'custom_emails' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            class="px-4 py-2 rounded-lg font-semibold transition">
            Custom Emails
          </button>
          <button
            @click="recipientType = 'roles'; emitUpdate()"
            :class="recipientType === 'roles' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            class="px-4 py-2 rounded-lg font-semibold transition">
            User Roles
          </button>
          <button
            @click="recipientType = 'mailing_list'; emitUpdate()"
            :class="recipientType === 'mailing_list' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            class="px-4 py-2 rounded-lg font-semibold transition">
            Mailing List
          </button>
          <button
            @click="recipientType = 'users'; emitUpdate()"
            :class="recipientType === 'users' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            class="px-4 py-2 rounded-lg font-semibold transition">
            Individual Users
          </button>
        </div>
      </div>

      <!-- Custom Emails -->
      <div v-if="recipientType === 'custom_emails'" class="space-y-2">
        <label class="block text-sm font-semibold text-gray-300">Email Addresses</label>
        <textarea
          v-model="customEmails"
          @input="emitUpdate"
          rows="3"
          placeholder="Email1@example.com, Email2@example.com"
          class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition"></textarea>
        <p class="text-xs text-gray-400">Separate emails with commas</p>
      </div>

      <!-- User Roles -->
      <div v-if="recipientType === 'roles'" class="space-y-3">
        <label class="block text-sm font-semibold text-gray-300">Select Roles</label>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="role in roles" :key="role.value" class="flex items-center">
            <input
              type="checkbox"
              :id="'role-' + role.value"
              :checked="selectedRoles.includes(role.value)"
              @change="toggleRole(role.value)"
              class="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer">
            <label :for="'role-' + role.value" class="ml-2 text-sm text-gray-300 cursor-pointer">
              {{ role.label }}
            </label>
          </div>
        </div>
      </div>

      <!-- Mailing List -->
      <div v-if="recipientType === 'mailing_list'" class="space-y-2">
        <label class="block text-sm font-semibold text-gray-300">Select Mailing List</label>
        <select
          v-model="selectedMailingListId"
          @change="emitUpdate"
          class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none transition">
          <option value="">-- Choose a list --</option>
          <option v-for="list in mailingLists" :key="list._id" :value="list._id">
            {{ list.name }} ({{ list.recipientCount }} recipients)
          </option>
        </select>
        <p v-if="loadingLists" class="text-xs text-gray-400">Loading lists...</p>
      </div>

      <!-- Individual Users -->
      <div v-if="recipientType === 'users'" class="space-y-3">
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Search Users</label>
          <input
            v-model="userSearch"
            @input="searchUsers(userSearch, false)"
            type="text"
            placeholder="Search by name or email..."
            class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">

          <div v-if="searchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto bg-gray-900 border border-gray-600 rounded-lg">
            <div
              v-for="user in searchResults"
              :key="user._id"
              @click="selectUser(user)"
              class="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition">
              <p class="text-sm font-semibold text-white">{{ user.firstName }} {{ user.lastName }}</p>
              <p class="text-xs text-gray-400">{{ user.email }}</p>
            </div>
          </div>
        </div>

        <!-- Selected Users -->
        <div v-if="selectedUsers.length > 0" class="space-y-2">
          <p class="text-sm font-semibold text-gray-300">{{ selectedUsers.length }} user(s) selected</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="user in selectedUsers"
              :key="user._id"
              class="flex items-center gap-2 px-3 py-2 bg-yellow-900/30 border border-yellow-600 rounded-full">
              <span class="text-sm text-yellow-300">{{ user.firstName }} {{ user.lastName }}</span>
              <button
                @click="removeUser(user._id)"
                type="button"
                class="text-yellow-400 hover:text-yellow-300">
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Exclusion List -->
      <div class="border-t border-gray-700 pt-4">
        <label class="block text-sm font-semibold text-gray-300 mb-3">🚫 Exclude Recipients</label>
        <input
          v-model="excludeUserSearch"
          @input="searchUsers(excludeUserSearch, true)"
          type="text"
          placeholder="Search users to exclude..."
          class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">

        <div v-if="excludeSearchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto bg-gray-900 border border-gray-600 rounded-lg">
          <div
            v-for="user in excludeSearchResults"
            :key="user._id"
            @click="selectExcludedUser(user)"
            class="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition">
            <p class="text-sm font-semibold text-white">{{ user.firstName }} {{ user.lastName }}</p>
            <p class="text-xs text-gray-400">{{ user.email }}</p>
          </div>
        </div>

        <!-- Excluded Users -->
        <div v-if="excludedUsers.length > 0" class="mt-3 space-y-2">
          <p class="text-sm font-semibold text-gray-300">{{ excludedUsers.length }} user(s) excluded</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="user in excludedUsers"
              :key="user._id"
              class="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-600 rounded-full">
              <span class="text-sm text-red-300">{{ user.firstName }} {{ user.lastName }}</span>
              <button
                @click="removeExcludedUser(user._id)"
                type="button"
                class="text-red-400 hover:text-red-300">
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
