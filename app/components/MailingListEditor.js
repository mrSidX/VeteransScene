import { ref, watch } from 'vue';
import api from '../services/api.js';

export default {
  name: 'MailingListEditor',
  props: {
    mailingList: {
      type: Object,
      default: null
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const form = ref({
      name: '',
      description: '',
      isDynamic: false,
      criteria: {
        roles: [],
        isActive: true
      },
      recipients: []
    });

    const selectedRoles = ref([]);
    const userSearch = ref('');
    const searchResults = ref([]);
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

    const initializeForm = () => {
      if (props.mailingList) {
        form.value = {
          name: props.mailingList.name,
          description: props.mailingList.description || '',
          isDynamic: props.mailingList.isDynamic || false,
          criteria: props.mailingList.criteria || { roles: [], isActive: true },
          recipients: props.mailingList.recipients?.map(r => ({
            _id: r._id || r,
            firstName: r.firstName || '',
            lastName: r.lastName || '',
            email: r.email || ''
          })) || []
        };
        selectedRoles.value = [...(form.value.criteria?.roles || [])];
      } else {
        form.value = {
          name: '',
          description: '',
          isDynamic: false,
          criteria: { roles: [], isActive: true },
          recipients: []
        };
        selectedRoles.value = [];
      }
    };

    const toggleRole = (role) => {
      const index = selectedRoles.value.indexOf(role);
      if (index > -1) {
        selectedRoles.value.splice(index, 1);
      } else {
        selectedRoles.value.push(role);
      }
      form.value.criteria.roles = [...selectedRoles.value];
    };

    const searchUsers = async (query) => {
      if (!query || query.length < 2) {
        searchResults.value = [];
        return;
      }

      loadingSearch.value = true;
      try {
        const response = await api.get(`/email/users/search?q=${encodeURIComponent(query)}&limit=10`);
        searchResults.value = response.data.filter(
          u => !form.value.recipients.find(r => r._id === u._id)
        );
      } catch (error) {
        console.error('Search users error:', error);
      } finally {
        loadingSearch.value = false;
      }
    };

    const selectUser = (user) => {
      form.value.recipients.push(user);
      userSearch.value = '';
      searchResults.value = [];
    };

    const removeRecipient = (userId) => {
      form.value.recipients = form.value.recipients.filter(r => r._id !== userId);
    };

    const save = () => {
      if (!form.value.name) {
        alert('Please enter a list name');
        return;
      }

      if (form.value.isDynamic && form.value.criteria.roles.length === 0) {
        alert('Please select at least one role for dynamic list');
        return;
      }

      if (!form.value.isDynamic && form.value.recipients.length === 0) {
        alert('Please add at least one recipient for static list');
        return;
      }

      emit('save', form.value);
    };

    const close = () => {
      emit('close');
    };

    // Watch show prop
    watch(() => props.show, (newVal) => {
      if (newVal) {
        initializeForm();
      }
    });

    return {
      form,
      selectedRoles,
      userSearch,
      searchResults,
      loadingSearch,
      roles,
      initializeForm,
      toggleRole,
      searchUsers,
      selectUser,
      removeRecipient,
      save,
      close
    };
  },
  template: `
    <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 border-2 border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 md:p-4 border-b border-gray-700 sticky top-0 bg-gray-900">
          <h2 class="text-lg md:text-2xl font-bold text-white">
            {{ mailingList ? '✏️ Edit Mailing List' : '➕ Create Mailing List' }}
          </h2>
          <button
            @click="close"
            type="button"
            class="text-gray-400 hover:text-gray-300 flex-shrink-0">
            <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="p-3 md:p-4 space-y-4 md:space-y-6">
          <!-- Name -->
          <div>
            <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-2">List Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., All Moderators"
              maxlength="100"
              class="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
            <p class="text-xs text-gray-400 mt-1">{{ form.name.length }}/100</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-2">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Optional description..."
              maxlength="500"
              class="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition resize-none"></textarea>
            <p class="text-xs text-gray-400 mt-1">{{ form.description.length }}/500</p>
          </div>

          <!-- List Type -->
          <div>
            <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-2 md:mb-3">List Type *</label>
            <div class="space-y-2 md:space-y-3">
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="form.isDynamic"
                  type="radio"
                  :value="false"
                  class="w-4 h-4 text-yellow-500 bg-gray-800 border-gray-600">
                <span class="ml-2 md:ml-3 text-xs md:text-sm text-gray-300">
                  Static List (manually select recipients)
                </span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="form.isDynamic"
                  type="radio"
                  :value="true"
                  class="w-4 h-4 text-yellow-500 bg-gray-800 border-gray-600">
                <span class="ml-2 md:ml-3 text-xs md:text-sm text-gray-300">
                  Dynamic List (based on user roles)
                </span>
              </label>
            </div>
          </div>

          <!-- Dynamic List: Roles -->
          <div v-if="form.isDynamic" class="space-y-2 md:space-y-3 p-3 md:p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label class="block text-xs md:text-sm font-semibold text-gray-300">Select Roles *</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              <div v-for="role in roles" :key="role.value" class="flex items-center">
                <input
                  type="checkbox"
                  :id="'role-' + role.value"
                  :checked="selectedRoles.includes(role.value)"
                  @change="toggleRole(role.value)"
                  class="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer">
                <label :for="'role-' + role.value" class="ml-2 text-xs md:text-sm text-gray-300 cursor-pointer">
                  {{ role.label }}
                </label>
              </div>
            </div>
            <label class="flex items-center cursor-pointer">
              <input
                v-model="form.criteria.isActive"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-600 bg-gray-700">
              <span class="ml-2 text-xs md:text-sm text-gray-300">Include only active users</span>
            </label>
          </div>

          <!-- Static List: Recipients -->
          <div v-else class="space-y-2 md:space-y-3 p-3 md:p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-2">Add Recipients *</label>
            <input
              v-model="userSearch"
              @input="searchUsers(userSearch)"
              type="text"
              placeholder="Search by name or email..."
              class="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-xs md:text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">

            <div v-if="searchResults.length > 0" class="max-h-40 overflow-y-auto bg-gray-900 border border-gray-600 rounded-lg">
              <div
                v-for="user in searchResults"
                :key="user._id"
                @click="selectUser(user)"
                class="p-2 md:p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition">
                <p class="text-xs md:text-sm font-semibold text-white">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-xs text-gray-400">{{ user.email }}</p>
              </div>
            </div>

            <!-- Selected Recipients -->
            <div v-if="form.recipients.length > 0" class="space-y-2">
              <p class="text-xs md:text-sm font-semibold text-gray-300">{{ form.recipients.length }} recipient(s)</p>
              <div class="space-y-1.5 md:space-y-2">
                <div
                  v-for="recipient in form.recipients"
                  :key="recipient._id"
                  class="flex items-center justify-between gap-2 md:gap-3 p-2 md:p-3 bg-gray-900 border border-gray-600 rounded-lg">
                  <div class="min-w-0">
                    <p class="text-xs md:text-sm font-semibold text-white">{{ recipient.firstName }} {{ recipient.lastName }}</p>
                    <p class="text-xs text-gray-400">{{ recipient.email }}</p>
                  </div>
                  <button
                    @click="removeRecipient(recipient._id)"
                    type="button"
                    class="text-gray-400 hover:text-red-400 transition flex-shrink-0">
                    <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 p-3 md:p-4 border-t border-gray-700 sticky bottom-0 bg-gray-900">
          <button
            @click="close"
            type="button"
            class="flex-1 px-3 md:px-6 py-2 md:py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 transition text-xs md:text-sm min-h-[44px] flex items-center justify-center">
            Cancel
          </button>
          <button
            @click="save"
            type="button"
            class="flex-1 px-3 md:px-6 py-2 md:py-3 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400 transition text-xs md:text-sm min-h-[44px] flex items-center justify-center">
            Save List
          </button>
        </div>
      </div>
    </div>
  `
};
