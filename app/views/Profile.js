import { useAuthStore } from '../stores/auth.js';
import BranchSelector from '../components/BranchSelector.js';

export default {
  name: 'Profile',
  components: {
    BranchSelector
  },
  template: `
    <div class="container mx-auto px-4 py-6 max-w-3xl">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">My Profile</h1>
        <p class="text-gray-400 text-sm">Manage your account settings and personal information</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>

      <!-- Profile Content -->
      <div v-else class="space-y-6">
        <!-- Profile Picture Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Profile Picture</h2>

          <div class="flex items-center gap-6">
            <!-- Avatar Display -->
            <div class="flex-shrink-0">
              <div v-if="user.profile?.avatarUrl" class="w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-600 flex-shrink-0">
                <img :src="getAvatarUrl()" alt="Profile" class="w-full h-full object-cover">
              </div>
              <div v-else class="w-32 h-32 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center text-4xl font-bold text-gray-400">
                {{ userInitials }}
              </div>
            </div>

            <!-- Avatar Controls -->
            <div class="flex flex-col gap-3">
              <label class="cursor-pointer px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-medium rounded transition-colors text-center">
                Upload Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  @change="selectAvatarFile"
                  class="hidden"
                />
              </label>
              <button
                v-if="user.profile?.avatarUrl"
                @click="removeAvatar"
                :disabled="uploadingAvatar"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
              >
                {{ uploadingAvatar ? 'Uploading...' : 'Remove Photo' }}
              </button>
              <p class="text-gray-400 text-xs">JPG, PNG, or GIF (max 5MB)</p>
            </div>
          </div>

          <!-- Avatar Preview -->
          <div v-if="avatarPreview" class="mt-4 p-4 bg-gray-700 rounded">
            <p class="text-gray-300 text-sm mb-2">Preview:</p>
            <img :src="avatarPreview" alt="Preview" class="max-w-xs h-auto rounded">
          </div>
        </div>

        <!-- Personal Information Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Personal Information</h2>

          <form @submit.prevent="updateProfile" class="space-y-4">
            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Email (Read-only) -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                :value="user.email"
                type="email"
                disabled
                class="w-full bg-gray-600 border border-gray-600 text-gray-400 rounded px-3 py-2 cursor-not-allowed"
              />
              <p class="text-gray-500 text-xs mt-1">Email cannot be changed</p>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Phone (Optional)</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="(555) 123-4567"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <!-- Role Badge -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <span :class="getRoleBadgeClass(user.role)" class="inline-block px-3 py-1 rounded text-sm font-medium capitalize">
                {{ user.role }}
              </span>
            </div>

            <!-- Save Button -->
            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="savingBasic"
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium rounded transition-colors"
              >
                {{ savingBasic ? 'Saving...' : 'Save Personal Info' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Bio & Introduction Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Bio & Introduction</h2>

          <form @submit.prevent="updateExtendedProfile" class="space-y-4">
            <!-- Tagline -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-sm font-medium text-gray-300">Tagline (Optional)</label>
                <span class="text-xs" :class="form.tagline.length > 130 ? 'text-red-400' : 'text-gray-400'">
                  {{ form.tagline.length }}/150
                </span>
              </div>
              <input
                v-model="form.tagline"
                type="text"
                maxlength="150"
                placeholder="A brief one-liner about you"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <!-- Bio -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-sm font-medium text-gray-300">Bio (Optional)</label>
                <span class="text-xs" :class="form.bio.length > 1900 ? 'text-red-400' : 'text-gray-400'">
                  {{ form.bio.length }}/2000
                </span>
              </div>
              <textarea
                v-model="form.bio"
                maxlength="2000"
                placeholder="Tell us about yourself, your background, interests, and what you're passionate about..."
                rows="5"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <!-- Save Button -->
            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="savingExtended"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
              >
                {{ savingExtended ? 'Saving...' : 'Save Bio' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Military Service Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Military Service</h2>

          <form @submit.prevent="updateExtendedProfile" class="space-y-4">
            <!-- Branch Multi-Select -->
            <div>
              <BranchSelector
                v-model="form.militaryService.branches"
                label="Branch(es) of Service"
                :required="false"
              />
              <p class="text-sm text-gray-400 mt-2">If you didn't serve in any military branch, you can leave this empty.</p>
            </div>

            <!-- Rank -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Rank (Optional)</label>
              <input
                v-model="form.militaryService.rank"
                type="text"
                placeholder="e.g., Colonel, Petty Officer First Class"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <!-- Years of Service -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Service Start Year (Optional)</label>
                <input
                  v-model.number="form.militaryService.yearsOfService.start"
                  type="number"
                  min="1900"
                  :max="new Date().getFullYear()"
                  placeholder="YYYY"
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Service End Year (Optional)</label>
                <input
                  v-model.number="form.militaryService.yearsOfService.end"
                  type="number"
                  min="1900"
                  :max="new Date().getFullYear()"
                  placeholder="YYYY"
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- MOS -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">MOS/Rating (Military Occupational Specialty)</label>
              <input
                v-model="form.militaryService.mos"
                type="text"
                placeholder="e.g., 11B (Infantry), 68W (Combat Medic)"
                maxlength="100"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <!-- Wars -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Wars / Conflicts (Optional)</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="newWar"
                  type="text"
                  placeholder="Add a war or conflict..."
                  @keyup.enter="addWar"
                  class="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
                <button
                  type="button"
                  @click="addWar"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(war, idx) in form.militaryService.wars"
                  :key="idx"
                  class="inline-flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full"
                >
                  <span class="text-sm text-white">{{ war }}</span>
                  <button
                    type="button"
                    @click="removeWar(idx)"
                    class="text-red-400 hover:text-red-300 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Deployments -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Deployment Locations (Optional)</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="newDeployment"
                  type="text"
                  placeholder="Add a deployment location..."
                  @keyup.enter="addDeployment"
                  class="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
                <button
                  type="button"
                  @click="addDeployment"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(deployment, idx) in form.militaryService.deploymentLocations"
                  :key="idx"
                  class="inline-flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full"
                >
                  <span class="text-sm text-white">{{ deployment }}</span>
                  <button
                    type="button"
                    @click="removeDeployment(idx)"
                    class="text-red-400 hover:text-red-300 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Specializations -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Specializations (Optional)</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="newSpecialization"
                  type="text"
                  placeholder="Add a specialization..."
                  @keyup.enter="addSpecialization"
                  class="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                />
                <button
                  type="button"
                  @click="addSpecialization"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(spec, idx) in form.militaryService.specializations"
                  :key="idx"
                  class="inline-flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full"
                >
                  <span class="text-sm text-white">{{ spec }}</span>
                  <button
                    type="button"
                    @click="removeSpecialization(idx)"
                    class="text-red-400 hover:text-red-300 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="savingExtended"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
              >
                {{ savingExtended ? 'Saving...' : 'Save Military Info' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Change Password</h2>

          <form @submit.prevent="changePassword" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                required
                minlength="8"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
              <p class="text-gray-500 text-xs mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div v-if="passwordError" class="text-red-400 text-sm">
              {{ passwordError }}
            </div>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="changingPassword"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
              >
                {{ changingPassword ? 'Changing...' : 'Change Password' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Account Info Card -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Account Information</h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">Account Status</span>
              <span :class="user.isActive ? 'text-green-400' : 'text-red-400'">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Email Verified</span>
              <span :class="user.isVerified ? 'text-green-400' : 'text-yellow-400'">
                {{ user.isVerified ? 'Verified' : 'Not Verified' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Profile Completeness</span>
              <span class="text-white">{{ user.profileCompleteness || 0 }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Member Since</span>
              <span class="text-white">{{ formatDate(user.createdAt) }}</span>
            </div>
            <div v-if="user.lastLogin" class="flex justify-between">
              <span class="text-gray-400">Last Login</span>
              <span class="text-white">{{ formatDate(user.lastLogin) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Toast -->
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        ]"
      >
        {{ toast.message }}
      </div>
    </div>
  `,

  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },

  data() {
    return {
      loading: true,
      savingBasic: false,
      savingExtended: false,
      changingPassword: false,
      uploadingAvatar: false,
      user: {},
      form: {
        firstName: '',
        lastName: '',
        phone: '',
        displayName: '',
        tagline: '',
        bio: '',
        militaryService: {
          branch: '',
          branches: [],
          rank: '',
          yearsOfService: { start: null, end: null },
          mos: '',
          wars: [],
          deploymentLocations: [],
          specializations: []
        }
      },
      newWar: '',
      newDeployment: '',
      newSpecialization: '',
      avatarUrl: '',
      avatarFile: null,
      avatarPreview: null,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordError: '',
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
    };
  },

  computed: {
    userInitials() {
      if (this.user.firstName && this.user.lastName) {
        return (this.user.firstName[0] + this.user.lastName[0]).toUpperCase();
      }
      return '?';
    }
  },

  async mounted() {
    await this.loadProfile();
  },

  methods: {
    async loadProfile() {
      this.loading = true;
      try {
        const response = await window.api.getProfile();
        if (response.success) {
          this.user = response.data.user;
          this.form.firstName = this.user.firstName || '';
          this.form.lastName = this.user.lastName || '';
          this.form.phone = this.user.phone || '';
          this.form.displayName = this.user.profile?.displayName || '';
          this.form.tagline = this.user.profile?.tagline || '';
          this.form.bio = this.user.profile?.bio || '';

          if (this.user.profile?.militaryService) {
            // Handle backward compatibility: convert single branch to branches array
            const branches = this.user.profile.militaryService.branches ||
              (this.user.profile.militaryService.branch ? [this.user.profile.militaryService.branch] : []);

            this.form.militaryService = {
              branch: this.user.profile.militaryService.branch || '',
              branches: branches,
              rank: this.user.profile.militaryService.rank || '',
              yearsOfService: this.user.profile.militaryService.yearsOfService || { start: null, end: null },
              mos: this.user.profile.militaryService.mos || '',
              wars: this.user.profile.militaryService.wars || [],
              deploymentLocations: this.user.profile.militaryService.deploymentLocations || [],
              specializations: this.user.profile.militaryService.specializations || []
            };
          }
        }
      } catch (err) {
        console.error('Load profile error:', err);
        this.showToast('Failed to load profile', 'error');
      } finally {
        this.loading = false;
      }
    },

    async updateProfile() {
      this.savingBasic = true;
      try {
        const response = await window.api.updateProfile({
          firstName: this.form.firstName,
          lastName: this.form.lastName,
          phone: this.form.phone
        });
        if (response.success) {
          this.user = response.data.user;
          localStorage.setItem('vs_user_data', JSON.stringify(response.data.user));
          this.authStore.fetchProfile();
          this.showToast('Personal information saved successfully', 'success');
        }
      } catch (err) {
        console.error('Update profile error:', err);
        this.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        this.savingBasic = false;
      }
    },

    async updateExtendedProfile() {
      this.savingExtended = true;
      try {
        const response = await window.api.updateExtendedProfile({
          displayName: this.form.displayName,
          tagline: this.form.tagline,
          bio: this.form.bio,
          militaryService: this.form.militaryService
        });
        if (response.success) {
          this.user = response.data.user;
          localStorage.setItem('vs_user_data', JSON.stringify(response.data.user));
          this.authStore.fetchProfile();
          this.showToast('Profile information saved successfully', 'success');
        }
      } catch (err) {
        console.error('Update extended profile error:', err);
        this.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        this.savingExtended = false;
      }
    },

    selectAvatarFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        this.showToast('File size must be less than 5MB', 'error');
        return;
      }

      this.avatarFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      // Upload immediately
      this.uploadAvatar();
    },

    async uploadAvatar() {
      if (!this.avatarFile) return;

      this.uploadingAvatar = true;
      try {
        const response = await window.api.uploadAvatar(this.avatarFile);
        if (response.success) {
          this.user = response.data.user;
          this.avatarFile = null;
          this.avatarPreview = null;
          localStorage.setItem('vs_user_data', JSON.stringify(response.data.user));
          this.authStore.fetchProfile();
          this.showToast('Avatar uploaded successfully', 'success');
        }
      } catch (err) {
        console.error('Upload avatar error:', err);
        this.showToast(err.message || 'Failed to upload avatar', 'error');
      } finally {
        this.uploadingAvatar = false;
      }
    },

    async removeAvatar() {
      if (!confirm('Are you sure you want to remove your profile picture?')) return;

      this.uploadingAvatar = true;
      try {
        const response = await window.api.removeAvatar();
        if (response.success) {
          this.user = response.data.user;
          this.avatarPreview = null;
          localStorage.setItem('vs_user_data', JSON.stringify(response.data.user));
          this.authStore.fetchProfile();
          this.showToast('Profile picture removed', 'success');
        }
      } catch (err) {
        console.error('Remove avatar error:', err);
        this.showToast(err.message || 'Failed to remove avatar', 'error');
      } finally {
        this.uploadingAvatar = false;
      }
    },

    getAvatarUrl() {
      if (!this.user.profile?.avatarUrl) return '';
      // Add cache-busting parameter using filename hash
      const url = window.api.getAvatarUrl(this.user.id);
      return `${url}?v=${encodeURIComponent(this.user.profile.avatarUrl)}`;
    },

    async changePassword() {
      this.passwordError = '';

      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.passwordError = 'New passwords do not match';
        return;
      }

      if (this.passwordForm.newPassword.length < 8) {
        this.passwordError = 'Password must be at least 8 characters';
        return;
      }

      this.changingPassword = true;
      try {
        const response = await window.api.changePassword({
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword
        });
        if (response.success) {
          this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
          this.showToast('Password changed successfully', 'success');
        }
      } catch (err) {
        console.error('Change password error:', err);
        this.passwordError = err.message || 'Failed to change password';
      } finally {
        this.changingPassword = false;
      }
    },

    addWar() {
      if (this.newWar.trim()) {
        this.form.militaryService.wars.push(this.newWar.trim());
        this.newWar = '';
      }
    },

    removeWar(index) {
      this.form.militaryService.wars.splice(index, 1);
    },

    addDeployment() {
      if (this.newDeployment.trim()) {
        this.form.militaryService.deploymentLocations.push(this.newDeployment.trim());
        this.newDeployment = '';
      }
    },

    removeDeployment(index) {
      this.form.militaryService.deploymentLocations.splice(index, 1);
    },

    addSpecialization() {
      if (this.newSpecialization.trim()) {
        this.form.militaryService.specializations.push(this.newSpecialization.trim());
        this.newSpecialization = '';
      }
    },

    removeSpecialization(index) {
      this.form.militaryService.specializations.splice(index, 1);
    },

    getRoleBadgeClass(role) {
      const classes = {
        admin: 'bg-red-900 text-red-300',
        moderator: 'bg-purple-900 text-purple-300',
        producer: 'bg-blue-900 text-blue-300',
        contributor: 'bg-green-900 text-green-300',
        participant: 'bg-blue-900 text-blue-300',
        user: 'bg-gray-600 text-gray-300',
        guest: 'bg-gray-700 text-gray-400'
      };
      return classes[role] || 'bg-gray-600 text-gray-300';
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    }
  }
};
