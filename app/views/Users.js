import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'Users',
  setup() {
    const router = useRouter();
    const users = ref([]);
    const loading = ref(true);
    const error = ref('');
    const searchTerm = ref('');
    const roleFilter = ref('');
    const anonymousFilter = ref(''); // '' = hide by default, 'true' = show anonymous, 'false' = show standard

    // Unsaved changes tracking
    const hasChanges = ref(false);
    const originalEditForm = ref(null);
    const navigationBlocked = ref(false);

    // Modal states
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showDeleteConfirm = ref(false);
    const showPasswordModal = ref(false);
    const selectedUser = ref(null);
    const deactivateAction = ref('deactivate');

    // Form data
    const createForm = ref({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roles: ['user'],
      isActive: true
    });

    const editForm = ref({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      roles: ['user'],
      isActive: true
    });

    const passwordForm = ref({
      newPassword: '',
      confirmPassword: ''
    });

    const roles = [
      { value: 'admin', label: 'Admin', color: 'red' },
      { value: 'moderator', label: 'Moderator', color: 'blue' },
      { value: 'user', label: 'User', color: 'green' },
      { value: 'viewer', label: 'Viewer', color: 'purple' },
      { value: 'guest', label: 'Guest', color: 'gray' }
    ];

    // Unsaved changes detection methods
    const handleBeforeUnload = (e) => {
      if ((hasChanges.value || showEditModal.value) && !navigationBlocked.value) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const setupUnsavedChangesDetection = () => {
      window.addEventListener('beforeunload', handleBeforeUnload);
    };

    const setupRouterGuard = () => {
      return router.beforeEach((to, from, next) => {
        if (hasChanges.value && from.path !== to.path) {
          const proceed = confirm('You have unsaved changes. Do you want to leave without saving?\n\nClick OK to discard changes, or Cancel to stay on this page.');
          if (proceed) {
            navigationBlocked.value = true;
            next();
          } else {
            next(false);
          }
        } else {
          next();
        }
      });
    };

    const fetchUsers = async () => {
      loading.value = true;
      error.value = '';
      try {
        console.log('Fetching users...');
        const params = {};
        if (roleFilter.value) params.role = roleFilter.value;
        if (searchTerm.value) params.search = searchTerm.value;
        // Default to hiding anonymous users unless explicitly requested
        params.anonymous = anonymousFilter.value || 'false';

        const response = await api.getUsers(params);
        console.log('Users response:', response);
        if (response.success) {
          users.value = response.data.users || [];
          console.log('Users loaded:', users.value.length);
        }
      } catch (err) {
        error.value = 'Failed to load users: ' + err.message;
        console.error('Error loading users:', err);
      } finally {
        loading.value = false;
      }
    };

    const getRoleColor = (role) => {
      const roleObj = roles.find(r => r.value === role);
      return roleObj ? roleObj.color : 'gray';
    };

    const getRoleBadgeClass = (role) => {
      const color = getRoleColor(role);
      const classes = {
        'red': 'bg-red-900 text-red-200',
        'blue': 'bg-blue-900 text-blue-200',
        'green': 'bg-green-900 text-green-200',
        'purple': 'bg-purple-900 text-purple-200',
        'gray': 'bg-gray-700 text-gray-300'
      };
      return classes[color] || 'bg-gray-700 text-gray-200';
    };

    const toggleRole = (role, rolesArray) => {
      const index = rolesArray.indexOf(role);
      if (index > -1) {
        rolesArray.splice(index, 1);
      } else {
        rolesArray.push(role);
      }
      // Ensure at least one role is selected
      if (rolesArray.length === 0) {
        rolesArray.push('user');
      }
    };

    const isRoleSelected = (role, rolesArray) => {
      return rolesArray && rolesArray.includes(role);
    };

    const openCreateModal = () => {
      createForm.value = {
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roles: ['user'],
        isActive: true
      };
      showCreateModal.value = true;
    };

    const openEditModal = (user) => {
      selectedUser.value = user;
      // Support both old single role and new multi-role format
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'user'];
      editForm.value = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        roles: userRoles,
        isActive: user.isActive
      };
      // Save original form state for change detection
      originalEditForm.value = JSON.parse(JSON.stringify(editForm.value));
      hasChanges.value = false;
      showEditModal.value = true;
    };

    const openPasswordModal = (user) => {
      selectedUser.value = user;
      passwordForm.value = {
        newPassword: '',
        confirmPassword: ''
      };
      showPasswordModal.value = true;
    };

    const openDeleteConfirm = (user) => {
      selectedUser.value = user;
      deactivateAction.value = 'deactivate'; // Default to deactivate
      showDeleteConfirm.value = true;
    };

    const createUser = async () => {
      try {
        if (createForm.value.password.length < 8) {
          alert('Password must be at least 8 characters');
          return;
        }

        const response = await api.createUser(createForm.value);
        if (response.success) {
          showCreateModal.value = false;
          fetchUsers();
          alert('User created successfully!');
        }
      } catch (err) {
        alert(err.message || 'Failed to create user');
      }
    };

    const updateUser = async () => {
      try {
        const response = await api.updateUser(selectedUser.value.id, editForm.value);
        if (response.success) {
          // Reset unsaved changes tracking
          originalEditForm.value = JSON.parse(JSON.stringify(editForm.value));
          hasChanges.value = false;
          navigationBlocked.value = false;
          showEditModal.value = false;
          fetchUsers();
          alert('User updated successfully!');
        }
      } catch (err) {
        alert(err.message || 'Failed to update user');
      }
    };

    const changePassword = async () => {
      try {
        if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
          alert('Passwords do not match');
          return;
        }

        if (passwordForm.value.newPassword.length < 8) {
          alert('Password must be at least 8 characters');
          return;
        }

        const response = await api.updateUser(selectedUser.value.id, {
          password: passwordForm.value.newPassword
        });

        if (response.success) {
          showPasswordModal.value = false;
          alert('Password changed successfully!');
        }
      } catch (err) {
        alert(err.message || 'Failed to change password');
      }
    };

    const deactivateUser = async () => {
      try {
        const response = await api.deleteUser(selectedUser.value.id);
        if (response.success) {
          showDeleteConfirm.value = false;
          fetchUsers();
          alert('User deactivated successfully!');
        }
      } catch (err) {
        alert(err.message || 'Failed to deactivate user');
      }
    };

    const permanentlyDeleteUser = async () => {
      try {
        const response = await api.delete(`/users/${selectedUser.value.id}/permanent`);
        if (response.success) {
          showDeleteConfirm.value = false;
          fetchUsers();
          alert('User permanently deleted from database!');
        }
      } catch (err) {
        alert(err.message || 'Failed to permanently delete user');
      }
    };

    const filteredUsers = computed(() => {
      let filtered = users.value;

      if (searchTerm.value) {
        const search = searchTerm.value.toLowerCase();
        filtered = filtered.filter(user =>
          user.firstName.toLowerCase().includes(search) ||
          user.lastName.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
        );
      }

      if (roleFilter.value) {
        filtered = filtered.filter(user => {
          const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
          return userRoles.includes(roleFilter.value);
        });
      }

      return filtered;
    });

    const getAvatarUrl = (user) => {
      if (!user?.profile?.avatarUrl || !user?.id) return '';
      const url = window.api.getAvatarUrl(user.id);
      return `${url}?v=${encodeURIComponent(user.profile.avatarUrl)}`;
    };

    // Watch for form changes
    watch(() => editForm.value, () => {
      if (originalEditForm.value && showEditModal.value) {
        hasChanges.value = JSON.stringify(editForm.value) !== JSON.stringify(originalEditForm.value);
      }
    }, { deep: true });

    onMounted(() => {
      console.log('Users component mounted');
      fetchUsers();
      setupUnsavedChangesDetection();
      setupRouterGuard();
    });

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    return {
      users,
      loading,
      error,
      searchTerm,
      roleFilter,
      anonymousFilter,
      showCreateModal,
      showEditModal,
      showDeleteConfirm,
      showPasswordModal,
      selectedUser,
      deactivateAction,
      createForm,
      editForm,
      passwordForm,
      roles,
      filteredUsers,
      fetchUsers,
      getRoleBadgeClass,
      toggleRole,
      isRoleSelected,
      openCreateModal,
      openEditModal,
      openPasswordModal,
      openDeleteConfirm,
      createUser,
      updateUser,
      changePassword,
      deactivateUser,
      permanentlyDeleteUser,
      getAvatarUrl,
      // Unsaved changes tracking
      hasChanges,
      originalEditForm,
      navigationBlocked,
      handleBeforeUnload,
      setupUnsavedChangesDetection,
      setupRouterGuard
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <!-- Back to Dashboard Link -->
        <div class="mb-6">
          <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 transition">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </router-link>
        </div>

        <!-- Header -->
        <div class="mb-4 md:mb-6">
          <div class="flex items-center gap-2 md:gap-4 mb-2 flex-wrap">
            <h1 class="text-3xl sm:text-4xl font-bold text-yellow-400">User Management</h1>
            <info-helper topic-slug="user-roles-explained" size="md" />
          </div>
          <p class="text-gray-400 mb-4">Manage system users and permissions</p>
          <button @click="openCreateModal"
            class="w-full sm:w-auto px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition min-h-[44px]">
            + Create User
          </button>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 mb-3 md:mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input v-model="searchTerm" @input="fetchUsers" type="text" placeholder="Name or email..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select v-model="roleFilter" @change="fetchUsers"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All Roles</option>
                <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">User Type</label>
              <select v-model="anonymousFilter" @change="fetchUsers"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">Standard Users (Default)</option>
                <option value="true">From Anonymous Applications</option>
                <option value="">All Users</option>
              </select>
            </div>
            <div class="flex items-end">
              <button @click="fetchUsers"
                class="w-full px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading users...</p>
        </div>

        <!-- Error -->
        <div v-if="error && !loading" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
          {{ error }}
        </div>

        <!-- Users Table (Desktop) -->
        <div v-if="!loading" class="hidden md:block bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Last Login</th>
                  <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-750">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-100 flex items-center gap-2">
                      {{ user.fullName }}
                      <span v-if="user.createdFromAnonymousApplication" class="px-2 py-1 bg-purple-900 text-purple-200 rounded text-xs">🔒 From Anon App</span>
                    </div>
                    <div v-if="user.linkedApplication" class="text-xs text-blue-400 mt-1">
                      <router-link :to="'/applications/' + user.linkedApplication._id" class="hover:underline">
                        View Original Application →
                      </router-link>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-gray-300">{{ user.email }}</td>
                  <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-2">
                      <span v-for="role in (Array.isArray(user.roles) ? user.roles : [user.role])" :key="role"
                        :class="getRoleBadgeClass(role)" class="px-2 py-1 rounded text-xs font-semibold">
                        {{ role }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span v-if="user.isActive" class="text-green-400">Active</span>
                    <span v-else class="text-red-400">Inactive</span>
                  </td>
                  <td class="px-6 py-4 text-gray-400 text-sm">
                    {{ user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never' }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                      <button @click="openEditModal(user)"
                        class="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded text-sm transition">
                        Edit
                      </button>
                      <button @click="openPasswordModal(user)"
                        class="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded text-sm transition">
                        Password
                      </button>
                      <button @click="openDeleteConfirm(user)"
                        class="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-sm transition">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State (Desktop) -->
          <div v-if="filteredUsers.length === 0" class="text-center py-12">
            <p class="text-gray-400">No users found</p>
          </div>
        </div>

        <!-- Users Cards (Mobile) -->
        <div v-if="!loading" class="md:hidden space-y-2 md:space-y-4">
          <!-- Empty State (Mobile) -->
          <div v-if="filteredUsers.length === 0" class="text-center py-12">
            <p class="text-gray-400">No users found</p>
          </div>

          <!-- User Cards -->
          <div v-for="user in filteredUsers" :key="user.id" class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4">
            <!-- User Header: Avatar + Name + Email -->
            <div class="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3">
              <!-- Avatar -->
              <div v-if="user.profile?.avatarUrl" class="w-12 h-12 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                <img :src="getAvatarUrl(user)" :alt="user.fullName" class="w-full h-full object-cover">
              </div>
              <div v-else class="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-sm font-bold flex-shrink-0">
                {{ (user.firstName || 'U')[0] }}{{ (user.lastName || '')[0] }}
              </div>

              <!-- Name and Email -->
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-100 flex items-center gap-2">
                  <span class="truncate">{{ user.fullName }}</span>
                  <span v-if="user.createdFromAnonymousApplication" class="px-1.5 py-0.5 bg-purple-900 text-purple-200 rounded text-xs flex-shrink-0">🔒</span>
                </div>
                <div class="text-sm text-gray-400 truncate">{{ user.email }}</div>
                <router-link v-if="user.linkedApplication" :to="'/applications/' + user.linkedApplication._id" class="text-xs text-blue-400 hover:underline block">
                  View Original Application →
                </router-link>
              </div>
            </div>

            <!-- Roles Badges -->
            <div class="flex flex-wrap gap-1.5 md:gap-2 mb-1.5 md:mb-3">
              <span v-for="role in (Array.isArray(user.roles) ? user.roles : [user.role])" :key="role"
                :class="getRoleBadgeClass(role)" class="px-2 py-1 rounded text-xs font-semibold">
                {{ role }}
              </span>
            </div>

            <!-- Status and Last Login -->
            <div class="flex items-center justify-between mb-2 md:mb-4 text-sm border-t border-gray-700 pt-1.5 md:pt-3">
              <div>
                <span class="text-gray-400">Status: </span>
                <span v-if="user.isActive" class="text-green-400 font-semibold">Active</span>
                <span v-else class="text-red-400 font-semibold">Inactive</span>
              </div>
              <div class="text-gray-400">
                {{ user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never logged in' }}
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-1.5 md:gap-2 flex-wrap">
              <button @click="openEditModal(user)"
                class="flex-1 min-h-[44px] px-3 py-2 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded font-medium transition text-sm">
                Edit
              </button>
              <button @click="openPasswordModal(user)"
                class="flex-1 min-h-[44px] px-3 py-2 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded font-medium transition text-sm">
                Password
              </button>
              <button @click="openDeleteConfirm(user)"
                class="flex-1 min-h-[44px] px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded font-medium transition text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Create User Modal -->
        <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-6">Create New User</h2>
              <form @submit.prevent="createUser" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                    <input v-model="createForm.firstName" type="text" required
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                    <input v-model="createForm.lastName" type="text" required
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input v-model="createForm.email" type="email" required
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Password * (min 8 characters)</label>
                  <input v-model="createForm.password" type="password" required minlength="8"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input v-model="createForm.phone" type="tel"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Roles * (Select at least one)</label>
                  <div class="space-y-2 bg-gray-700 border border-gray-600 rounded-md p-3">
                    <div v-for="role in roles" :key="role.value" class="flex items-center">
                      <input
                        type="checkbox"
                        :id="'create-role-' + role.value"
                        :checked="isRoleSelected(role.value, createForm.roles)"
                        @change="toggleRole(role.value, createForm.roles)"
                        class="w-4 h-4 text-yellow-400 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500"
                      />
                      <label :for="'create-role-' + role.value" class="ml-2 text-sm text-gray-300 cursor-pointer">
                        {{ role.label }}
                      </label>
                    </div>
                  </div>
                </div>

                <div class="flex items-center">
                  <input v-model="createForm.isActive" type="checkbox" id="createActive"
                    class="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500" />
                  <label for="createActive" class="ml-2 text-sm text-gray-300">Active User</label>
                </div>

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showCreateModal = false"
                    class="px-4 py-2 sm:py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition min-h-[44px] flex items-center justify-center">
                    Cancel
                  </button>
                  <button type="submit"
                    class="px-6 py-2 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Edit User Modal -->
        <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-6">Edit User</h2>
              <form @submit.prevent="updateUser" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                    <input v-model="editForm.firstName" type="text" required
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                    <input v-model="editForm.lastName" type="text" required
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input v-model="editForm.email" type="email" required
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input v-model="editForm.phone" type="tel"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Roles * (Select at least one)</label>
                  <div class="space-y-2 bg-gray-700 border border-gray-600 rounded-md p-3 mb-1">
                    <div v-for="role in roles" :key="role.value" class="flex items-center">
                      <input
                        type="checkbox"
                        :id="'edit-role-' + role.value"
                        :checked="isRoleSelected(role.value, editForm.roles)"
                        @change="toggleRole(role.value, editForm.roles)"
                        class="w-4 h-4 text-yellow-400 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500"
                      />
                      <label :for="'edit-role-' + role.value" class="ml-2 text-sm text-gray-300 cursor-pointer">
                        {{ role.label }}
                      </label>
                    </div>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">A user can have multiple roles for combined permissions</p>
                </div>

                <div class="flex items-center">
                  <input v-model="editForm.isActive" type="checkbox" id="editActive"
                    class="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500" />
                  <label for="editActive" class="ml-2 text-sm text-gray-300">Active User</label>
                </div>

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showEditModal = false"
                    class="px-4 py-2 sm:py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition min-h-[44px] flex items-center justify-center">
                    Cancel
                  </button>
                  <button type="submit"
                    class="px-6 py-2 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Change Password Modal -->
        <div v-if="showPasswordModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border-2 border-yellow-600 rounded-lg max-w-md w-full">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-2xl">🔐</span>
                <h2 class="text-2xl font-bold text-yellow-400">Change Password</h2>
              </div>

              <div class="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
                <p class="text-xs font-semibold text-yellow-300 flex items-center gap-2 mb-1">
                  <span>👨‍💼</span> Admin-Only Action
                </p>
                <p class="text-xs text-yellow-200">You are changing the password for another user as an administrator.</p>
              </div>

              <p class="text-gray-300 mb-4">
                Changing password for: <strong class="text-white">{{ selectedUser?.fullName }}</strong> ({{ selectedUser?.email }})
              </p>

              <form @submit.prevent="changePassword" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">New Password * (min 8 characters)</label>
                  <input v-model="passwordForm.newPassword" type="password" required minlength="8"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter new password" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                  <input v-model="passwordForm.confirmPassword" type="password" required minlength="8"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Confirm new password" />
                </div>

                <p class="text-xs text-gray-400 flex items-center gap-1">
                  <span>✓</span> Password will be securely hashed using bcrypt
                </p>

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showPasswordModal = false"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center gap-2">
                    Cancel
                  </button>
                  <button type="submit"
                    class="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center gap-2">
                    <span>✓</span> Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border-2 border-red-700 rounded-lg max-w-2xl w-full">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-red-400 mb-2">⚠️ Delete User - Choose Option</h2>
              <p class="text-gray-300 mb-6">
                What would you like to do with <strong>{{ selectedUser?.fullName }}</strong> ({{ selectedUser?.email }})?
              </p>

              <div class="space-y-4 mb-6">
                <!-- Deactivate Option -->
                <div class="bg-gray-750 border-2 border-yellow-600 rounded-lg p-4 hover:bg-gray-700 transition cursor-pointer" @click="deactivateAction = 'deactivate'" :class="{ 'ring-2 ring-yellow-500': deactivateAction === 'deactivate' }">
                  <div class="flex items-start gap-3">
                    <div class="pt-1">
                      <input type="radio" name="deleteAction" value="deactivate" v-model="deactivateAction" class="w-4 h-4" />
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-yellow-400">🔒 Deactivate User</h3>
                      <p class="text-sm text-gray-300 mt-1">
                        Mark user as inactive. They can no longer log in, but their account and data remain in the database for records.
                      </p>
                      <p class="text-xs text-gray-400 mt-2">✓ Can be reactivated later • ✓ Preserves audit trail</p>
                    </div>
                  </div>
                </div>

                <!-- Permanently Delete Option -->
                <div class="bg-gray-750 border-2 border-red-700 rounded-lg p-4 hover:bg-gray-700 transition cursor-pointer" @click="deactivateAction = 'permanent'" :class="{ 'ring-2 ring-red-500': deactivateAction === 'permanent' }">
                  <div class="flex items-start gap-3">
                    <div class="pt-1">
                      <input type="radio" name="deleteAction" value="permanent" v-model="deactivateAction" class="w-4 h-4" />
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-red-400">🗑️ Permanently Delete</h3>
                      <p class="text-sm text-gray-300 mt-1">
                        Completely remove user from the database. All account data will be permanently deleted and cannot be recovered.
                      </p>
                      <p class="text-xs text-gray-400 mt-2">✗ Cannot be undone • ✗ Removes all user records</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-gray-700 pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button @click="showDeleteConfirm = false"
                  class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
                  Cancel
                </button>
                <button v-if="deactivateAction === 'deactivate'" @click="deactivateUser"
                  class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
                  Deactivate User
                </button>
                <button v-if="deactivateAction === 'permanent'" @click="permanentlyDeleteUser"
                  class="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
};
