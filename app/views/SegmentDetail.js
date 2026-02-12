import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';
import CommentThread from '../components/CommentThread.js';
import ObsSceneManager from '../components/ObsSceneManager.js';
import SegmentFiles from '../components/SegmentFiles.js';

export default {
  name: 'SegmentDetail',
  components: {
    CommentThread,
    ObsSceneManager,
    SegmentFiles
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const segment = ref(null);
    const loading = ref(true);
    const error = ref('');
    const saving = ref(false);
    const editMode = ref(false);

    // User assignment
    const allUsers = ref([]);
    const showUserModal = ref(false);
    const selectedUserId = ref('');
    const selectedUserRole = ref('other');
    const userSearchTerm = ref('');
    const loadingUsers = ref(false);
    const userLoadError = ref('');

    // Technical review info tooltip
    const showTechReviewInfo = ref(false);

    // Collapsible panel states (for cleaner UX)
    const expandedPanels = ref({
      videoChat: false,
      obsScenes: false,
      files: false,
      comments: true
    });

    // VDO.ninja state
    const vdoLoading = ref(false);
    const showVdoParticipantModal = ref(false);
    const vdoParticipantName = ref('');
    const vdoParticipantRole = ref('participant');
    const vdoParticipantUserId = ref(''); // For adding existing users
    const vdoAddMode = ref('manual'); // 'manual' or 'user'
    const revealedUrls = ref({}); // Track which URLs are revealed
    const sendingEmail = ref(null); // participantId being sent to
    const sendingEmailAll = ref(false); // bulk send in progress

    // Export state
    const showExportModal = ref(false);
    const exportEncrypted = ref(false);
    const exportPasskey = ref('');
    const exportLoading = ref(false);

    // Enhanced delete modal state
    const showDeleteModal = ref(false);
    const deleteConfirmText = ref('');
    const deletePreview = ref(null);
    const loadingDeletePreview = ref(false);
    const exportBeforeDelete = ref(false);
    const deletingSegment = ref(false);

    // Toggle panel expansion
    const togglePanel = (panel) => {
      expandedPanels.value[panel] = !expandedPanels.value[panel];
    };

    // Edit form data
    const formData = ref({});

    // Unsaved changes tracking
    const hasChanges = ref(false);
    const originalFormData = ref(null);
    const navigationBlocked = ref(false);

    const isCreator = computed(() => {
      return segment.value?.creator?._id === authStore.user.value?._id;
    });

    const canDelete = computed(() => {
      return authStore.isAdmin.value || isCreator.value;
    });

    const hasUpvoted = computed(() => {
      if (!segment.value || !authStore.user.value) return false;
      const currentUser = authStore.user.value;
      const userId = currentUser._id || currentUser.id;
      if (!userId) return false;

      return segment.value.upvotes?.some(u => {
        const upvoteId = typeof u === 'string' ? u : (u._id || u.id);
        return upvoteId === userId;
      });
    });

    const canDismissTechReview = computed(() => {
      const role = authStore.user.value?.role;
      return role === 'admin' || role === 'tech';
    });

    const fetchSegment = async () => {
      try {
        loading.value = true;
        const response = await api.getSegmentById(route.params.id);
        if (response.success) {
          segment.value = response.data.segment;
          // Ensure upvotes array exists and is reactive
          if (!segment.value.upvotes) {
            segment.value.upvotes = [];
          }
          if (!segment.value.upvoteCount && segment.value.upvoteCount !== 0) {
            segment.value.upvoteCount = segment.value.upvotes?.length || 0;
          }
          // Initialize form data
          formData.value = {
            title: segment.value.title,
            description: segment.value.description,
            productionType: segment.value.productionType,
            location: segment.value.location,
            locationDetails: segment.value.locationDetails || '',
            status: segment.value.status,
            priority: segment.value.priority,
            scheduledDate: segment.value.scheduledDate ? new Date(segment.value.scheduledDate).toISOString().split('T')[0] : '',
            estimatedDuration: segment.value.estimatedDuration || '',
            targetAudience: segment.value.targetAudience || '',
            goals: segment.value.goals || '',
            resources: segment.value.resources || '',
            notes: segment.value.notes || '',
            tags: segment.value.tags?.join(', ') || '',
            technicalReviewRequested: segment.value.technicalReviewRequested || false
          };

          // Save original form state for change detection
          originalFormData.value = JSON.parse(JSON.stringify(formData.value));
          hasChanges.value = false;
        }
      } catch (err) {
        error.value = 'Failed to load segment';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const toggleEdit = () => {
      editMode.value = !editMode.value;
      if (!editMode.value) {
        // Reset form data if canceling
        fetchSegment();
      }
    };

    const saveChanges = async () => {
      try {
        saving.value = true;

        // Parse scheduled date to avoid timezone issues
        let scheduledDateISO = null;
        if (formData.value.scheduledDate) {
          const [year, month, day] = formData.value.scheduledDate.split('-').map(Number);
          // Create date at noon local time to avoid day boundary issues
          const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
          scheduledDateISO = localDate.toISOString();
        }

        const updateData = {
          ...formData.value,
          tags: formData.value.tags.split(',').map(t => t.trim()).filter(t => t),
          scheduledDate: scheduledDateISO,
          estimatedDuration: formData.value.estimatedDuration ? parseInt(formData.value.estimatedDuration) : null
        };

        const response = await api.updateSegment(route.params.id, updateData);
        if (response.success) {
          segment.value = response.data.segment;
          editMode.value = false;
          // Reset unsaved changes tracking
          originalFormData.value = JSON.parse(JSON.stringify(formData.value));
          hasChanges.value = false;
          navigationBlocked.value = false;
          alert('Segment updated successfully!');
        }
      } catch (err) {
        alert('Failed to update segment: ' + err.message);
      } finally {
        saving.value = false;
      }
    };

    const openDeleteModal = async () => {
      try {
        loadingDeletePreview.value = true;
        deleteConfirmText.value = '';
        exportBeforeDelete.value = false;
        const response = await api.getSegmentDeletePreview(route.params.id);
        if (response.success) {
          deletePreview.value = response.data;
          showDeleteModal.value = true;
        }
      } catch (err) {
        alert('Failed to load delete preview: ' + err.message);
      } finally {
        loadingDeletePreview.value = false;
      }
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      deleteConfirmText.value = '';
      deletePreview.value = null;
      exportBeforeDelete.value = false;
    };

    const confirmDeleteSegment = async () => {
      if (deleteConfirmText.value !== 'DELETE') {
        alert('Please type "DELETE" to confirm');
        return;
      }

      try {
        deletingSegment.value = true;

        // Export before delete if checked
        if (exportBeforeDelete.value) {
          await downloadSegmentExport(false);
        }

        await api.deleteSegment(route.params.id);
        alert('Segment deleted successfully');
        closeDeleteModal();
        router.push('/segments');
      } catch (err) {
        alert('Failed to delete segment: ' + err.message);
      } finally {
        deletingSegment.value = false;
      }
    };

    const deleteSegment = async () => {
      openDeleteModal();
    };

    const toggleUpvote = async () => {
      // Check if user is logged in
      const currentUser = authStore.user.value;
      console.log('Toggle upvote - current user:', currentUser);

      if (!currentUser) {
        alert('You must be logged in to vote');
        return;
      }

      // Support both _id and id properties
      const userId = currentUser._id || currentUser.id;

      if (!userId) {
        console.error('User object missing ID:', currentUser);
        alert('User ID not found. Please try logging out and back in.');
        return;
      }

      console.log('User ID for upvote:', userId);

      // Store previous state for rollback
      const previousCount = segment.value.upvoteCount || 0;
      const previousUpvotes = [...(segment.value.upvotes || [])];
      const userHasUpvoted = hasUpvoted.value;

      // Optimistic update - toggle immediately
      if (userHasUpvoted) {
        // Remove upvote
        segment.value.upvoteCount = previousCount - 1;
        segment.value.upvotes = segment.value.upvotes.filter(id => {
          const idString = typeof id === 'string' ? id : (id._id || id.id);
          return idString !== userId;
        });
      } else {
        // Add upvote
        segment.value.upvoteCount = previousCount + 1;
        segment.value.upvotes = [...segment.value.upvotes, userId];
      }

      try {
        const response = await api.toggleSegmentUpvote(route.params.id);
        console.log('Toggle upvote response:', response);

        if (response.success && response.data) {
          // Update with server response to ensure consistency
          segment.value.upvoteCount = response.data.upvoteCount;
          // Update upvotes array from server
          if (response.data.hasUpvoted) {
            if (!segment.value.upvotes.some(id => {
              const idString = typeof id === 'string' ? id : (id._id || id.id);
              return idString === userId;
            })) {
              segment.value.upvotes = [...segment.value.upvotes, userId];
            }
          } else {
            segment.value.upvotes = segment.value.upvotes.filter(id => {
              const idString = typeof id === 'string' ? id : (id._id || id.id);
              return idString !== userId;
            });
          }
        }
      } catch (err) {
        console.error('Toggle upvote error:', err);
        // Revert on error
        segment.value.upvoteCount = previousCount;
        segment.value.upvotes = previousUpvotes;
        alert('Failed to toggle vote: ' + err.message);
      }
    };

    const createVariation = async () => {
      if (!segment.value.isTemplate) {
        alert('Only templates can have variations created');
        return;
      }

      router.push(`/segments/new?template=${route.params.id}`);
    };

    const raiseFlag = () => {
      // Navigate to flags page with pre-filled resource data
      router.push({
        path: '/flags',
        query: {
          resourceType: 'Segment',
          resourceId: segment.value._id,
          resourceTitle: segment.value.title
        }
      });
    };

    const fetchUsers = async () => {
      loadingUsers.value = true;
      userLoadError.value = '';
      try {
        const response = await api.getUsers({ limit: 100 });

        if (response.success && response.data && response.data.users) {
          // Ensure all users have required fields
          allUsers.value = response.data.users.filter(user => user._id).map(user => ({
            ...user,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'
          }));
        } else {
          userLoadError.value = 'No users found';
          allUsers.value = [];
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        userLoadError.value = 'Failed to load users: ' + err.message;
        allUsers.value = [];
      } finally {
        loadingUsers.value = false;
      }
    };

    const openUserModal = () => {
      fetchUsers();
      showUserModal.value = true;
      selectedUserId.value = '';
      selectedUserRole.value = 'other';
      userSearchTerm.value = '';
    };

    const closeUserModal = () => {
      showUserModal.value = false;
      selectedUserId.value = '';
      selectedUserRole.value = 'other';
      userSearchTerm.value = '';
    };

    const filteredUsers = computed(() => {
      const search = userSearchTerm.value.trim().toLowerCase();
      if (!search) {
        return allUsers.value;
      }

      return allUsers.value.filter(user => {
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;

        // Match against first name, last name, full name, or email
        return firstName.includes(search) ||
               lastName.includes(search) ||
               fullName.includes(search) ||
               email.includes(search);
      });
    });

    const assignUser = async () => {
      if (!selectedUserId.value) {
        alert('Please select a user');
        return;
      }

      try {
        const response = await api.assignUserToSegment(
          route.params.id,
          selectedUserId.value,
          selectedUserRole.value
        );
        if (response.success) {
          segment.value = response.data.segment;
          closeUserModal();
          alert('User assigned successfully!');
        }
      } catch (err) {
        alert('Failed to assign user: ' + err.message);
      }
    };

    const removeUser = async (userId) => {
      if (!confirm('Are you sure you want to remove this user from the segment?')) {
        return;
      }

      try {
        const response = await api.removeUserFromSegment(route.params.id, userId);
        if (response.success) {
          segment.value = response.data.segment;
          alert('User removed successfully!');
        }
      } catch (err) {
        alert('Failed to remove user: ' + err.message);
      }
    };

    const formatDate = (date) => {
      if (!date) return 'Not set';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusColor = (status) => {
      const colors = {
        'proposal': 'bg-gray-700 text-gray-300',
        'in-consideration': 'bg-yellow-900 text-yellow-200',
        'in-review': 'bg-blue-900 text-blue-200',
        'approved': 'bg-green-900 text-green-200',
        'planning': 'bg-indigo-900 text-indigo-200',
        'scheduled': 'bg-purple-900 text-purple-200',
        'in-production': 'bg-orange-900 text-orange-200',
        'post-production': 'bg-pink-900 text-pink-200',
        'completed': 'bg-teal-900 text-teal-200',
        'on-hold': 'bg-gray-700 text-gray-400',
        'cancelled': 'bg-red-900 text-red-200'
      };
      return colors[status] || 'bg-gray-700 text-gray-200';
    };

    const dismissTechReview = async () => {
      try {
        const response = await api.updateSegment(route.params.id, {
          technicalReviewRequested: false
        });
        if (response.success) {
          segment.value = response.data.segment;
          alert('Technical review marked as complete!');
        }
      } catch (err) {
        alert('Failed to update: ' + err.message);
      }
    };

    // VDO.ninja methods
    const toggleVdoNinja = async () => {
      try {
        vdoLoading.value = true;
        const response = await api.toggleVdoNinja(route.params.id);
        if (response.success) {
          segment.value = response.data.segment;
        }
      } catch (err) {
        alert('Failed to toggle VDO.ninja: ' + err.message);
      } finally {
        vdoLoading.value = false;
      }
    };

    const createVdoSession = async () => {
      try {
        vdoLoading.value = true;
        const response = await api.createVdoSession(route.params.id);
        if (response.success) {
          segment.value = response.data.segment;
          alert('VDO.ninja session created successfully!');
        }
      } catch (err) {
        alert('Failed to create session: ' + err.message);
      } finally {
        vdoLoading.value = false;
      }
    };

    const deleteVdoSession = async () => {
      if (!confirm('Are you sure you want to delete this VDO.ninja session? All participant URLs will be invalidated.')) {
        return;
      }
      try {
        vdoLoading.value = true;
        const response = await api.deleteVdoSession(route.params.id);
        if (response.success) {
          segment.value = response.data.segment;
          revealedUrls.value = {};
          alert('VDO.ninja session deleted.');
        }
      } catch (err) {
        alert('Failed to delete session: ' + err.message);
      } finally {
        vdoLoading.value = false;
      }
    };

    const openVdoParticipantModal = () => {
      vdoParticipantName.value = '';
      vdoParticipantRole.value = 'participant';
      vdoParticipantUserId.value = '';
      vdoAddMode.value = 'manual';
      fetchUsers(); // Load users for the dropdown
      showVdoParticipantModal.value = true;
    };

    const closeVdoParticipantModal = () => {
      showVdoParticipantModal.value = false;
      vdoParticipantName.value = '';
      vdoParticipantRole.value = 'participant';
      vdoParticipantUserId.value = '';
      vdoAddMode.value = 'manual';
    };

    const addVdoParticipant = async () => {
      // Validate based on mode
      if (vdoAddMode.value === 'manual' && !vdoParticipantName.value.trim()) {
        alert('Please enter a participant name');
        return;
      }
      if (vdoAddMode.value === 'user' && !vdoParticipantUserId.value) {
        alert('Please select a user');
        return;
      }

      try {
        vdoLoading.value = true;
        const payload = {
          role: vdoParticipantRole.value
        };

        if (vdoAddMode.value === 'manual') {
          payload.name = vdoParticipantName.value.trim();
        } else {
          payload.userId = vdoParticipantUserId.value;
        }

        const response = await api.addVdoParticipant(route.params.id, payload);
        if (response.success) {
          segment.value = response.data.segment;
          closeVdoParticipantModal();
        }
      } catch (err) {
        alert('Failed to add participant: ' + err.message);
      } finally {
        vdoLoading.value = false;
      }
    };

    const updateVdoParticipantRole = async (participantId, newRole) => {
      try {
        const response = await api.updateVdoParticipant(route.params.id, participantId, { role: newRole });
        if (response.success) {
          segment.value = response.data.segment;
        }
      } catch (err) {
        alert('Failed to update role: ' + err.message);
      }
    };

    const removeVdoParticipant = async (participantId) => {
      if (!confirm('Remove this participant from the VDO.ninja session?')) {
        return;
      }
      try {
        const response = await api.removeVdoParticipant(route.params.id, participantId);
        if (response.success) {
          segment.value = response.data.segment;
        }
      } catch (err) {
        alert('Failed to remove participant: ' + err.message);
      }
    };

    const toggleUrlReveal = (key) => {
      revealedUrls.value[key] = !revealedUrls.value[key];
    };

    const copyToClipboard = async (text, label) => {
      try {
        await navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert(`${label} copied to clipboard!`);
      }
    };

    const getVdoRoleColor = (role) => {
      const colors = {
        'director': 'bg-purple-900 text-purple-200',
        'participant': 'bg-blue-900 text-blue-200',
        'guest': 'bg-green-900 text-green-200',
        'special-guest': 'bg-yellow-900 text-yellow-200',
        'moderator': 'bg-indigo-900 text-indigo-200',
        'observer': 'bg-gray-700 text-gray-300'
      };
      return colors[role] || 'bg-gray-700 text-gray-300';
    };

    const sendVdoEmail = async (participantId) => {
      if (!confirm('Send video chat invitation email to this participant?')) return;

      sendingEmail.value = participantId;
      try {
        const response = await api.sendVdoEmail(route.params.id, participantId);
        if (response.success) {
          alert(response.message);
          await fetchSegment(); // Reload to show updated status
        }
      } catch (err) {
        alert('Failed to send email: ' + err.message);
      } finally {
        sendingEmail.value = null;
      }
    };

    const sendVdoEmailToAll = async () => {
      const count = segment.value?.vdoNinja?.participants?.length || 0;
      if (!confirm(`Send video chat invitation emails to all ${count} participant(s)?`)) return;

      sendingEmailAll.value = true;
      try {
        const response = await api.sendVdoEmailToAll(route.params.id);
        if (response.success) {
          alert(response.message);
          await fetchSegment(); // Reload to show updated status
        }
      } catch (err) {
        alert('Failed to send emails: ' + err.message);
      } finally {
        sendingEmailAll.value = false;
      }
    };

    // Export functions
    const downloadSegmentExport = async (showModal = true) => {
      if (showModal && !exportPasskey.value && exportEncrypted.value) {
        alert('Please enter a passkey for encryption');
        return;
      }

      try {
        exportLoading.value = true;
        const blob = await api.exportSegment(
          route.params.id,
          exportEncrypted.value,
          exportEncrypted.value ? exportPasskey.value : null
        );

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().getTime();
        link.download = `segment-${segment.value.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        if (showModal) {
          alert('Export downloaded successfully!');
          closeExportModal();
        }
      } catch (err) {
        alert('Failed to export segment: ' + err.message);
      } finally {
        exportLoading.value = false;
      }
    };

    const openExportModal = () => {
      exportEncrypted.value = false;
      exportPasskey.value = '';
      showExportModal.value = true;
    };

    const closeExportModal = () => {
      showExportModal.value = false;
      exportEncrypted.value = false;
      exportPasskey.value = '';
    };

    // Unsaved changes detection methods
    const handleBeforeUnload = (e) => {
      if (hasChanges.value && !navigationBlocked.value) {
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
          const noPromptRoutes = ['/login', '/logout', '/'];
          if (noPromptRoutes.includes(to.path)) {
            navigationBlocked.value = true;
            next();
            return;
          }

          const proceed = confirm(
            'You have unsaved changes on this segment. Do you want to leave without saving?\n\nClick OK to discard changes, or Cancel to stay on this page.'
          );

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

    // Watch for form changes
    watch(() => formData.value, () => {
      if (originalFormData.value) {
        hasChanges.value = JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value);
      }
    }, { deep: true });

    onMounted(() => {
      fetchSegment();
      setupUnsavedChangesDetection();
      setupRouterGuard();
    });

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    return {
      authStore,
      segment,
      loading,
      error,
      saving,
      editMode,
      formData,
      isCreator,
      canDelete,
      hasUpvoted,
      raiseFlag,
      canDismissTechReview,
      showTechReviewInfo,
      toggleEdit,
      saveChanges,
      deleteSegment,
      toggleUpvote,
      createVariation,
      formatDate,
      getStatusColor,
      allUsers,
      showUserModal,
      selectedUserId,
      selectedUserRole,
      userSearchTerm,
      loadingUsers,
      userLoadError,
      filteredUsers,
      openUserModal,
      closeUserModal,
      assignUser,
      removeUser,
      dismissTechReview,
      // VDO.ninja
      vdoLoading,
      showVdoParticipantModal,
      vdoParticipantName,
      vdoParticipantRole,
      vdoParticipantUserId,
      vdoAddMode,
      revealedUrls,
      toggleVdoNinja,
      createVdoSession,
      deleteVdoSession,
      openVdoParticipantModal,
      closeVdoParticipantModal,
      addVdoParticipant,
      updateVdoParticipantRole,
      removeVdoParticipant,
      toggleUrlReveal,
      copyToClipboard,
      getVdoRoleColor,
      sendingEmail,
      sendingEmailAll,
      sendVdoEmail,
      sendVdoEmailToAll,
      // Export & Delete
      showExportModal,
      exportEncrypted,
      exportPasskey,
      exportLoading,
      openExportModal,
      closeExportModal,
      downloadSegmentExport,
      showDeleteModal,
      deleteConfirmText,
      deletePreview,
      loadingDeletePreview,
      exportBeforeDelete,
      deletingSegment,
      openDeleteModal,
      closeDeleteModal,
      confirmDeleteSegment,
      // Collapsible panels
      expandedPanels,
      togglePanel,
      // Unsaved changes tracking
      hasChanges,
      originalFormData,
      navigationBlocked,
      setupUnsavedChangesDetection,
      setupRouterGuard,
      handleBeforeUnload
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-5xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading segment...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg">
          {{ error }}
        </div>

        <!-- Segment Detail -->
        <div v-else-if="segment">
          <!-- Back Button -->
          <router-link to="/segments" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-6">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Segments
          </router-link>

          <!-- Header -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4 mb-3 md:mb-6">
            <!-- Title Row -->
            <div class="mb-2 md:mb-3">
              <h1 v-if="!editMode" class="text-xl md:text-3xl font-bold text-yellow-400 truncate mb-1.5 md:mb-2">{{ segment.title }}</h1>
              <input v-else v-model="formData.title" type="text"
                class="text-xl md:text-3xl font-bold bg-gray-700 border border-gray-600 rounded px-3 py-2 text-yellow-400 w-full mb-2"
                placeholder="Segment Title" />

              <!-- Badges and Quick Info Row -->
              <div class="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <span v-if="segment.isTemplate" class="px-2 md:px-2.5 py-0.5 md:py-1 bg-purple-900 text-purple-200 text-xs md:text-sm rounded font-semibold flex-shrink-0">
                  Template
                </span>
                <span v-if="segment.parentSegment" class="px-2 md:px-2.5 py-0.5 md:py-1 bg-blue-900 text-blue-200 text-xs md:text-sm rounded font-semibold flex-shrink-0">
                  Variation
                </span>
                <span v-if="!editMode" :class="getStatusColor(segment.status)"
                  class="px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs md:text-sm font-semibold uppercase flex-shrink-0">
                  {{ segment.status.replace(/-/g, ' ') }}
                </span>
                <button v-if="!editMode" @click="toggleUpvote"
                  :class="[
                    'flex items-center gap-1 px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs md:text-sm transition-all duration-300 flex-shrink-0',
                    hasUpvoted
                      ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-yellow-400'
                  ]">
                  <svg class="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                  </svg>
                  {{ segment.upvoteCount || 0 }}
                </button>
              </div>
            </div>

            <!-- Meta Info -->
            <div class="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm text-gray-400 mb-2 md:mb-3 hidden sm:flex">
              <span>Created {{ formatDate(segment.createdAt) }}</span>
            </div>

            <!-- Description -->
            <div class="mb-2 md:mb-3">
              <p v-if="!editMode" class="text-gray-300 text-sm md:text-base">{{ segment.description }}</p>
              <textarea v-else v-model="formData.description" rows="3"
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm"
                placeholder="Segment description..."></textarea>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-700">
              <button v-if="!editMode" @click="toggleEdit"
                class="bg-blue-600 hover:bg-blue-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition text-xs md:text-sm">
                Edit
              </button>
              <button v-if="editMode" @click="saveChanges" :disabled="saving"
                class="bg-green-600 hover:bg-green-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition disabled:opacity-50 text-xs md:text-sm">
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button v-if="editMode" @click="toggleEdit"
                class="bg-gray-600 hover:bg-gray-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition text-xs md:text-sm">
                Cancel
              </button>

              <button v-if="segment.isTemplate && !editMode" @click="createVariation"
                class="bg-purple-600 hover:bg-purple-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition text-xs md:text-sm">
                Variation
              </button>

              <button v-if="!editMode" @click="raiseFlag"
                class="bg-yellow-600 hover:bg-yellow-500 text-gray-900 px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition flex items-center gap-0.5 md:gap-1 text-xs md:text-sm">
                <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
                </svg>
                Flag
              </button>

              <button v-if="!editMode" @click="openExportModal"
                class="bg-green-600 hover:bg-green-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition flex items-center gap-0.5 md:gap-1 text-xs md:text-sm">
                <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Export
              </button>

              <button v-if="canDelete && !editMode" @click="deleteSegment"
                class="md:ml-auto bg-red-600 hover:bg-red-500 text-white px-2.5 md:px-3 py-1.5 md:py-2 rounded font-semibold transition text-xs md:text-sm">
                Delete
              </button>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <!-- Left Column - Main Details -->
            <div class="lg:col-span-2 space-y-4 md:space-y-6">
              <!-- Production Details -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h2 class="text-lg md:text-xl font-bold text-yellow-400 mb-3 md:mb-4">Production Details</h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Production Type</label>
                    <select v-if="editMode" v-model="formData.productionType"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300">
                      <option value="in-person-interview">In-Person Interview</option>
                      <option value="remote-interview">Remote Interview</option>
                      <option value="solo-narration">Solo Narration</option>
                      <option value="panel-discussion">Panel Discussion</option>
                      <option value="roundtable">Roundtable</option>
                      <option value="documentary-style">Documentary Style</option>
                      <option value="pre-recorded">Pre-Recorded</option>
                      <option value="live-recording">Live Recording</option>
                      <option value="other">Other</option>
                    </select>
                    <p v-else class="text-gray-300">{{ segment.productionType.replace(/-/g, ' ') }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Location Type</label>
                    <select v-if="editMode" v-model="formData.location"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300">
                      <option value="on-location">On Location</option>
                      <option value="studio">Studio</option>
                      <option value="remote-video">Remote Video</option>
                      <option value="remote-audio">Remote Audio</option>
                      <option value="phone-call">Phone Call</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="tbd">TBD</option>
                    </select>
                    <p v-else class="text-gray-300">{{ segment.location.replace(/-/g, ' ') }}</p>
                  </div>

                  <div class="col-span-2">
                    <label class="block text-sm text-gray-400 mb-1">Location Details</label>
                    <input v-if="editMode" v-model="formData.locationDetails" type="text"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="Specific location details..." />
                    <p v-else class="text-gray-300">{{ segment.locationDetails || 'Not specified' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Estimated Duration</label>
                    <input v-if="editMode" v-model="formData.estimatedDuration" type="number"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="Minutes" />
                    <p v-else class="text-gray-300">{{ segment.estimatedDuration ? segment.estimatedDuration + ' minutes' : 'Not set' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Scheduled Date</label>
                    <input v-if="editMode" v-model="formData.scheduledDate" type="date"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300" />
                    <p v-else class="text-gray-300">{{ formatDate(segment.scheduledDate) }}</p>
                  </div>
                </div>
              </div>

              <!-- Planning Details -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h2 class="text-lg md:text-xl font-bold text-yellow-400 mb-3 md:mb-4">Planning & Goals</h2>

                <div class="space-y-3 md:space-y-4">
                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Target Audience</label>
                    <textarea v-if="editMode" v-model="formData.targetAudience" rows="2"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="Who is this segment for?"></textarea>
                    <p v-else class="text-gray-300">{{ segment.targetAudience || 'Not specified' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Goals & Objectives</label>
                    <textarea v-if="editMode" v-model="formData.goals" rows="3"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="What do you hope to achieve?"></textarea>
                    <p v-else class="text-gray-300 whitespace-pre-wrap">{{ segment.goals || 'Not specified' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Resources Needed</label>
                    <textarea v-if="editMode" v-model="formData.resources" rows="3"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="Equipment, people, budget, etc."></textarea>
                    <p v-else class="text-gray-300 whitespace-pre-wrap">{{ segment.resources || 'Not specified' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-1">Internal Notes</label>
                    <textarea v-if="editMode" v-model="formData.notes" rows="3"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                      placeholder="Internal notes and reminders..."></textarea>
                    <p v-else class="text-gray-300 whitespace-pre-wrap">{{ segment.notes || 'No notes' }}</p>
                  </div>
                </div>
              </div>

              <!-- Guest Speakers -->
              <div v-if="segment.guestSpeakers && segment.guestSpeakers.length"
                class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h2 class="text-lg md:text-xl font-bold text-yellow-400 mb-3 md:mb-4">Guest Speakers</h2>
                <div class="space-y-2 md:space-y-3">
                  <div v-for="guest in segment.guestSpeakers" :key="guest._id"
                    class="flex items-center justify-between p-2 md:p-3 bg-gray-700 rounded">
                    <div>
                      <p class="text-gray-300 font-semibold">
                        {{ guest.user ? \`\${guest.user.firstName} \${guest.user.lastName}\` :
                           guest.applicant ? \`\${guest.applicant.firstName} \${guest.applicant.lastName}\` :
                           guest.name }}
                      </p>
                      <p v-if="guest.applicant" class="text-sm text-gray-400">
                        {{ guest.applicant.branch }} • {{ guest.applicant.email }}
                      </p>
                    </div>
                    <span :class="guest.confirmed ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'"
                      class="px-2 py-1 rounded text-xs font-semibold">
                      {{ guest.confirmed ? 'Confirmed' : 'Pending' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Variations -->
              <div v-if="segment.variations && segment.variations.length"
                class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h2 class="text-lg md:text-xl font-bold text-yellow-400 mb-3 md:mb-4">Variations ({{ segment.variations.length }})</h2>
                <div class="space-y-1 md:space-y-2">
                  <router-link v-for="variation in segment.variations" :key="variation._id"
                    :to="\`/segments/\${variation._id}\`"
                    class="block p-2 md:p-3 bg-gray-700 hover:bg-gray-600 rounded transition">
                    <p class="text-gray-300 font-semibold">{{ variation.title }}</p>
                    <p class="text-sm text-gray-400">{{ variation.status.replace(/-/g, ' ') }}</p>
                  </router-link>
                </div>
              </div>
            </div>

            <!-- Right Column - Sidebar -->
            <div class="space-y-4 md:space-y-6">
              <!-- Status & Priority -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h3 class="text-base md:text-lg font-bold text-yellow-400 mb-3 md:mb-4">Status & Priority</h3>

                <div class="space-y-3 md:space-y-4">
                  <div>
                    <div class="flex items-center gap-1 md:gap-2 mb-2">
                      <label class="block text-sm text-gray-400">Status</label>
                      <info-helper topic-slug="segment-status-workflow" size="sm" />
                    </div>
                    <select v-if="editMode" v-model="formData.status"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300">
                      <option value="proposal">Proposal</option>
                      <option value="in-consideration">In Consideration</option>
                      <option value="in-review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="planning">Planning</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in-production">In Production</option>
                      <option value="post-production">Post Production</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <span v-else :class="getStatusColor(segment.status)"
                      class="block px-3 py-2 rounded text-sm font-semibold uppercase text-center">
                      {{ segment.status.replace(/-/g, ' ') }}
                    </span>
                  </div>

                  <div>
                    <label class="block text-sm text-gray-400 mb-2">Priority</label>
                    <select v-if="editMode" v-model="formData.priority"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <p v-else class="text-gray-300 uppercase font-semibold">{{ segment.priority }}</p>
                  </div>

                  <!-- Technical Review Request -->
                  <div class="pt-2 md:pt-4 border-t border-gray-700">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-sm text-gray-400 flex items-center gap-1 md:gap-2">
                        Request Technical Review
                        <info-helper topic-slug="technical-review-feature" size="sm" />
                      </label>
                    </div>

                    <!-- Info tooltip -->
                    <div v-if="showTechReviewInfo" class="mb-3 p-3 bg-blue-900/30 border border-blue-700 rounded text-xs text-blue-200">
                      Request technical review of this segment's configuration. If you are unsure about production settings, scheduling platforms, or technical requirements, please enable this to have an Admin or Tech team member review and assist.
                    </div>

                    <!-- Toggle in Edit Mode -->
                    <div v-if="editMode" class="flex items-center">
                      <button
                        type="button"
                        @click="formData.technicalReviewRequested = !formData.technicalReviewRequested"
                        :class="[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          formData.technicalReviewRequested ? 'bg-yellow-600' : 'bg-gray-600'
                        ]"
                      >
                        <span
                          :class="[
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            formData.technicalReviewRequested ? 'translate-x-6' : 'translate-x-1'
                          ]"
                        ></span>
                      </button>
                      <span class="ml-2 md:ml-3 text-sm text-gray-300">
                        {{ formData.technicalReviewRequested ? 'Enabled' : 'Disabled' }}
                      </span>
                    </div>

                    <!-- Display Mode Status -->
                    <div v-else>
                      <div v-if="segment.technicalReviewRequested" class="flex items-center gap-1 md:gap-2">
                        <span class="px-1.5 md:px-2 py-1 bg-yellow-900 text-yellow-200 rounded text-xs font-semibold">
                          REVIEW REQUESTED
                        </span>
                        <span v-if="segment.technicalReviewRequestedBy" class="text-xs text-gray-400">
                          by {{ segment.technicalReviewRequestedBy.firstName }}
                        </span>
                      </div>
                      <div v-else-if="segment.technicalReviewCompletedAt" class="flex items-center gap-1 md:gap-2">
                        <span class="px-1.5 md:px-2 py-1 bg-green-900 text-green-200 rounded text-xs font-semibold">
                          REVIEW COMPLETED
                        </span>
                        <span v-if="segment.technicalReviewCompletedBy" class="text-xs text-gray-400">
                          by {{ segment.technicalReviewCompletedBy.firstName }}
                        </span>
                      </div>
                      <p v-else class="text-gray-500 text-sm">Not requested</p>

                      <!-- Admin/Tech can dismiss active review -->
                      <button
                        v-if="segment.technicalReviewRequested && canDismissTechReview"
                        @click="dismissTechReview"
                        class="mt-1 md:mt-2 px-2 md:px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded font-semibold transition"
                      >
                        Mark Review Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h3 class="text-base md:text-lg font-bold text-yellow-400 mb-3 md:mb-4">Tags</h3>
                <input v-if="editMode" v-model="formData.tags" type="text"
                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 mb-2"
                  placeholder="tag1, tag2, tag3" />
                <div v-else-if="segment.tags && segment.tags.length" class="flex flex-wrap gap-1 md:gap-2">
                  <span v-for="tag in segment.tags" :key="tag"
                    class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                    {{ tag }}
                  </span>
                </div>
                <p v-else class="text-gray-400 text-sm">No tags</p>
              </div>

              <!-- Assigned Team -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <div class="flex items-center justify-between mb-3 md:mb-4">
                  <h3 class="text-base md:text-lg font-bold text-yellow-400">Assigned Team</h3>
                  <button @click="openUserModal"
                    class="px-2 md:px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded text-xs md:text-sm font-semibold transition">
                    + Add
                  </button>
                </div>
                <div v-if="segment.assignedUsers && segment.assignedUsers.length" class="space-y-1 md:space-y-2">
                  <div v-for="assigned in segment.assignedUsers" :key="assigned._id"
                    class="flex items-center justify-between p-2 md:p-3 bg-gray-700 rounded">
                    <div>
                      <p class="text-gray-300 font-medium text-sm">{{ assigned.user?.firstName }} {{ assigned.user?.lastName }}</p>
                      <p class="text-xs text-gray-400 uppercase">{{ assigned.role }}</p>
                    </div>
                    <button @click="removeUser(assigned.user?._id)"
                      class="px-1.5 md:px-2 py-1 bg-red-700 hover:bg-red-600 text-red-200 rounded text-xs font-semibold transition">
                      Remove
                    </button>
                  </div>
                </div>
                <p v-else class="text-gray-400 text-sm">No team members assigned yet</p>
              </div>

              <!-- Template Info -->
              <div v-if="segment.parentSegment" class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4">
                <h3 class="text-base md:text-lg font-bold text-yellow-400 mb-3 md:mb-4">Template Source</h3>
                <router-link :to="\`/segments/\${segment.parentSegment._id}\`"
                  class="block p-2 md:p-3 bg-gray-700 hover:bg-gray-600 rounded transition">
                  <p class="text-gray-300 font-semibold">{{ segment.parentSegment.title }}</p>
                  <p class="text-sm text-gray-400">View Template</p>
                </router-link>
              </div>
            </div>
          </div>

          <!-- Tools Navigation Bar -->
          <div class="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3">
            <!-- Video Chat Button -->
            <button
              @click="togglePanel('videoChat')"
              :class="[
                'group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02]',
                expandedPanels.videoChat
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200 border border-gray-700 hover:border-purple-500/50'
              ]"
            >
              <div :class="[
                'p-1.5 md:p-2 rounded-lg transition-colors duration-300',
                expandedPanels.videoChat ? 'bg-purple-500/30' : 'bg-gray-700 group-hover:bg-purple-900/30'
              ]">
                <svg class="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </div>
              <span class="hidden md:inline">Video Chat</span>
              <span class="md:hidden">Chat</span>
              <span v-if="segment.vdoNinja?.sessionCreated" class="ml-1 w-1.5 md:w-2 h-1.5 md:h-2 bg-green-400 rounded-full animate-pulse"></span>
              <svg :class="['w-3 md:w-4 h-3 md:h-4 transition-transform duration-300', expandedPanels.videoChat ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- OBS Scenes Button -->
            <button
              @click="togglePanel('obsScenes')"
              :class="[
                'group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02]',
                expandedPanels.obsScenes
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200 border border-gray-700 hover:border-blue-500/50'
              ]"
            >
              <div :class="[
                'p-1.5 md:p-2 rounded-lg transition-colors duration-300',
                expandedPanels.obsScenes ? 'bg-blue-500/30' : 'bg-gray-700 group-hover:bg-blue-900/30'
              ]">
                <svg class="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <span class="hidden md:inline">OBS Scenes</span>
              <span class="md:hidden">OBS</span>
              <svg :class="['w-3 md:w-4 h-3 md:h-4 transition-transform duration-300', expandedPanels.obsScenes ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Files Button -->
            <button
              @click="togglePanel('files')"
              :class="[
                'group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02]',
                expandedPanels.files
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200 border border-gray-700 hover:border-green-500/50'
              ]"
            >
              <div :class="[
                'p-1.5 md:p-2 rounded-lg transition-colors duration-300',
                expandedPanels.files ? 'bg-green-500/30' : 'bg-gray-700 group-hover:bg-green-900/30'
              ]">
                <svg class="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
              </div>
              <span>Files</span>
              <svg :class="['w-3 md:w-4 h-3 md:h-4 transition-transform duration-300', expandedPanels.files ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Comments Button -->
            <button
              @click="togglePanel('comments')"
              :class="[
                'group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02]',
                expandedPanels.comments
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200 border border-gray-700 hover:border-yellow-500/50'
              ]"
            >
              <div :class="[
                'p-1.5 md:p-2 rounded-lg transition-colors duration-300',
                expandedPanels.comments ? 'bg-yellow-500/30' : 'bg-gray-700 group-hover:bg-yellow-900/30'
              ]">
                <svg class="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <span>Comments</span>
              <svg :class="['w-3 md:w-4 h-3 md:h-4 transition-transform duration-300', expandedPanels.comments ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>

          <!-- VDO.ninja Video Chat Section (Collapsible) -->
          <transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 max-h-0 -translate-y-4"
            enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-to-class="opacity-0 max-h-0 -translate-y-4"
          >
          <div v-show="expandedPanels.videoChat" class="mt-4 overflow-hidden">
            <div class="bg-gray-800 border border-purple-500/30 rounded-xl p-6 shadow-lg">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-purple-600/20 rounded-lg">
                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-white">Video Chat</h2>
                    <p class="text-sm text-gray-400">VDO.ninja integration for remote participants</p>
                  </div>
                  <span v-if="segment.vdoNinja?.enabled" class="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full font-semibold border border-green-500/30">
                    ENABLED
                  </span>
                </div>
                <button
                  @click="toggleVdoNinja"
                  :disabled="vdoLoading"
                  :class="[
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shadow-inner',
                    segment.vdoNinja?.enabled ? 'bg-green-600' : 'bg-gray-600'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md',
                      segment.vdoNinja?.enabled ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  ></span>
                </button>
              </div>

              <!-- VDO.ninja Disabled State -->
              <div v-if="!segment.vdoNinja?.enabled" class="text-center py-10 bg-gray-900/50 rounded-xl border border-gray-700/50">
                <div class="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p class="text-gray-400 text-lg mb-2">Video Chat Disabled</p>
                <p class="text-gray-500 text-sm">Toggle the switch above to enable VDO.ninja for this segment.</p>
              </div>

            <!-- VDO.ninja Enabled State -->
            <div v-else>
              <!-- No Session Created Yet -->
              <div v-if="!segment.vdoNinja.sessionCreated" class="text-center py-6">
                <p class="text-gray-400 mb-4">VDO.ninja is enabled but no session has been created yet.</p>
                <button
                  @click="createVdoSession"
                  :disabled="vdoLoading"
                  class="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  <span v-if="vdoLoading">Creating...</span>
                  <span v-else class="flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    Create VDO.ninja Session
                  </span>
                </button>
                <p class="text-xs text-gray-500 mt-3">This will generate unique URLs for all assigned team members and guests.</p>
              </div>

              <!-- Session Created -->
              <div v-else class="space-y-6">
                <!-- Session Info -->
                <div class="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-300">Session Details</h4>
                    <span class="text-xs text-gray-500">
                      Created {{ formatDate(segment.vdoNinja.sessionCreatedAt) }}
                    </span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="text-gray-500">Room ID:</span>
                      <span class="ml-2 text-gray-300 font-mono">{{ segment.vdoNinja.roomId }}</span>
                    </div>
                    <div v-if="segment.vdoNinja.roomPassword">
                      <span class="text-gray-500">Password:</span>
                      <span class="ml-2 text-gray-300 font-mono">{{ segment.vdoNinja.roomPassword }}</span>
                    </div>
                  </div>
                </div>

                <!-- Director URL -->
                <div class="p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-purple-200 flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                      Director Control Panel
                    </h4>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      @click="toggleUrlReveal('director')"
                      class="flex-1 text-left px-3 py-2 bg-gray-800 rounded text-sm font-mono truncate"
                      :class="revealedUrls['director'] ? 'text-purple-300' : 'text-gray-500'"
                    >
                      {{ revealedUrls['director'] ? segment.vdoNinja.directorUrl : 'Click to reveal Director URL...' }}
                    </button>
                    <button
                      v-if="revealedUrls['director']"
                      @click="copyToClipboard(segment.vdoNinja.directorUrl, 'Director URL')"
                      class="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm font-semibold transition"
                      title="Copy URL"
                    >
                      Copy
                    </button>
                    <a
                      v-if="revealedUrls['director']"
                      :href="segment.vdoNinja.directorUrl"
                      target="_blank"
                      class="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm font-semibold transition"
                      title="Open in new tab"
                    >
                      Open
                    </a>
                  </div>
                </div>

                <!-- OBS Source URL -->
                <div class="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-blue-200 flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      OBS Browser Source URL
                    </h4>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      @click="toggleUrlReveal('obs')"
                      class="flex-1 text-left px-3 py-2 bg-gray-800 rounded text-sm font-mono truncate"
                      :class="revealedUrls['obs'] ? 'text-blue-300' : 'text-gray-500'"
                    >
                      {{ revealedUrls['obs'] ? segment.vdoNinja.obsSourceUrl : 'Click to reveal OBS Source URL...' }}
                    </button>
                    <button
                      v-if="revealedUrls['obs']"
                      @click="copyToClipboard(segment.vdoNinja.obsSourceUrl, 'OBS Source URL')"
                      class="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-semibold transition"
                      title="Copy URL"
                    >
                      Copy
                    </button>
                  </div>
                  <p class="text-xs text-blue-300/70 mt-2">Add this URL as a Browser Source in OBS to display all participants.</p>
                </div>

                <!-- Participants Section -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-300">Participants ({{ segment.vdoNinja.participants?.length || 0 }})</h4>
                    <button
                      @click="openVdoParticipantModal"
                      class="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded text-sm font-semibold transition"
                    >
                      + Add Participant
                    </button>
                  </div>

                  <div v-if="segment.vdoNinja.participants?.length" class="space-y-3">
                    <div
                      v-for="participant in segment.vdoNinja.participants"
                      :key="participant._id"
                      class="p-4 bg-gray-900 rounded-lg border border-gray-700"
                    >
                      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-semibold text-gray-200">
                            {{ participant.user?.firstName ? \`\${participant.user.firstName} \${participant.user.lastName}\` :
                               participant.applicant?.firstName ? \`\${participant.applicant.firstName} \${participant.applicant.lastName}\` :
                               participant.name }}
                          </span>
                          <span :class="getVdoRoleColor(participant.role)" class="px-2 py-0.5 rounded text-xs font-semibold uppercase">
                            {{ participant.role.replace('-', ' ') }}
                          </span>
                          <span v-if="participant.connected" class="flex items-center gap-1 text-green-400 text-xs">
                            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Connected
                          </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <select
                            :value="participant.role"
                            @change="updateVdoParticipantRole(participant._id, $event.target.value)"
                            class="flex-1 sm:flex-none px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300"
                          >
                            <option value="director">Director</option>
                            <option value="participant">Participant</option>
                            <option value="guest">Guest</option>
                            <option value="special-guest">Special Guest</option>
                            <option value="moderator">Moderator</option>
                            <option value="observer">Observer</option>
                          </select>
                          <button
                            @click="removeVdoParticipant(participant._id)"
                            class="flex-1 sm:flex-none px-2 py-1 bg-red-700 hover:bg-red-600 text-red-200 rounded text-xs font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                            title="Remove participant"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <!-- Join URL -->
                      <div class="space-y-2">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span class="text-xs text-gray-500 sm:w-16">Join URL:</span>
                          <button
                            @click="toggleUrlReveal('join-' + participant._id)"
                            class="flex-1 text-left px-2 py-1 bg-gray-800 rounded text-xs font-mono truncate"
                            :class="revealedUrls['join-' + participant._id] ? 'text-green-300' : 'text-gray-500'"
                          >
                            {{ revealedUrls['join-' + participant._id] ? participant.joinUrl : 'Click to reveal...' }}
                          </button>
                          <button
                            v-if="revealedUrls['join-' + participant._id]"
                            @click="copyToClipboard(participant.joinUrl, 'Join URL')"
                            class="px-2 py-1 sm:py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                          >
                            Copy
                          </button>
                        </div>

                        <!-- View URL (for OBS individual sources) -->
                        <div v-if="participant.viewUrl" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span class="text-xs text-gray-500 sm:w-16">View URL:</span>
                          <button
                            @click="toggleUrlReveal('view-' + participant._id)"
                            class="flex-1 text-left px-2 py-1 bg-gray-800 rounded text-xs font-mono truncate"
                            :class="revealedUrls['view-' + participant._id] ? 'text-blue-300' : 'text-gray-500'"
                          >
                            {{ revealedUrls['view-' + participant._id] ? participant.viewUrl : 'Click to reveal...' }}
                          </button>
                          <button
                            v-if="revealedUrls['view-' + participant._id]"
                            @click="copyToClipboard(participant.viewUrl, 'View URL')"
                            class="px-2 py-1 sm:py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                          >
                            Copy
                          </button>
                        </div>

                        <!-- Scene URL (for OBS lower-third overlay) -->
                        <div v-if="participant.sceneUrl" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span class="text-xs text-gray-500 sm:w-16">Scene:</span>
                          <button
                            @click="toggleUrlReveal('scene-' + participant._id)"
                            class="flex-1 text-left px-2 py-1 bg-gray-800 rounded text-xs font-mono truncate"
                            :class="revealedUrls['scene-' + participant._id] ? 'text-yellow-300' : 'text-gray-500'"
                          >
                            {{ revealedUrls['scene-' + participant._id] ? participant.sceneUrl : 'Click to reveal OBS scene...' }}
                          </button>
                          <div class="flex gap-1">
                            <button
                              v-if="revealedUrls['scene-' + participant._id]"
                              @click="copyToClipboard(participant.sceneUrl, 'Scene URL')"
                              class="flex-1 sm:flex-none px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                            >
                              Copy
                            </button>
                            <a
                              v-if="revealedUrls['scene-' + participant._id]"
                              :href="participant.sceneUrl"
                              target="_blank"
                              class="flex-1 sm:flex-none px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                              title="Preview scene"
                            >
                              Preview
                            </a>
                          </div>
                        </div>
                      </div>

                      <!-- Email Status & Send Button -->
                      <div class="pt-3 border-t border-gray-700 mt-3">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div class="flex flex-wrap items-center gap-2">
                            <div v-if="participant.emailSent" class="flex items-center gap-2 text-sm">
                              <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                              <span class="text-gray-300">Email sent</span>
                              <span v-if="participant.lastEmailSentAt" class="text-gray-500 text-xs">
                                {{ formatDate(participant.lastEmailSentAt) }}
                              </span>
                            </div>
                            <div v-else class="flex items-center gap-2 text-sm">
                              <span class="inline-block w-2 h-2 bg-gray-500 rounded-full"></span>
                              <span class="text-gray-400">Not sent</span>
                            </div>
                          </div>
                          <button
                            @click="sendVdoEmail(participant._id)"
                            :disabled="sendingEmail === participant._id"
                            class="w-full sm:w-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded transition-colors min-h-[44px] sm:min-h-auto flex items-center justify-center"
                          >
                            {{ sendingEmail === participant._id ? 'Sending...' : participant.emailSent ? 'Resend Email' : 'Send Email' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="text-center py-6 text-gray-500">
                    <p>No participants added yet.</p>
                    <p class="text-sm mt-1">Add participants manually or they'll be auto-created from assigned team members when the session is created.</p>
                  </div>
                </div>

                <!-- Email All Participants Button -->
                <div v-if="segment.vdoNinja?.sessionCreated && segment.vdoNinja?.participants?.length > 0" class="pt-4 border-t border-gray-700">
                  <button
                    @click="sendVdoEmailToAll"
                    :disabled="sendingEmailAll"
                    class="w-full px-4 py-2 bg-green-900/50 hover:bg-green-800 text-green-200 rounded-lg font-semibold transition disabled:opacity-50 border border-green-700"
                  >
                    {{ sendingEmailAll ? 'Sending Emails...' : '📧 Email All Participants' }}
                  </button>
                </div>

                <!-- Delete Session Button -->
                <div class="pt-4 border-t border-gray-700">
                  <button
                    @click="deleteVdoSession"
                    :disabled="vdoLoading"
                    class="w-full px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg font-semibold transition disabled:opacity-50 border border-red-700"
                  >
                    Delete VDO.ninja Session
                  </button>
                  <p class="text-xs text-gray-500 mt-2 text-center">This will invalidate all participant URLs. A new session can be created later.</p>
                </div>
              </div>
            </div>
          </div>
          </div>
          </transition>

          <!-- OBS Scene Manager (Collapsible) -->
          <transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 max-h-0 -translate-y-4"
            enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-to-class="opacity-0 max-h-0 -translate-y-4"
          >
          <div v-show="expandedPanels.obsScenes" class="mt-4 overflow-hidden">
            <obs-scene-manager
              :segment-id="segment._id"
              :vdo-ninja="segment.vdoNinja"
              @refresh="fetchSegment"
            ></obs-scene-manager>
          </div>
          </transition>

          <!-- Files Section (Collapsible) -->
          <transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 max-h-0 -translate-y-4"
            enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-to-class="opacity-0 max-h-0 -translate-y-4"
          >
          <div v-show="expandedPanels.files" class="mt-4 overflow-hidden">
            <segment-files
              :segment-id="segment._id"
              @refresh="fetchSegment"
            ></segment-files>
          </div>
          </transition>

          <!-- Comments Section (Collapsible) -->
          <transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 max-h-0 -translate-y-4"
            enter-to-class="opacity-100 max-h-[3000px] translate-y-0"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-[3000px] translate-y-0"
            leave-to-class="opacity-0 max-h-0 -translate-y-4"
          >
          <div v-show="expandedPanels.comments" class="mt-4 overflow-hidden">
            <comment-thread :segment-id="segment._id"></comment-thread>
          </div>
          </transition>
        </div>

        <!-- User Assignment Modal -->
        <div v-if="showUserModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-bold text-yellow-400 mb-4">Assign User to Segment</h3>

            <div class="space-y-4">
              <!-- Search Users -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Search Users</label>
                <input v-model="userSearchTerm"
                  type="text"
                  placeholder="Search by name or email..."
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <!-- Select User -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Select User
                  <span v-if="userSearchTerm && filteredUsers.length > 0" class="text-xs text-gray-400 ml-2">
                    ({{ filteredUsers.length }} result{{ filteredUsers.length !== 1 ? 's' : '' }})
                  </span>
                </label>
                <div v-if="loadingUsers" class="flex items-center justify-center py-4">
                  <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400"></div>
                  <span class="ml-2 text-gray-400 text-sm">Loading users...</span>
                </div>
                <div v-else-if="userLoadError" class="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                  {{ userLoadError }}
                </div>
                <div v-else-if="allUsers.length === 0" class="bg-gray-700 border border-gray-600 text-gray-300 px-3 py-2 rounded text-sm">
                  No users available
                </div>
                <select v-else v-model="selectedUserId"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="">-- Select a user --</option>
                  <option v-for="user in filteredUsers" :key="user._id" :value="user._id">
                    {{ user.firstName || '' }} {{ user.lastName || '' }} ({{ user.email || 'no email' }})
                  </option>
                </select>
                <p v-if="filteredUsers.length === 0 && userSearchTerm && !loadingUsers && allUsers.length > 0" class="text-yellow-400 text-xs mt-2">
                  No users match your search "{{ userSearchTerm }}"
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Role on Segment</label>
                <select v-model="selectedUserRole"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="host">Host</option>
                  <option value="producer">Producer</option>
                  <option value="editor">Editor</option>
                  <option value="camera">Camera</option>
                  <option value="audio">Audio</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button @click="assignUser"
                class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold transition">
                Assign User
              </button>
              <button @click="closeUserModal"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- VDO.ninja Participant Modal -->
        <div v-if="showVdoParticipantModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-bold text-yellow-400 mb-4">Add VDO.ninja Participant</h3>

            <div class="space-y-4">
              <!-- Add Mode Toggle -->
              <div class="flex gap-2 p-1 bg-gray-900 rounded-lg">
                <button
                  @click="vdoAddMode = 'manual'"
                  :class="[
                    'flex-1 px-3 py-2 rounded text-sm font-semibold transition',
                    vdoAddMode === 'manual' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'
                  ]"
                >
                  Manual Entry
                </button>
                <button
                  @click="vdoAddMode = 'user'"
                  :class="[
                    'flex-1 px-3 py-2 rounded text-sm font-semibold transition',
                    vdoAddMode === 'user' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'
                  ]"
                >
                  Select User
                </button>
              </div>

              <!-- Manual Entry Mode -->
              <div v-if="vdoAddMode === 'manual'">
                <label class="block text-sm font-medium text-gray-300 mb-2">Participant Name</label>
                <input v-model="vdoParticipantName" type="text"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter participant name..." />
              </div>

              <!-- User Selection Mode -->
              <div v-else>
                <label class="block text-sm font-medium text-gray-300 mb-2">Select User</label>
                <select v-model="vdoParticipantUserId"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="">-- Select a user --</option>
                  <option v-for="user in allUsers" :key="user._id" :value="user._id">
                    {{ user.firstName }} {{ user.lastName }} ({{ user.role }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">VDO.ninja Role</label>
                <select v-model="vdoParticipantRole"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="director">Director</option>
                  <option value="participant">Participant</option>
                  <option value="guest">Guest</option>
                  <option value="special-guest">Special Guest</option>
                  <option value="moderator">Moderator</option>
                  <option value="observer">Observer</option>
                </select>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button @click="addVdoParticipant" :disabled="vdoLoading"
                class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold transition disabled:opacity-50">
                {{ vdoLoading ? 'Adding...' : 'Add Participant' }}
              </button>
              <button @click="closeVdoParticipantModal"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Export Modal -->
        <div v-if="showExportModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-bold text-yellow-400 mb-2">Export Segment</h3>
            <p class="text-gray-400 text-sm mb-6">Download this segment's data as a JSON file</p>

            <div class="space-y-4">
              <!-- Admin-only encryption option -->
              <div v-if="authStore.isAdmin.value" class="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input v-model="exportEncrypted" type="checkbox" class="rounded"/>
                  <span class="text-gray-300 font-semibold">Encrypt with passkey (AES-256-GCM)</span>
                </label>
                <p class="text-gray-500 text-sm mt-2">Requires a passkey to decrypt</p>

                <div v-if="exportEncrypted" class="mt-4">
                  <label class="block text-sm text-gray-400 mb-2">Encryption Passkey (8+ characters)</label>
                  <input v-model="exportPasskey" type="password"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                    placeholder="Enter secure passkey..." />
                  <p class="text-yellow-500 text-xs mt-2">Save your passkey securely - you'll need it to decrypt</p>
                </div>
              </div>

              <!-- Non-admin info -->
              <p v-if="!authStore.isAdmin.value" class="text-gray-400 text-sm">
                Only admin users can encrypt exports.
              </p>
            </div>

            <div class="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button @click="downloadSegmentExport()" :disabled="exportLoading || (exportEncrypted && !exportPasskey)"
                class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 sm:py-2 rounded-md font-semibold transition disabled:opacity-50 min-h-[44px] sm:min-h-auto flex items-center justify-center">
                {{ exportLoading ? 'Exporting...' : 'Export' }}
              </button>
              <button @click="closeExportModal"
                class="flex-1 sm:flex-none px-4 py-2 sm:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition min-h-[44px] sm:min-h-auto flex items-center justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Enhanced Delete Modal -->
        <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div v-if="loadingDeletePreview" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              <p class="mt-2 text-gray-400">Loading preview...</p>
            </div>

            <div v-else-if="deletePreview">
              <h3 class="text-xl font-bold text-red-400 mb-2">Delete "{{ deletePreview.segment.title }}"?</h3>
              <p class="text-gray-400 text-sm mb-4">This action cannot be undone.</p>

              <!-- Warnings -->
              <div v-if="deletePreview.warnings.length > 0" class="space-y-2 mb-4">
                <div v-for="warning in deletePreview.warnings" :key="warning.type"
                  :class="[
                    'p-3 rounded-lg text-sm border',
                    warning.severity === 'critical' ? 'bg-red-950 border-red-700 text-red-200' :
                    warning.severity === 'warning' ? 'bg-yellow-950 border-yellow-700 text-yellow-200' :
                    'bg-blue-950 border-blue-700 text-blue-200'
                  ]">
                  <p class="font-semibold">{{ warning.title }}</p>
                  <p class="text-xs mt-1">{{ warning.message }}</p>
                  <p v-if="warning.type === 'variations'" class="text-xs mt-2">
                    • {{ warning.data.length }} variation(s): {{ warning.data.map(v => v.title).join(', ') }}
                  </p>
                </div>
              </div>

              <!-- Export before delete checkbox -->
              <label class="flex items-center gap-2 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
                <input v-model="exportBeforeDelete" type="checkbox" class="rounded" />
                <span class="text-gray-300 text-sm">Export as backup before deleting</span>
              </label>

              <!-- Type to confirm -->
              <div class="mb-4">
                <label class="block text-sm text-gray-400 mb-2">Type "DELETE" to confirm</label>
                <input v-model="deleteConfirmText" type="text"
                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                  placeholder="Type DELETE..." />
              </div>

              <div class="flex flex-col-reverse sm:flex-row gap-3">
                <button @click="confirmDeleteSegment" :disabled="deletingSegment || deleteConfirmText !== 'DELETE'"
                  class="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 sm:py-2 rounded-md font-semibold transition disabled:opacity-50 min-h-[44px] sm:min-h-auto flex items-center justify-center">
                  {{ deletingSegment ? 'Deleting...' : 'Delete' }}
                </button>
                <button @click="closeDeleteModal" :disabled="deletingSegment"
                  class="flex-1 sm:flex-none px-4 py-2 sm:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition disabled:opacity-50 min-h-[44px] sm:min-h-auto flex items-center justify-center">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
