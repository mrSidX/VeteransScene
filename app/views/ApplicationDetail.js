import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';
import BranchBadges from '../components/BranchBadges.js';

export default {
  name: 'ApplicationDetail',
  components: {
    BranchBadges
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const authStore = useAuthStore();

    const application = ref(null);
    const notes = ref([]);
    const activityLog = ref([]);
    const loading = ref(true);
    const error = ref('');

    // Modal states
    const showNoteModal = ref(false);
    const showScheduleModal = ref(false);
    const showDeleteModal = ref(false);

    // Form states
    const noteForm = ref({ content: '', isInternal: true });
    const scheduleDate = ref('');
    const scheduleTime = ref('');
    const deleteConfirmText = ref('');

    const statuses = [
      { value: 'new', label: 'New', color: 'green' },
      { value: 'reviewing', label: 'Reviewing', color: 'yellow' },
      { value: 'contacted', label: 'Contacted', color: 'blue' },
      { value: 'scheduled', label: 'Scheduled', color: 'indigo' },
      { value: 'completed', label: 'Completed', color: 'purple' },
      { value: 'declined', label: 'Declined', color: 'red' },
      { value: 'archived', label: 'Archived', color: 'gray' }
    ];

    const priorities = [
      { value: 'low', label: 'Low', color: 'gray' },
      { value: 'medium', label: 'Medium', color: 'blue' },
      { value: 'high', label: 'High', color: 'orange' },
      { value: 'urgent', label: 'Urgent', color: 'red' }
    ];

    const categories = [
      { value: 'combat-stories', label: 'Combat Stories', icon: '⚔️' },
      { value: 'transition-journey', label: 'Transition Journey', icon: '🔄' },
      { value: 'military-life', label: 'Military Life', icon: '🎖️' },
      { value: 'family-perspective', label: 'Family Perspective', icon: '👨‍👩‍👧‍👦' },
      { value: 'service-projects', label: 'Service Projects', icon: '🤝' },
      { value: 'mental-health', label: 'Mental Health', icon: '🧠' },
      { value: 'career-success', label: 'Career Success', icon: '💼' },
      { value: 'other', label: 'Other', icon: '📝' }
    ];

    const waiverStatuses = [
      { value: 'not_signed', label: 'Not Signed', color: 'red' },
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'signed', label: 'Signed', color: 'green' },
      { value: 'declined', label: 'Declined', color: 'gray' }
    ];

    const showWaiverLinkCopied = ref(false);

    const getWaiverLink = () => {
      const baseUrl = window.location.origin;
      return `${baseUrl}/app.html#/waiver/${application.value.id}`;
    };

    const copyWaiverLink = () => {
      const link = getWaiverLink();
      navigator.clipboard.writeText(link).then(() => {
        showWaiverLinkCopied.value = true;
        setTimeout(() => {
          showWaiverLinkCopied.value = false;
        }, 2000);
      });
    };

    const updateWaiverStatus = async (status) => {
      try {
        const response = await fetch(`${window.api.baseURL}/waivers/${application.value.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('vs_auth_token')}`
          },
          body: JSON.stringify({ status, method: 'physical' })
        });

        const data = await response.json();
        if (data.success) {
          application.value.waiver.status = status;
          alert('Waiver status updated!');
        } else {
          alert('Failed to update waiver status');
        }
      } catch (err) {
        alert('Error updating waiver status: ' + err.message);
      }
    };

    const fetchApplicationDetail = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.getApplicationById(route.params.id);
        if (response.success) {
          application.value = response.data.application;
          notes.value = response.data.notes || [];
          activityLog.value = response.data.activityLog || [];
        }
      } catch (err) {
        error.value = 'Failed to load application details';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const updateStatus = async (status) => {
      try {
        const response = await api.updateApplicationStatus(application.value.id, status);
        if (response.success) {
          application.value.status = status;
          await fetchApplicationDetail(); // Refresh to get activity log
        }
      } catch (err) {
        alert('Failed to update status: ' + err.message);
      }
    };

    const updatePriority = async (priority) => {
      try {
        const response = await api.updateApplicationPriority(application.value.id, priority);
        if (response.success) {
          application.value.priority = priority;
          await fetchApplicationDetail();
        }
      } catch (err) {
        alert('Failed to update priority: ' + err.message);
      }
    };

    const updateCategory = async (category) => {
      try {
        const response = await api.updateApplicationCategory(application.value.id, category);
        if (response.success) {
          application.value.category = category;
          await fetchApplicationDetail();
        }
      } catch (err) {
        alert('Failed to update category: ' + err.message);
      }
    };

    const openScheduleModal = () => {
      if (application.value.scheduledDate) {
        const date = new Date(application.value.scheduledDate);
        scheduleDate.value = date.toISOString().split('T')[0];
        scheduleTime.value = date.toTimeString().slice(0, 5);
      } else {
        scheduleDate.value = '';
        scheduleTime.value = '';
      }
      showScheduleModal.value = true;
    };

    const saveSchedule = async () => {
      try {
        let scheduledDate = null;
        if (scheduleDate.value && scheduleTime.value) {
          scheduledDate = new Date(`${scheduleDate.value}T${scheduleTime.value}`).toISOString();
        }

        const response = await api.scheduleApplication(application.value.id, scheduledDate);
        if (response.success) {
          showScheduleModal.value = false;
          await fetchApplicationDetail();
          alert('Schedule updated successfully!');
        }
      } catch (err) {
        alert('Failed to update schedule: ' + err.message);
      }
    };

    const openNoteModal = () => {
      noteForm.value = { content: '', isInternal: true };
      showNoteModal.value = true;
    };

    const saveNote = async () => {
      try {
        if (!noteForm.value.content.trim()) {
          alert('Note content is required');
          return;
        }

        const response = await api.addNote(
          application.value.id,
          noteForm.value.content,
          noteForm.value.isInternal
        );

        if (response.success) {
          showNoteModal.value = false;
          await fetchApplicationDetail();
          alert('Note added successfully!');
        }
      } catch (err) {
        alert('Failed to add note: ' + err.message);
      }
    };

    const getStatusColor = (status) => {
      const statusObj = statuses.find(s => s.value === status);
      return statusObj ? statusObj.color : 'gray';
    };

    const getPriorityColor = (priority) => {
      const priorityObj = priorities.find(p => p.value === priority);
      return priorityObj ? priorityObj.color : 'gray';
    };

    const getCategoryIcon = (category) => {
      const categoryObj = categories.find(c => c.value === category);
      return categoryObj ? categoryObj.icon : '📝';
    };

    const getCategoryLabel = (category) => {
      const categoryObj = categories.find(c => c.value === category);
      return categoryObj ? categoryObj.label : category;
    };

    const formatDate = (date) => {
      if (!date) return 'Not set';
      return new Date(date).toLocaleString();
    };

    const formatServiceYears = (yearsOfService) => {
      if (!yearsOfService) return 'N/A';
      const start = yearsOfService.start;
      const end = yearsOfService.end || 'Present';
      return `${start} - ${end}`;
    };

    const openDeleteModal = () => {
      deleteConfirmText.value = '';
      showDeleteModal.value = true;
    };

    const confirmDelete = async () => {
      if (deleteConfirmText.value !== 'DELETE') {
        alert('Please type DELETE to confirm');
        return;
      }

      try {
        const response = await api.deleteApplication(application.value.id);
        if (response.success) {
          alert('Application deleted successfully');
          router.push('/applications');
        }
      } catch (err) {
        alert('Failed to delete application: ' + err.message);
      }
    };

    const raiseFlag = () => {
      // Navigate to flags page with pre-filled resource data
      router.push({
        path: '/flags',
        query: {
          resourceType: 'ParticipantApplication',
          resourceId: application.value.id,
          resourceTitle: application.value.fullName
        }
      });
    };

    const inviteToCreateUser = async () => {
      if (!confirm('Send invitation email with login code to this applicant?')) {
        return;
      }

      try {
        const response = await api.post(`/auth/convert-guest-to-user/${application.value.id}`, {});
        if (response.success) {
          alert('Invitation sent! Login code has been emailed to the applicant.');
          await fetchApplicationDetail();
        }
      } catch (err) {
        alert('Failed to send invitation: ' + err.message);
      }
    };

    onMounted(() => {
      fetchApplicationDetail();
    });

    return {
      application,
      notes,
      activityLog,
      loading,
      error,
      showNoteModal,
      showScheduleModal,
      showDeleteModal,
      noteForm,
      scheduleDate,
      scheduleTime,
      deleteConfirmText,
      statuses,
      priorities,
      categories,
      waiverStatuses,
      showWaiverLinkCopied,
      updateStatus,
      updatePriority,
      updateCategory,
      updateWaiverStatus,
      openScheduleModal,
      saveSchedule,
      openNoteModal,
      saveNote,
      openDeleteModal,
      confirmDelete,
      raiseFlag,
      inviteToCreateUser,
      getWaiverLink,
      copyWaiverLink,
      getStatusColor,
      getPriorityColor,
      getCategoryIcon,
      getCategoryLabel,
      formatDate,
      formatServiceYears,
      authStore
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-7xl mx-auto">

        <!-- Header -->
        <div class="mb-6 flex justify-between items-center">
          <div>
            <router-link to="/applications" class="text-yellow-400 hover:text-yellow-300 mb-2 inline-block">
              ← Back to Applications
            </router-link>
            <h1 class="text-4xl font-bold text-yellow-400">Application Details</h1>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading application...</p>
        </div>

        <!-- Error -->
        <div v-if="error && !loading" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
          {{ error }}
        </div>

        <!-- Content -->
        <div v-if="application && !loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Main Content (Left Column - 2/3) -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Applicant Information Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-4">Applicant Information</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-400">Name</label>
                  <p class="text-lg font-semibold">{{ application.fullName }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Email</label>
                  <p class="text-lg">{{ application.email }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Phone</label>
                  <p class="text-lg">{{ application.phone }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">State</label>
                  <p class="text-lg">{{ application.state }}</p>
                </div>
              </div>
            </div>

            <!-- Military Service Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-4">Military Service</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="text-sm text-gray-400 block mb-2">Military Branch(es)</label>
                  <BranchBadges :branches="application.branches || (application.branch ? [application.branch] : [])" size="md" />
                </div>
                <div>
                  <label class="text-sm text-gray-400">Rank</label>
                  <p class="text-lg">{{ application.rank || 'N/A' }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Years of Service</label>
                  <p class="text-lg">{{ formatServiceYears(application.yearsOfService) }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Tours</label>
                  <p class="text-lg">{{ application.tours || 0 }}</p>
                </div>
                <div v-if="application.wars && application.wars.length" class="md:col-span-2">
                  <label class="text-sm text-gray-400">Wars/Conflicts</label>
                  <div class="flex flex-wrap gap-2 mt-1">
                    <span v-for="war in application.wars" :key="war"
                      class="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                      {{ war }}
                    </span>
                  </div>
                </div>
                <div v-if="application.deploymentLocations && application.deploymentLocations.length" class="md:col-span-2">
                  <label class="text-sm text-gray-400">Deployment Locations</label>
                  <div class="flex flex-wrap gap-2 mt-1">
                    <span v-for="location in application.deploymentLocations" :key="location"
                      class="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                      {{ location }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Story Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-4">Their Story</h2>
              <div class="prose prose-invert max-w-none">
                <p class="text-gray-300 whitespace-pre-wrap">{{ application.story }}</p>
              </div>
              <div v-if="application.additionalInfo" class="mt-4 pt-4 border-t border-gray-700">
                <label class="text-sm text-gray-400 font-semibold">Additional Information</label>
                <p class="text-gray-300 whitespace-pre-wrap mt-2">{{ application.additionalInfo }}</p>
              </div>
            </div>

            <!-- Notes Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-yellow-400">Notes</h2>
                <button @click="openNoteModal"
                  class="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition text-sm">
                  + Add Note
                </button>
              </div>

              <div v-if="notes.length === 0" class="text-center py-8 text-gray-400">
                No notes yet
              </div>

              <div v-else class="space-y-4">
                <div v-for="note in notes" :key="note._id" class="bg-gray-900 border border-gray-700 rounded-lg p-4">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-200">{{ note.createdBy?.fullName || 'Unknown' }}</span>
                      <span v-if="note.isInternal" class="px-2 py-0.5 bg-red-900 text-red-200 rounded text-xs">Internal</span>
                      <span v-else class="px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-xs">Public</span>
                    </div>
                    <span class="text-sm text-gray-400">{{ formatDate(note.createdAt) }}</span>
                  </div>
                  <p class="text-gray-300 whitespace-pre-wrap">{{ note.content }}</p>
                </div>
              </div>
            </div>

            <!-- Activity Log Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-4">Activity Log</h2>

              <div v-if="activityLog.length === 0" class="text-center py-8 text-gray-400">
                No activity yet
              </div>

              <div v-else class="space-y-3">
                <div v-for="activity in activityLog" :key="activity._id"
                  class="flex gap-3 pb-3 border-b border-gray-700 last:border-0">
                  <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-yellow-400"></div>
                  <div class="flex-1">
                    <p class="text-gray-300">
                      <span class="font-semibold">{{ activity.user?.fullName || 'System' }}</span>
                      {{ activity.description }}
                    </p>
                    <p class="text-sm text-gray-400 mt-1">{{ formatDate(activity.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Sidebar (Right Column - 1/3) -->
          <div class="space-y-6">

            <!-- Status Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Status</h3>
              <select v-model="application.status" @change="updateStatus(application.status)"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option v-for="status in statuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>

            <!-- Priority Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Priority</h3>
              <select v-model="application.priority" @change="updatePriority(application.priority)"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option v-for="priority in priorities" :key="priority.value" :value="priority.value">
                  {{ priority.label }}
                </option>
              </select>
            </div>

            <!-- Category Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Category/Segment</h3>
              <select v-model="application.category" @change="updateCategory(application.category)"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.icon }} {{ cat.label }}
                </option>
              </select>
              <p class="text-xs text-gray-400 mt-2">Organize by podcast/show segment type</p>
            </div>

            <!-- Schedule Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Scheduled Date</h3>
              <div class="mb-3">
                <p class="text-gray-300">{{ formatDate(application.scheduledDate) }}</p>
                <p v-if="application.scheduledBy" class="text-sm text-gray-400 mt-1">
                  By: {{ application.scheduledBy.fullName }}
                </p>
              </div>
              <button @click="openScheduleModal"
                class="w-full px-4 py-2 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded-md transition">
                {{ application.scheduledDate ? 'Change Schedule' : 'Set Schedule' }}
              </button>
            </div>

            <!-- Waiver Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Media Waiver</h3>

              <!-- Waiver Status -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Waiver Status</label>
                <select v-model="application.waiver.status" @change="updateWaiverStatus(application.waiver.status)"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option v-for="status in waiverStatuses" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </div>

              <!-- Waiver Link -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Share Waiver Link</label>
                <div class="flex gap-2">
                  <input
                    :value="getWaiverLink()"
                    type="text"
                    readonly
                    class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-sm"
                  />
                  <button
                    @click="copyWaiverLink"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition text-sm font-medium">
                    {{ showWaiverLinkCopied ? '✓ Copied' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- Waiver Info -->
              <div v-if="application.waiver" class="text-sm text-gray-400 space-y-2">
                <div v-if="application.waiver.signedDate">
                  <label>Signed Date:</label>
                  <p class="text-gray-300">{{ formatDate(application.waiver.signedDate) }}</p>
                </div>
                <div v-if="application.waiver.method">
                  <label>Signed Via:</label>
                  <p class="text-gray-300 capitalize">{{ application.waiver.method }}</p>
                </div>
                <div v-if="application.waiver.consentType">
                  <label>Consent Type:</label>
                  <p class="text-gray-300 capitalize">{{ application.waiver.consentType }}</p>
                </div>
              </div>
            </div>

            <!-- Metadata Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Metadata</h3>
              <div class="space-y-3 text-sm">
                <div>
                  <label class="text-gray-400">Application Type</label>
                  <p class="text-gray-200">{{ application.applicationType }}</p>
                </div>
                <div>
                  <label class="text-gray-400">Submitted</label>
                  <p class="text-gray-200">{{ formatDate(application.submittedAt) }}</p>
                </div>
                <div>
                  <label class="text-gray-400">Last Modified</label>
                  <p class="text-gray-200">{{ formatDate(application.updatedAt) }}</p>
                </div>
                <div v-if="application.assignedTo">
                  <label class="text-gray-400">Assigned To</label>
                  <p class="text-gray-200">{{ application.assignedTo.fullName }}</p>
                </div>
              </div>
            </div>

            <!-- Convert to User Card (if not already converted) -->
            <div v-if="!application.user && authStore.hasAnyRole('admin', 'moderator')" class="bg-gray-800 border border-green-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-green-400 mb-4">User Account</h3>
              <p class="text-sm text-gray-400 mb-4">
                Invite this applicant to create a user account so they can track their application and manage their profile.
              </p>
              <button @click="inviteToCreateUser"
                class="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-gray-900 rounded-md transition font-semibold flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
                Invite to Become User
              </button>
            </div>

            <!-- Raise Flag Card -->
            <div class="bg-gray-800 border border-yellow-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-yellow-400 mb-4">Flag Issue</h3>
              <p class="text-sm text-gray-400 mb-4">
                Raise a flag to alert the team about an issue with this application.
              </p>
              <button @click="raiseFlag"
                class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded-md transition font-semibold flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
                </svg>
                Raise Flag
              </button>
            </div>

            <!-- Delete Card (Admin Only) -->
            <div v-if="authStore.isAdmin.value" class="bg-gray-800 border border-red-700 rounded-lg p-6">
              <h3 class="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
              <p class="text-sm text-gray-400 mb-4">
                Permanently delete this application. This action cannot be undone.
              </p>
              <button @click="openDeleteModal"
                class="w-full px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-md transition font-semibold">
                Delete Application
              </button>
            </div>

          </div>
        </div>

        <!-- Add Note Modal -->
        <div v-if="showNoteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-6">Add Note</h2>
              <form @submit.prevent="saveNote" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Note Content *</label>
                  <textarea v-model="noteForm.content" rows="6" required maxlength="2000"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"></textarea>
                  <p class="text-xs text-gray-400 mt-1">{{ noteForm.content.length }}/2000 characters</p>
                </div>

                <div class="flex items-center gap-2">
                  <input v-model="noteForm.isInternal" type="checkbox" id="isInternal"
                    class="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500" />
                  <label for="isInternal" class="text-sm text-gray-300">
                    Internal Note (only visible to staff)
                  </label>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showNoteModal = false"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition">
                    Cancel
                  </button>
                  <button type="submit"
                    class="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Schedule Modal -->
        <div v-if="showScheduleModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-yellow-400 mb-6">Schedule Application</h2>
              <form @submit.prevent="saveSchedule" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Date</label>
                  <input v-model="scheduleDate" type="date"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Time</label>
                  <input v-model="scheduleTime" type="time"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>

                <p class="text-xs text-gray-400">Leave both empty to clear schedule</p>

                <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showScheduleModal = false"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition">
                    Cancel
                  </button>
                  <button type="submit"
                    class="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                    Save Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-red-700 rounded-lg max-w-md w-full">
            <div class="p-6">
              <h2 class="text-2xl font-bold text-red-400 mb-6">Delete Application</h2>

              <div class="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
                <p class="text-red-200 font-semibold mb-2">Warning: This action cannot be undone!</p>
                <p class="text-red-300 text-sm">
                  This will permanently delete the application for {{ application.fullName }},
                  including all notes, activity logs, and associated data.
                </p>
              </div>

              <form @submit.prevent="confirmDelete" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Type <span class="font-bold text-red-400">DELETE</span> to confirm
                  </label>
                  <input v-model="deleteConfirmText" type="text"
                    placeholder="DELETE"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" @click="showDeleteModal = false"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition">
                    Cancel
                  </button>
                  <button type="submit"
                    :disabled="deleteConfirmText !== 'DELETE'"
                    :class="deleteConfirmText === 'DELETE'
                      ? 'bg-red-900 hover:bg-red-800 text-red-100'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'"
                    class="px-6 py-2 rounded-md font-semibold transition">
                    Delete Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
};
