import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';
import CommentThread from '../components/CommentThread.js';
import ObsSceneManager from '../components/ObsSceneManager.js';
import SegmentFiles from '../components/SegmentFiles.js';
import FollowButton from '../components/FollowButton.js';

export default {
  name: 'SegmentDetail',
  components: {
    CommentThread,
    ObsSceneManager,
    SegmentFiles,
    FollowButton
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

    // Collapsible panel states — exclusive tabs (only one open at a time)
    const expandedPanels = ref({
      videoChat: false,
      obsScenes: false,
      files: false,
      comments: false,
      storage: false
    });

    // Collapsible sub-sections within Video Chat panel
    const expandedVdoSections = ref({
      sessionDetails: true,
      participants: true,
      preview: false,
      recording: false
    });

    // VDO.ninja state
    const vdoLoading = ref(false);
    const showVdoParticipantModal = ref(false);
    const vdoParticipantName = ref('');
    const vdoParticipantEmail = ref('');
    const vdoParticipantRole = ref('participant');
    const vdoParticipantUserId = ref(''); // For adding existing users
    const vdoAddMode = ref('invite'); // 'invite' or 'user'
    const revealedUrls = ref({}); // Track which URLs are revealed
    const showVdoPreview = ref(false);
    const vdoPreviewMuted = ref(true);
    const sendingEmail = ref(null); // participantId being sent to
    const sendingEmailAll = ref(false); // bulk send in progress

    // Storage status
    const storageStatus = ref(null);

    const loadStorageStatus = async () => {
      try {
        const res = await api.getRecordingDiskStatus();
        if (res.success) {
          storageStatus.value = res.data;
        }
      } catch (err) {
        console.warn('[SegmentDetail] Failed to load storage status:', err.message);
      }
    };

    const formatStorageBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    };

    const storageColor = computed(() => {
      if (!storageStatus.value) return 'gray';
      if (storageStatus.value.status === 'critical') return 'red';
      if (storageStatus.value.status === 'warning') return 'yellow';
      return 'green';
    });

    // Segment storage settings
    const availableDisks = ref([]);
    const loadingDisks = ref(false);
    const storageSettingsForm = ref({
      primaryDiskId: null,
      fallbackDiskIds: [],
      storageBackend: 'auto',
      outputSubfolder: ''
    });
    const savingStorageSettings = ref(false);
    const storageSettingsCustomized = ref(false);

    // Folder browser for agent-path disks
    const showFolderBrowser = ref(false);
    const folderBrowserLoading = ref(false);
    const folderBrowserError = ref(null);
    const folderBrowserEntries = ref([]);
    const folderBrowserPath = ref('/');
    const folderBrowserRoots = ref([]);
    const folderBrowserAgentId = ref(null);

    const loadAvailableDisks = async () => {
      try {
        loadingDisks.value = true;
        const res = await api.getAvailableDisks();
        if (res.success) {
          availableDisks.value = res.data.disks;
        }
      } catch (err) {
        console.warn('[SegmentDetail] Failed to load available disks:', err.message);
      } finally {
        loadingDisks.value = false;
      }
    };

    const initStorageSettingsForm = () => {
      const ss = segment.value?.storageSettings;
      if (ss && (ss.primaryDiskId || (ss.fallbackDiskIds && ss.fallbackDiskIds.length > 0) || (ss.storageBackend && ss.storageBackend !== 'auto'))) {
        storageSettingsCustomized.value = true;
        storageSettingsForm.value = {
          primaryDiskId: ss.primaryDiskId || null,
          fallbackDiskIds: ss.fallbackDiskIds ? [...ss.fallbackDiskIds] : [],
          storageBackend: ss.storageBackend || 'auto',
          outputSubfolder: ss.outputSubfolder || ''
        };
      } else {
        storageSettingsCustomized.value = false;
        storageSettingsForm.value = { primaryDiskId: null, fallbackDiskIds: [], storageBackend: 'auto', outputSubfolder: '' };
      }
    };

    const enableCustomStorage = async () => {
      storageSettingsCustomized.value = true;
      await loadAvailableDisks();
    };

    const disableCustomStorage = async () => {
      storageSettingsCustomized.value = false;
      storageSettingsForm.value = { primaryDiskId: null, fallbackDiskIds: [], storageBackend: 'auto', outputSubfolder: '' };
      await saveStorageSettings();
    };

    // Folder browser helpers
    const selectedPrimaryDisk = computed(() => {
      return availableDisks.value.find(d => d.id === storageSettingsForm.value.primaryDiskId);
    });

    const isAgentPathDisk = computed(() => {
      return selectedPrimaryDisk.value?.type === 'agent-path';
    });

    const getAgentIdForDisk = (disk) => {
      // We need the registered agent ID (hostname) for the disk's agent
      // The disk has host/port — try to match against registered agents or use host directly
      if (!disk || !disk.host) return null;
      return disk.host; // Agent registry uses hostname as _id
    };

    const openFolderBrowser = async () => {
      const disk = selectedPrimaryDisk.value;
      if (!disk) return;

      const agentId = getAgentIdForDisk(disk);
      if (!agentId) {
        folderBrowserError.value = 'Cannot determine agent for this disk';
        return;
      }

      folderBrowserAgentId.value = agentId;
      showFolderBrowser.value = true;
      folderBrowserError.value = null;
      folderBrowserEntries.value = [];
      folderBrowserRoots.value = [];

      // Load browse roots first
      try {
        folderBrowserLoading.value = true;
        const rootsRes = await api.getAgentBrowseRoots(agentId);
        if (rootsRes.success && rootsRes.data?.roots) {
          folderBrowserRoots.value = rootsRes.data.roots;
          // Start browsing from the disk's agentPath or first root
          const startPath = disk.agentPath || rootsRes.data.roots[0] || '/';
          await browseFolderPath(startPath);
        }
      } catch (err) {
        folderBrowserError.value = err.message || 'Failed to load browse roots';
        folderBrowserLoading.value = false;
      }
    };

    const browseFolderPath = async (dirPath) => {
      if (!folderBrowserAgentId.value) return;
      folderBrowserLoading.value = true;
      folderBrowserError.value = null;
      try {
        const res = await api.browseAgentPath(folderBrowserAgentId.value, dirPath);
        if (res.success && res.data) {
          folderBrowserEntries.value = res.data;
          folderBrowserPath.value = dirPath;
        }
      } catch (err) {
        folderBrowserError.value = err.message || 'Failed to browse directory';
      } finally {
        folderBrowserLoading.value = false;
      }
    };

    const folderBreadcrumbs = computed(() => {
      const p = folderBrowserPath.value || '/';
      const parts = p.split('/').filter(Boolean);
      const crumbs = [{ label: '/', path: '/' }];
      let running = '';
      for (const part of parts) {
        running += '/' + part;
        crumbs.push({ label: part, path: running });
      }
      return crumbs;
    });

    const selectBrowsedFolder = () => {
      // Set the subfolder relative to the disk's base agentPath
      const disk = selectedPrimaryDisk.value;
      const basePath = (disk?.agentPath || '').replace(/\/$/, '');
      const currentPath = folderBrowserPath.value.replace(/\/$/, '');

      if (basePath && currentPath.startsWith(basePath)) {
        storageSettingsForm.value.outputSubfolder = currentPath.substring(basePath.length).replace(/^\//, '');
      } else {
        storageSettingsForm.value.outputSubfolder = currentPath;
      }
      showFolderBrowser.value = false;
    };

    const addFallbackDisk = (diskId) => {
      if (!diskId || storageSettingsForm.value.fallbackDiskIds.includes(diskId)) return;
      if (diskId === storageSettingsForm.value.primaryDiskId) return;
      storageSettingsForm.value.fallbackDiskIds.push(diskId);
    };

    const removeFallbackDisk = (index) => {
      storageSettingsForm.value.fallbackDiskIds.splice(index, 1);
    };

    const moveFallbackDisk = (index, direction) => {
      const arr = storageSettingsForm.value.fallbackDiskIds;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    };

    const getDiskLabel = (diskId) => {
      const disk = availableDisks.value.find(d => d.id === diskId);
      return disk ? disk.label : diskId;
    };

    const getDiskInfo = (diskId) => {
      return availableDisks.value.find(d => d.id === diskId);
    };

    const diskTypeBadgeClass = (type) => {
      const classes = {
        'local': 'bg-green-500/20 text-green-400',
        's3': 'bg-blue-500/20 text-blue-400',
        'sftp': 'bg-purple-500/20 text-purple-400',
        'ftp': 'bg-orange-500/20 text-orange-400',
        'recording-agent': 'bg-red-500/20 text-red-400',
        'agent-path': 'bg-orange-500/20 text-orange-300'
      };
      return classes[type] || classes['local'];
    };

    const diskTypeLabel = (type) => {
      const labels = { 'local': 'Local', 's3': 'S3', 'sftp': 'SFTP', 'ftp': 'FTP', 'recording-agent': 'Agent', 'agent-path': 'Drive' };
      return labels[type] || 'Local';
    };

    const diskOptionText = (disk) => {
      const typeTag = '[' + diskTypeLabel(disk.type || 'local') + ']';
      if ((disk.type || 'local') === 'local') {
        return typeTag + ' ' + disk.label + ' \u2014 ' + formatStorageBytes(disk.available) + ' free';
      } else if (disk.type === 's3') {
        return typeTag + ' ' + disk.label + ' \u2014 ' + (disk.region || 'us-east-1');
      } else if (disk.type === 'sftp' || disk.type === 'ftp') {
        return typeTag + ' ' + disk.label + ' \u2014 ' + (disk.host || '') + ':' + (disk.port || 22);
      } else if (disk.type === 'recording-agent') {
        return typeTag + ' ' + disk.label + ' \u2014 ' + (disk.host || '') + ':' + (disk.port || 3100);
      } else if (disk.type === 'agent-path') {
        return typeTag + ' ' + disk.label + ' \u2014 ' + (disk.host || '') + (disk.agentPath || '');
      }
      return typeTag + ' ' + disk.label;
    };

    const saveStorageSettings = async () => {
      try {
        savingStorageSettings.value = true;
        const response = await api.updateSegment(segment.value._id, {
          storageSettings: storageSettingsForm.value
        });
        if (response.success) {
          segment.value.storageSettings = { ...storageSettingsForm.value };
        }
      } catch (err) {
        console.error('Failed to save storage settings:', err);
        error.value = 'Failed to save storage settings';
      } finally {
        savingStorageSettings.value = false;
      }
    };

    // Recording server state
    const recServerOnline = ref(false);
    const recServerChecking = ref(false);
    const activeRecording = ref(null); // { recordingId, status, startedAt }
    const recLoading = ref(false);
    const segmentRecordings = ref([]);
    const recTimerDisplay = ref('00:00:00');
    const recLayout = ref('activespeaker'); // 'grid', 'activespeaker', 'solo'
    const previewUrl = ref(null);
    const previewRecordingId = ref(null);
    const previewLoading = ref(false);
    let recTimerInterval = null;
    let processingPollInterval = null;

    const startProcessingPoll = () => {
      if (processingPollInterval) return;
      processingPollInterval = setInterval(async () => {
        try {
          const segId = route.params.id;
          const response = await api.getServerRecordings({ segmentId: segId });
          segmentRecordings.value = response.data || response || [];
          const stillProcessing = segmentRecordings.value.find(r => r.status === 'processing');
          if (!stillProcessing) {
            clearInterval(processingPollInterval);
            processingPollInterval = null;
          }
        } catch (e) { /* ignore poll errors */ }
      }, 5000); // Poll every 5 seconds
    };

    const recordingsSummary = computed(() => {
      const completed = segmentRecordings.value.filter(r => r.status !== 'recording' && r.status !== 'starting' && r.status !== 'processing');
      if (completed.length === 0) return '';
      const onS3 = completed.filter(r => r.s3Uploaded && r.s3Verified !== false).length;
      const local = completed.filter(r => (!r.s3Uploaded || r.s3Verified === false) && r.status === 'completed').length;
      const parts = [];
      if (onS3 > 0) parts.push(onS3 + ' on S3');
      if (local > 0) parts.push(local + ' local');
      return completed.length + ' recording' + (completed.length !== 1 ? 's' : '') + (parts.length ? ' — ' + parts.join(', ') : '');
    });

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

    // Toggle panel expansion — exclusive (only one open at a time)
    const togglePanel = (panel) => {
      const wasOpen = expandedPanels.value[panel];

      // Close all panels
      for (const key of Object.keys(expandedPanels.value)) {
        expandedPanels.value[key] = false;
      }

      // Toggle the clicked panel
      expandedPanels.value[panel] = !wasOpen;

      if (panel === 'storage' && expandedPanels.value[panel]) {
        initStorageSettingsForm();
        if (storageSettingsCustomized.value || availableDisks.value.length === 0) {
          loadAvailableDisks();
        }
      }
    };

    // Toggle VDO.ninja sub-sections (independent, multiple can be open)
    const toggleVdoSection = (section) => {
      expandedVdoSections.value[section] = !expandedVdoSections.value[section];
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
      vdoParticipantEmail.value = '';
      vdoParticipantRole.value = 'participant';
      vdoParticipantUserId.value = '';
      vdoAddMode.value = 'invite';
      fetchUsers(); // Load users for the dropdown
      showVdoParticipantModal.value = true;
    };

    const closeVdoParticipantModal = () => {
      showVdoParticipantModal.value = false;
      vdoParticipantName.value = '';
      vdoParticipantEmail.value = '';
      vdoParticipantRole.value = 'participant';
      vdoParticipantUserId.value = '';
      vdoAddMode.value = 'invite';
    };

    const addVdoParticipant = async () => {
      // Validate based on mode
      if (vdoAddMode.value === 'invite') {
        if (!vdoParticipantName.value.trim()) {
          alert('Please enter a participant name');
          return;
        }
        if (!vdoParticipantEmail.value.trim()) {
          alert('Please enter an email address to send the invite');
          return;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vdoParticipantEmail.value.trim())) {
          alert('Please enter a valid email address');
          return;
        }
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

        if (vdoAddMode.value === 'invite') {
          payload.name = vdoParticipantName.value.trim();
          payload.email = vdoParticipantEmail.value.trim();
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

    // Recording server functions
    const checkRecordingServer = async () => {
      recServerChecking.value = true;
      try {
        const response = await api.getRecordingServerStatus();
        recServerOnline.value = response.serverOnline || false;
      } catch (e) {
        recServerOnline.value = false;
      }
      recServerChecking.value = false;
    };

    const loadSegmentRecordings = async () => {
      try {
        const segId = route.params.id;
        const response = await api.getServerRecordings({ segmentId: segId });
        segmentRecordings.value = response.data || response || [];

        // Check if there's an active recording for this segment
        const active = segmentRecordings.value.find(r => r.status === 'recording' || r.status === 'starting');
        if (active) {
          activeRecording.value = active;
          startRecTimer(active.startedAt);
        }

        // If any recording is "processing" (muxing), poll until done
        const processing = segmentRecordings.value.find(r => r.status === 'processing');
        if (processing && !processingPollInterval) {
          startProcessingPoll();
        } else if (!processing && processingPollInterval) {
          clearInterval(processingPollInterval);
          processingPollInterval = null;
        }
      } catch (e) {
        // Server might be offline
      }
    };

    const startRecTimer = (startedAt) => {
      if (recTimerInterval) clearInterval(recTimerInterval);
      recTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        recTimerDisplay.value = h + ':' + m + ':' + s;
      }, 1000);
    };

    const stopRecTimer = () => {
      if (recTimerInterval) {
        clearInterval(recTimerInterval);
        recTimerInterval = null;
      }
      recTimerDisplay.value = '00:00:00';
    };

    const startRecording = async () => {
      if (!segment.value?.vdoNinja?.obsSourceUrl) {
        alert('No OBS Source URL available. Create a VDO.ninja session first.');
        return;
      }
      if (!confirm('Start recording the VDO.ninja session?')) {
        return;
      }

      // Build recording URL based on layout selection
      let recordUrl = segment.value.vdoNinja.obsSourceUrl;
      if (recLayout.value === 'activespeaker') {
        recordUrl += '&activespeaker';
      } else if (recLayout.value === 'solo') {
        recordUrl += '&activespeaker&solo';
      }
      // 'grid' = default obsSourceUrl (scene mode, no activespeaker)

      recLoading.value = true;
      try {
        const response = await api.startServerRecording({
          url: recordUrl,
          segmentId: route.params.id,
          segmentTitle: segment.value.title,
          roomId: segment.value.vdoNinja.roomId
        });
        activeRecording.value = response.data || response;
        startRecTimer(new Date().toISOString());
        await loadSegmentRecordings();
      } catch (e) {
        alert('Failed to start recording: ' + (e.response?.data?.message || e.message));
      }
      recLoading.value = false;
    };

    const stopRecording = async () => {
      if (!activeRecording.value) return;
      if (!confirm('Stop the current recording?')) return;

      recLoading.value = true;
      try {
        await api.stopServerRecording(activeRecording.value.recordingId);
        stopRecTimer();
        activeRecording.value = null;
        await loadSegmentRecordings();
        // If the recording is now "processing", the poll will auto-start via loadSegmentRecordings
      } catch (e) {
        alert('Failed to stop recording: ' + (e.response?.data?.message || e.message));
      }
      recLoading.value = false;
    };

    const uploadRecordingToS3 = async (recordingId) => {
      if (!confirm('Upload this recording to S3 cloud storage?')) return;

      recLoading.value = true;
      try {
        await api.uploadServerRecordingToS3(recordingId);
        alert('Recording uploaded to S3 successfully!');
        await loadSegmentRecordings();
      } catch (e) {
        alert('Failed to upload: ' + (e.response?.data?.message || e.message));
      }
      recLoading.value = false;
    };

    // Transfer a VDO.ninja recording to a selected storage destination
    const transferRecordingDiskId = ref(null); // diskId currently being transferred
    const showTransferMenu = ref(null); // recordingId of currently open transfer menu

    const transferRecording = async (recordingId, diskId, diskLabel) => {
      if (!confirm(`Transfer recording to "${diskLabel}"?`)) return;
      showTransferMenu.value = null;
      transferRecordingDiskId.value = recordingId + ':' + diskId;
      try {
        const res = await api.transferServerRecording(recordingId, diskId);
        if (res.success) {
          alert(res.message || 'Transfer complete');
          await loadSegmentRecordings();
        }
      } catch (e) {
        alert('Transfer failed: ' + (e.data?.message || e.message));
      } finally {
        transferRecordingDiskId.value = null;
      }
    };

    const toggleTransferMenu = (recordingId) => {
      showTransferMenu.value = showTransferMenu.value === recordingId ? null : recordingId;
      // Load disks on first open if not already loaded
      if (showTransferMenu.value && availableDisks.value.length === 0) {
        loadAvailableDisks();
      }
    };

    const deleteServerRecording = async (recordingId) => {
      if (!confirm('Delete this recording? This cannot be undone.')) return;

      try {
        await api.deleteServerRecording(recordingId);
        await loadSegmentRecordings();
      } catch (e) {
        alert('Failed to delete: ' + (e.response?.data?.message || e.message));
      }
    };

    const previewRecording = async (recordingId) => {
      if (previewRecordingId.value === recordingId) {
        // Toggle off
        previewUrl.value = null;
        previewRecordingId.value = null;
        return;
      }
      previewLoading.value = true;
      try {
        const response = await api.getServerRecordingPreview(recordingId);
        previewUrl.value = response.url;
        previewRecordingId.value = recordingId;
      } catch (e) {
        alert('Failed to load preview: ' + (e.message || 'Unknown error'));
      }
      previewLoading.value = false;
    };

    const closePreview = () => {
      previewUrl.value = null;
      previewRecordingId.value = null;
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0;
      let size = bytes;
      while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
      return size.toFixed(1) + ' ' + units[i];
    };

    const formatDuration = (seconds) => {
      if (!seconds) return '0s';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
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
      // Check recording server, storage, and load recordings
      checkRecordingServer();
      loadSegmentRecordings();
      loadStorageStatus();
      document.addEventListener('click', handleDocClick);
    });

    // Close transfer dropdown when clicking outside
    const handleDocClick = (e) => {
      if (showTransferMenu.value && !e.target.closest('.transfer-menu-wrap')) {
        showTransferMenu.value = null;
      }
    };

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocClick);
      stopRecTimer();
      if (processingPollInterval) { clearInterval(processingPollInterval); processingPollInterval = null; }
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
      vdoParticipantEmail,
      vdoParticipantRole,
      vdoParticipantUserId,
      vdoAddMode,
      revealedUrls,
      showVdoPreview,
      vdoPreviewMuted,
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
      // Storage status
      storageStatus,
      storageColor,
      formatStorageBytes,
      // Recording server
      recServerOnline,
      recServerChecking,
      activeRecording,
      recLoading,
      segmentRecordings,
      recTimerDisplay,
      recLayout,
      checkRecordingServer,
      startRecording,
      stopRecording,
      uploadRecordingToS3,
      transferRecording,
      transferRecordingDiskId,
      showTransferMenu,
      toggleTransferMenu,
      deleteServerRecording,
      loadSegmentRecordings,
      formatFileSize,
      formatDuration,
      previewUrl,
      previewRecordingId,
      previewLoading,
      previewRecording,
      closePreview,
      recordingsSummary,
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
      expandedVdoSections,
      toggleVdoSection,
      // Storage settings
      availableDisks,
      loadingDisks,
      storageSettingsForm,
      savingStorageSettings,
      storageSettingsCustomized,
      enableCustomStorage,
      disableCustomStorage,
      addFallbackDisk,
      removeFallbackDisk,
      moveFallbackDisk,
      diskTypeBadgeClass,
      diskTypeLabel,
      diskOptionText,
      getDiskLabel,
      getDiskInfo,
      saveStorageSettings,
      selectedPrimaryDisk,
      isAgentPathDisk,
      showFolderBrowser,
      folderBrowserLoading,
      folderBrowserError,
      folderBrowserEntries,
      folderBrowserPath,
      folderBrowserRoots,
      folderBreadcrumbs,
      openFolderBrowser,
      browseFolderPath,
      selectBrowsedFolder,
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
                <follow-button v-if="!editMode && segment._id" resource-type="segment" :resource-id="segment._id" />
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
            </button>

            <!-- Storage Button (admin/moderator only) -->
            <button
              v-if="authStore.isAdmin.value || authStore.user.value?.role === 'moderator'"
              @click="togglePanel('storage')"
              :class="[
                'group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02]',
                expandedPanels.storage
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200 border border-gray-700 hover:border-orange-500/50'
              ]"
            >
              <div :class="[
                'p-1.5 md:p-2 rounded-lg transition-colors duration-300',
                expandedPanels.storage ? 'bg-orange-500/30' : 'bg-gray-700 group-hover:bg-orange-900/30'
              ]">
                <svg class="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <span class="hidden md:inline">Storage</span>
              <span class="md:hidden">Disk</span>
              <span v-if="storageSettingsCustomized" class="ml-1 w-1.5 md:w-2 h-1.5 md:h-2 bg-orange-400 rounded-full"></span>
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
              <div v-else class="space-y-2">

                <!-- Session Details (Collapsible) -->
                <div class="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    @click="toggleVdoSection('sessionDetails')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800/80 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span class="font-semibold text-gray-300 text-sm">Session Details & OBS URLs</span>
                      <span class="text-xs text-gray-500 hidden sm:inline">Room: {{ segment.vdoNinja.roomId }}</span>
                    </div>
                    <svg :class="['w-4 h-4 text-gray-400 transition-transform duration-300', expandedVdoSections.sessionDetails ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-show="expandedVdoSections.sessionDetails" class="p-4 space-y-4 border-t border-gray-700">
                    <!-- Session Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span class="text-gray-500">Room ID:</span>
                        <span class="ml-2 text-gray-300 font-mono">{{ segment.vdoNinja.roomId }}</span>
                      </div>
                      <div v-if="segment.vdoNinja.roomPassword">
                        <span class="text-gray-500">Password:</span>
                        <span class="ml-2 text-gray-300 font-mono">{{ segment.vdoNinja.roomPassword }}</span>
                      </div>
                      <div class="md:col-span-2">
                        <span class="text-gray-500 text-xs">Created {{ formatDate(segment.vdoNinja.sessionCreatedAt) }}</span>
                      </div>
                    </div>

                    <!-- Director URL -->
                    <div class="p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg">
                      <h5 class="font-semibold text-purple-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                        Director Control Panel
                      </h5>
                      <div class="flex items-center gap-2">
                        <button
                          @click="toggleUrlReveal('director')"
                          class="flex-1 text-left px-3 py-1.5 bg-gray-800 rounded text-xs font-mono truncate"
                          :class="revealedUrls['director'] ? 'text-purple-300' : 'text-gray-500'"
                        >
                          {{ revealedUrls['director'] ? segment.vdoNinja.directorUrl : 'Click to reveal...' }}
                        </button>
                        <button
                          v-if="revealedUrls['director']"
                          @click="copyToClipboard(segment.vdoNinja.directorUrl, 'Director URL')"
                          class="px-2 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-semibold transition"
                        >Copy</button>
                        <a
                          v-if="revealedUrls['director']"
                          :href="segment.vdoNinja.directorUrl"
                          target="_blank"
                          class="px-2 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-semibold transition"
                        >Open</a>
                      </div>
                    </div>

                    <!-- OBS Source URL (Grid) -->
                    <div class="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                      <h5 class="font-semibold text-blue-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        OBS Grid View
                      </h5>
                      <div class="flex items-center gap-2">
                        <button
                          @click="toggleUrlReveal('obs')"
                          class="flex-1 text-left px-3 py-1.5 bg-gray-800 rounded text-xs font-mono truncate"
                          :class="revealedUrls['obs'] ? 'text-blue-300' : 'text-gray-500'"
                        >
                          {{ revealedUrls['obs'] ? segment.vdoNinja.obsSourceUrl : 'Click to reveal...' }}
                        </button>
                        <button
                          v-if="revealedUrls['obs']"
                          @click="copyToClipboard(segment.vdoNinja.obsSourceUrl, 'OBS Source URL')"
                          class="px-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold transition"
                        >Copy</button>
                      </div>
                      <p class="text-xs text-blue-300/60 mt-1.5">All participants in a grid layout.</p>
                    </div>

                    <!-- OBS Auto-Switch URL -->
                    <div v-if="segment.vdoNinja.obsAutoSwitchUrl || segment.vdoNinja.obsSourceUrl" class="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                      <h5 class="font-semibold text-purple-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                        OBS Auto-Switch (Active Speaker)
                      </h5>
                      <div class="flex items-center gap-2">
                        <button
                          @click="toggleUrlReveal('obs-auto')"
                          class="flex-1 text-left px-3 py-1.5 bg-gray-800 rounded text-xs font-mono truncate"
                          :class="revealedUrls['obs-auto'] ? 'text-purple-300' : 'text-gray-500'"
                        >
                          {{ revealedUrls['obs-auto'] ? (segment.vdoNinja.obsAutoSwitchUrl || segment.vdoNinja.obsSourceUrl + '&activespeaker') : 'Click to reveal...' }}
                        </button>
                        <button
                          v-if="revealedUrls['obs-auto']"
                          @click="copyToClipboard(segment.vdoNinja.obsAutoSwitchUrl || segment.vdoNinja.obsSourceUrl + '&activespeaker', 'OBS Auto-Switch URL')"
                          class="px-2 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-semibold transition"
                        >Copy</button>
                      </div>
                      <p class="text-xs text-purple-300/60 mt-1.5">Automatically switches to whoever is speaking.</p>
                    </div>
                  </div>
                </div>

                <!-- Stream Preview (Collapsible) -->
                <div class="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    @click="toggleVdoSection('preview')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800/80 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <span class="font-semibold text-gray-300 text-sm">Stream Preview</span>
                      <span v-if="showVdoPreview" class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    </div>
                    <svg :class="['w-4 h-4 text-gray-400 transition-transform duration-300', expandedVdoSections.preview ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-show="expandedVdoSections.preview" class="p-4 border-t border-gray-700">
                    <div class="flex items-center justify-end gap-2 mb-3">
                      <button
                        v-if="showVdoPreview"
                        @click="vdoPreviewMuted = !vdoPreviewMuted"
                        class="px-2 py-1 rounded text-xs font-semibold transition"
                        :class="vdoPreviewMuted ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-purple-700 hover:bg-purple-600 text-white'"
                      >
                        {{ vdoPreviewMuted ? 'Muted' : 'Audio On' }}
                      </button>
                      <button
                        @click="showVdoPreview = !showVdoPreview"
                        class="px-3 py-1 rounded text-sm font-semibold transition"
                        :class="showVdoPreview ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'"
                      >
                        {{ showVdoPreview ? 'Hide' : 'Show Preview' }}
                      </button>
                    </div>

                    <div v-if="!showVdoPreview" class="text-center py-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <svg class="w-10 h-10 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <p class="text-gray-500 text-sm">Click "Show Preview" to load the live stream</p>
                    </div>

                    <div v-else class="relative rounded-lg overflow-hidden border-2" :class="activeRecording ? 'border-red-500' : 'border-gray-700'">
                      <iframe
                        :src="segment.vdoNinja.obsSourceUrl + (vdoPreviewMuted ? '&mute' : '')"
                        class="w-full bg-black"
                        style="min-height: 400px; aspect-ratio: 16/9;"
                        allow="camera;microphone;autoplay;display-capture"
                        allowfullscreen
                      ></iframe>
                      <div v-if="activeRecording" class="absolute top-3 left-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5">
                        <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <span class="text-white text-sm font-bold">REC {{ recTimerDisplay }}</span>
                      </div>
                    </div>

                    <p v-if="showVdoPreview" class="text-xs text-gray-500 mt-2">
                      Showing live OBS source view. Participants will appear as they connect.
                    </p>
                  </div>
                </div>

                <!-- Participants (Collapsible) -->
                <div class="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    @click="toggleVdoSection('participants')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800/80 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <span class="font-semibold text-gray-300 text-sm">Participants ({{ segment.vdoNinja.participants?.length || 0 }})</span>
                    </div>
                    <svg :class="['w-4 h-4 text-gray-400 transition-transform duration-300', expandedVdoSections.participants ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-show="expandedVdoSections.participants" class="p-4 border-t border-gray-700">
                  <div class="flex items-center justify-end mb-3">
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
                        <div v-if="participant.email || participant.user?.email || participant.applicant?.email" class="text-xs text-gray-500">
                          {{ participant.email || participant.user?.email || participant.applicant?.email }}
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

                  <!-- Email All Participants Button -->
                  <div v-if="segment.vdoNinja?.sessionCreated && segment.vdoNinja?.participants?.length > 0" class="pt-3 border-t border-gray-700 mt-3">
                    <button
                      @click="sendVdoEmailToAll"
                      :disabled="sendingEmailAll"
                      class="w-full px-4 py-2 bg-green-900/50 hover:bg-green-800 text-green-200 rounded-lg font-semibold transition disabled:opacity-50 border border-green-700"
                    >
                      {{ sendingEmailAll ? 'Sending Emails...' : 'Email All Participants' }}
                    </button>
                  </div>
                  </div>
                </div>

                <!-- Recording Controls (Collapsible) -->
                <div v-if="segment.vdoNinja?.sessionCreated" class="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    @click="toggleVdoSection('recording')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800/80 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4" :class="activeRecording ? 'text-red-400' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke-width="2"/>
                        <circle cx="12" cy="12" r="4" fill="currentColor"/>
                      </svg>
                      <span class="font-semibold text-gray-300 text-sm">Recording</span>
                      <span v-if="activeRecording" class="flex items-center gap-1 text-xs text-red-400">
                        <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        REC {{ recTimerDisplay }}
                      </span>
                      <span v-else-if="segmentRecordings.length > 0" class="text-xs text-gray-500">{{ segmentRecordings.length }} recording{{ segmentRecordings.length !== 1 ? 's' : '' }}</span>
                    </div>
                    <svg :class="['w-4 h-4 text-gray-400 transition-transform duration-300', expandedVdoSections.recording ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-show="expandedVdoSections.recording" class="p-4 border-t border-gray-700">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-300 text-sm">Session Recording</h4>
                    <div class="flex items-center gap-2">
                      <span
                        :class="recServerOnline ? 'bg-green-400' : 'bg-red-400'"
                        class="w-2 h-2 rounded-full"
                        :title="recServerOnline ? 'Recording server online' : 'Recording server offline'"
                      ></span>
                      <span class="text-xs text-gray-400">
                        {{ recServerChecking ? 'Checking...' : (recServerOnline ? 'Server Online' : 'Server Offline') }}
                      </span>
                      <button
                        @click="checkRecordingServer"
                        class="text-xs text-blue-400 hover:text-blue-300 ml-1"
                        title="Refresh status"
                      >&#x21bb;</button>
                    </div>
                  </div>

                  <!-- Storage Status Indicator -->
                  <div v-if="storageStatus" class="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    :class="[
                      storageColor === 'red' ? 'bg-red-900/30 border border-red-700' : '',
                      storageColor === 'yellow' ? 'bg-yellow-900/20 border border-yellow-700/50' : '',
                      storageColor === 'green' ? 'bg-gray-900/50 border border-gray-700' : '',
                      storageColor === 'gray' ? 'bg-gray-900/50 border border-gray-700' : ''
                    ]">
                    <div :class="[
                      'w-2 h-2 rounded-full flex-shrink-0',
                      storageColor === 'red' ? 'bg-red-500 animate-pulse' : '',
                      storageColor === 'yellow' ? 'bg-yellow-500' : '',
                      storageColor === 'green' ? 'bg-green-500' : '',
                      storageColor === 'gray' ? 'bg-gray-500' : ''
                    ]"></div>
                    <span :class="[
                      storageColor === 'red' ? 'text-red-400' : '',
                      storageColor === 'yellow' ? 'text-yellow-400' : '',
                      storageColor === 'green' ? 'text-gray-400' : '',
                      storageColor === 'gray' ? 'text-gray-500' : ''
                    ]">{{ storageColor === 'red' ? 'Storage Critical' : storageColor === 'yellow' ? 'Storage Low' : 'Storage' }}</span>
                    <div class="flex-1 max-w-[120px] bg-gray-700 rounded-full h-1.5">
                      <div :class="[
                        'h-1.5 rounded-full transition-all',
                        storageColor === 'red' ? 'bg-red-500' : '',
                        storageColor === 'yellow' ? 'bg-yellow-500' : '',
                        storageColor === 'green' ? 'bg-green-500' : '',
                        storageColor === 'gray' ? 'bg-gray-500' : ''
                      ]" :style="{ width: storageStatus.percentUsed + '%' }"></div>
                    </div>
                    <span :class="[
                      'font-mono whitespace-nowrap',
                      storageColor === 'red' ? 'text-red-400' : '',
                      storageColor === 'yellow' ? 'text-yellow-400' : '',
                      storageColor === 'green' ? 'text-green-400' : '',
                      storageColor === 'gray' ? 'text-gray-500' : ''
                    ]">{{ formatStorageBytes(storageStatus.available) }} free</span>
                  </div>

                  <!-- Active Recording Display -->
                  <div v-if="activeRecording" class="p-3 bg-red-900/30 border border-red-700 rounded-lg mb-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <span class="text-red-200 font-semibold">RECORDING</span>
                        <span class="text-red-300 font-mono text-lg">{{ recTimerDisplay }}</span>
                      </div>
                      <button
                        @click="stopRecording"
                        :disabled="recLoading"
                        class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-semibold text-sm transition disabled:opacity-50"
                      >
                        {{ recLoading ? 'Stopping...' : 'Stop Recording' }}
                      </button>
                    </div>
                  </div>

                  <!-- Start Recording Button -->
                  <div v-else>
                    <div class="flex items-center gap-2 mb-2">
                      <label class="text-xs text-gray-400">Layout:</label>
                      <select
                        v-model="recLayout"
                        class="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300"
                      >
                        <option value="activespeaker">Active Speaker (auto-switch)</option>
                        <option value="grid">Grid (all participants)</option>
                        <option value="solo">Solo Speaker (one at a time)</option>
                      </select>
                    </div>
                    <button
                      @click="startRecording"
                      :disabled="recLoading || !recServerOnline"
                      class="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span class="w-3 h-3 bg-red-400 rounded-full"></span>
                      {{ recLoading ? 'Starting...' : 'Start Recording' }}
                    </button>
                    <p v-if="!recServerOnline" class="text-xs text-yellow-400 mt-1 text-center">
                      Recording server is offline. Check that bb9e is running.
                    </p>
                  </div>

                  <!-- Past Recordings for this Segment -->
                  <div v-if="segmentRecordings.length > 0" class="mt-3 space-y-2">
                    <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recordings</h5>
                    <p v-if="recordingsSummary" class="text-xs text-gray-500">{{ recordingsSummary }}</p>
                    <div
                      v-for="rec in segmentRecordings.filter(r => r.status !== 'recording' && r.status !== 'starting')"
                      :key="rec.recordingId"
                      :class="['p-2.5 rounded border', rec.status === 'processing' ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-gray-900 border-gray-700']"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm text-gray-300 truncate">{{ rec.fileName }}</div>
                          <div class="text-xs text-gray-500 flex flex-wrap gap-2">
                            <span v-if="rec.duration">{{ formatDuration(rec.duration) }}</span>
                            <span v-if="rec.fileSize">{{ formatFileSize(rec.fileSize) }}</span>
                            <span>{{ new Date(rec.startedAt).toLocaleDateString() }}</span>
                            <span v-if="rec.status === 'processing'" class="text-yellow-400 font-medium flex items-center gap-1">
                              <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                              Processing...
                            </span>
                            <span v-if="rec.s3Uploaded && rec.s3Verified === true" class="text-green-400 font-medium">on S3</span>
                            <span v-else-if="rec.s3Uploaded && rec.s3Verified === false" class="text-red-400 font-medium">S3 deleted</span>
                            <span v-else-if="!rec.s3Uploaded && rec.status === 'completed'" class="text-yellow-600 font-medium">on Agent (local)</span>
                            <span v-if="rec.status === 'error'" class="text-red-400">Error</span>
                          </div>
                        </div>
                        <div class="flex items-center gap-1 relative">
                          <!-- Preview button (only when on S3) -->
                          <button
                            v-if="rec.s3Uploaded && rec.s3Verified !== false"
                            @click="previewRecording(rec.recordingId)"
                            :disabled="previewLoading"
                            :class="previewRecordingId === rec.recordingId ? 'bg-purple-600' : 'bg-purple-800 hover:bg-purple-700'"
                            class="px-2 py-1 text-white rounded text-xs transition disabled:opacity-50"
                            title="Preview recording"
                          >{{ previewRecordingId === rec.recordingId ? 'Hide' : 'Play' }}</button>

                          <!-- Quick S3 upload button (default agent S3) — shown when still local -->
                          <button
                            v-if="(!rec.s3Uploaded || rec.s3Verified === false) && rec.status === 'completed'"
                            @click="uploadRecordingToS3(rec.recordingId)"
                            :disabled="recLoading"
                            class="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition disabled:opacity-50"
                            title="Upload to default S3"
                          >S3↑</button>

                          <!-- Transfer to disk — dropdown picker -->
                          <div v-if="rec.status === 'completed'" class="relative transfer-menu-wrap">
                            <button
                              @click="toggleTransferMenu(rec.recordingId)"
                              :disabled="!!transferRecordingDiskId"
                              class="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs transition disabled:opacity-50 flex items-center gap-1"
                              title="Transfer to storage destination"
                            >
                              <span v-if="transferRecordingDiskId && transferRecordingDiskId.startsWith(rec.recordingId + ':')" class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span v-else>&#x2192;</span>
                              Dest
                            </button>
                            <!-- Destination dropdown -->
                            <div v-if="showTransferMenu === rec.recordingId"
                              class="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 py-1">
                              <div v-if="loadingDisks" class="px-3 py-2 text-xs text-gray-400">Loading disks...</div>
                              <div v-else-if="availableDisks.length === 0" class="px-3 py-2 text-xs text-gray-400">
                                No storage destinations. Configure in <strong>Storage</strong> tab.
                              </div>
                              <button
                                v-for="disk in availableDisks"
                                :key="disk.id"
                                @click="transferRecording(rec.recordingId, disk.id, disk.label)"
                                :disabled="!disk.isOnline"
                                class="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <span class="px-1 py-0.5 rounded text-xs font-medium"
                                  :class="diskTypeBadgeClass(disk.type || 'local')">
                                  {{ diskTypeLabel(disk.type || 'local') }}
                                </span>
                                <span class="flex-1 text-gray-200 truncate">{{ disk.label }}</span>
                                <span :class="disk.isOnline ? 'text-green-400' : 'text-red-400'" class="text-xs shrink-0">
                                  {{ disk.isOnline ? '●' : '○' }}
                                </span>
                              </button>
                            </div>
                          </div>

                          <button
                            @click="deleteServerRecording(rec.recordingId)"
                            class="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded text-xs transition"
                            title="Delete recording"
                          >Del</button>
                        </div>
                      </div>
                      <!-- Inline Video Player -->
                      <div v-if="previewRecordingId === rec.recordingId && previewUrl" class="mt-2">
                        <video
                          controls
                          autoplay
                          :src="previewUrl"
                          class="w-full rounded-lg border border-gray-600 bg-black"
                          style="max-height: 480px;"
                        >
                          Your browser does not support video playback.
                        </video>
                      </div>
                    </div>
                  </div>
                </div>

                  </div>

                <!-- Delete Session Button -->
                <div class="pt-2">
                  <button
                    @click="deleteVdoSession"
                    :disabled="vdoLoading"
                    class="w-full px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg font-semibold transition disabled:opacity-50 border border-red-700 text-sm"
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

          <!-- Storage Settings Section (Collapsible) -->
          <transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 max-h-0 -translate-y-4"
            enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
            leave-to-class="opacity-0 max-h-0 -translate-y-4"
          >
          <div v-show="expandedPanels.storage" class="mt-4 overflow-hidden">
            <div class="bg-gray-800 border border-gray-700 rounded-xl p-4 md:p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-white flex items-center gap-2">
                  <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
                  </svg>
                  Storage Settings
                </h2>
                <!-- Current status indicator -->
                <div v-if="storageStatus" class="flex items-center gap-2 text-sm">
                  <span :class="[
                    'w-2.5 h-2.5 rounded-full',
                    storageColor === 'green' ? 'bg-green-400' : storageColor === 'yellow' ? 'bg-yellow-400' : storageColor === 'red' ? 'bg-red-400' : 'bg-gray-400'
                  ]"></span>
                  <span class="text-gray-400">{{ formatStorageBytes(storageStatus.available) }} free</span>
                </div>
              </div>

              <!-- Not customized state -->
              <div v-if="!storageSettingsCustomized" class="text-center py-6">
                <div class="bg-gray-700/50 rounded-lg p-4 mb-4 inline-block">
                  <svg class="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                  </svg>
                  <p class="text-gray-400">Using global defaults</p>
                  <p class="text-gray-500 text-sm mt-1">Files are stored based on system-wide disk priority</p>
                </div>
                <div>
                  <button @click="enableCustomStorage" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition text-sm font-medium">
                    Customize Storage
                  </button>
                </div>
              </div>

              <!-- Customized storage settings -->
              <div v-else>
                <div v-if="loadingDisks" class="flex items-center justify-center py-8">
                  <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400"></div>
                  <span class="ml-3 text-gray-400">Loading disks...</span>
                </div>

                <div v-else class="space-y-5">
                  <!-- Primary Storage Location -->
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Primary Storage Location</label>
                    <select v-model="storageSettingsForm.primaryDiskId"
                      class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option :value="null">Auto (global priority)</option>
                      <option v-for="disk in availableDisks" :key="disk.id" :value="disk.id" :disabled="!disk.isOnline">
                        {{ diskOptionText(disk) }}{{ !disk.isOnline ? ' [OFFLINE]' : '' }}
                      </option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Files will be stored at this location when possible</p>
                  </div>

                  <!-- Output Subfolder (agent-path disks only) -->
                  <div v-if="isAgentPathDisk" class="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                      Output Subfolder
                      <span class="text-xs text-gray-500 font-normal ml-1">(appended to the disk's base path)</span>
                    </label>
                    <div class="flex gap-2">
                      <input v-model="storageSettingsForm.outputSubfolder" type="text" placeholder="e.g. season-2/episode-5"
                        class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm" />
                      <button @click="openFolderBrowser"
                        class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-medium whitespace-nowrap">
                        Browse
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      Full path: {{ selectedPrimaryDisk?.agentPath || '...' }}<span v-if="storageSettingsForm.outputSubfolder">/{{ storageSettingsForm.outputSubfolder }}</span>
                    </p>

                    <!-- Inline folder browser -->
                    <div v-if="showFolderBrowser" class="mt-3 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                      <div class="flex items-center justify-between px-3 py-2 bg-gray-700/50 border-b border-gray-600">
                        <span class="text-sm text-gray-200 font-medium">Folder Browser</span>
                        <button @click="showFolderBrowser = false" class="text-gray-400 hover:text-gray-200 text-xs">Close</button>
                      </div>

                      <!-- Breadcrumb -->
                      <div class="px-3 py-2 flex flex-wrap items-center gap-1 text-xs border-b border-gray-700 bg-gray-700/20">
                        <template v-for="(crumb, i) in folderBreadcrumbs" :key="crumb.path">
                          <span v-if="i > 0" class="text-gray-600">/</span>
                          <button @click="browseFolderPath(crumb.path)"
                            class="text-blue-400 hover:text-blue-300 transition font-mono"
                            :class="i === folderBreadcrumbs.length - 1 ? 'text-white font-semibold' : ''">
                            {{ crumb.label }}
                          </button>
                        </template>
                      </div>

                      <!-- Browse roots (quick jump) -->
                      <div v-if="folderBrowserRoots.length > 1" class="px-3 py-1.5 flex flex-wrap gap-1 border-b border-gray-700">
                        <button v-for="root in folderBrowserRoots" :key="root"
                          @click="browseFolderPath(root)"
                          class="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 font-mono transition">
                          {{ root }}
                        </button>
                      </div>

                      <!-- Loading -->
                      <div v-if="folderBrowserLoading" class="px-3 py-4 text-center">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                      </div>

                      <!-- Error -->
                      <p v-if="folderBrowserError" class="px-3 py-2 text-xs text-red-400">{{ folderBrowserError }}</p>

                      <!-- Directory listing -->
                      <div v-if="!folderBrowserLoading && folderBrowserEntries.length > 0" class="max-h-48 overflow-y-auto">
                        <!-- Parent directory -->
                        <button v-if="folderBrowserPath !== '/'"
                          @click="browseFolderPath(folderBrowserPath.replace(/\\/[^\\/]+\\/?$/, '') || '/')"
                          class="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-gray-700/50 text-gray-400 text-sm transition">
                          <span class="text-blue-400">&#x1F4C1;</span>
                          <span class="font-mono">..</span>
                        </button>
                        <template v-for="entry in folderBrowserEntries" :key="entry.path">
                          <button v-if="entry.isDirectory"
                            @click="browseFolderPath(entry.path)"
                            class="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-gray-700/50 text-gray-200 text-sm transition">
                            <span class="text-yellow-400">&#x1F4C1;</span>
                            <span class="font-mono">{{ entry.name }}</span>
                          </button>
                          <div v-else class="px-3 py-1.5 flex items-center gap-2 text-gray-500 text-sm">
                            <span>&#x1F4C4;</span>
                            <span class="font-mono text-xs">{{ entry.name }}</span>
                            <span v-if="entry.size" class="text-gray-600 text-xs ml-auto">{{ (entry.size / 1024 / 1024).toFixed(1) }} MB</span>
                          </div>
                        </template>
                      </div>

                      <!-- Empty state -->
                      <div v-if="!folderBrowserLoading && folderBrowserEntries.length === 0 && !folderBrowserError"
                        class="px-3 py-3 text-center text-gray-500 text-sm">
                        Empty directory
                      </div>

                      <!-- Select button -->
                      <div class="px-3 py-2 border-t border-gray-700 flex items-center justify-between">
                        <span class="text-xs text-gray-400 font-mono truncate">{{ folderBrowserPath }}</span>
                        <button @click="selectBrowsedFolder"
                          class="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-medium transition">
                          Select This Folder
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Fallback Disks -->
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                      Fallback Disks
                      <span class="text-xs text-gray-500 font-normal ml-1">(tried in order if primary fails)</span>
                    </label>

                    <!-- Current fallback list -->
                    <div v-if="storageSettingsForm.fallbackDiskIds.length > 0" class="space-y-2 mb-3">
                      <div v-for="(diskId, index) in storageSettingsForm.fallbackDiskIds" :key="diskId"
                        class="flex items-center gap-2 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2">
                        <span class="text-orange-400 font-mono text-xs w-5">{{ index + 1 }}.</span>
                        <span v-if="getDiskInfo(diskId)" class="text-xs px-1.5 py-0.5 rounded font-medium"
                          :class="diskTypeBadgeClass(getDiskInfo(diskId)?.type || 'local')">
                          {{ diskTypeLabel(getDiskInfo(diskId)?.type || 'local') }}
                        </span>
                        <span class="flex-1 text-gray-200 text-sm">
                          {{ getDiskLabel(diskId) }}
                          <template v-if="getDiskInfo(diskId) && (getDiskInfo(diskId).type || 'local') === 'local'">
                            <span class="text-gray-500 ml-1">&mdash; {{ formatStorageBytes(getDiskInfo(diskId).available) }} free</span>
                          </template>
                          <template v-else-if="getDiskInfo(diskId) && getDiskInfo(diskId).type === 's3'">
                            <span class="text-gray-500 ml-1">&mdash; {{ getDiskInfo(diskId).region || 'us-east-1' }}</span>
                          </template>
                          <template v-else-if="getDiskInfo(diskId) && (getDiskInfo(diskId).type === 'sftp' || getDiskInfo(diskId).type === 'ftp')">
                            <span class="text-gray-500 ml-1">&mdash; {{ getDiskInfo(diskId).host }}:{{ getDiskInfo(diskId).port }}</span>
                          </template>
                          <template v-else-if="getDiskInfo(diskId) && (getDiskInfo(diskId).type === 'recording-agent' || getDiskInfo(diskId).type === 'agent-path')">
                            <span class="text-gray-500 ml-1">&mdash; {{ getDiskInfo(diskId).host }}:{{ getDiskInfo(diskId).port || 3100 }}{{ getDiskInfo(diskId).agentPath || '' }}</span>
                          </template>
                        </span>
                        <span :class="[
                          'w-2 h-2 rounded-full',
                          getDiskInfo(diskId)?.isOnline ? 'bg-green-400' : 'bg-red-400'
                        ]"></span>
                        <button @click="moveFallbackDisk(index, -1)" :disabled="index === 0"
                          class="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                        </button>
                        <button @click="moveFallbackDisk(index, 1)" :disabled="index === storageSettingsForm.fallbackDiskIds.length - 1"
                          class="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <button @click="removeFallbackDisk(index)" class="p-1 text-red-400 hover:text-red-300">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-gray-500 text-sm mb-3 py-2">No fallback disks configured</div>

                    <!-- Add fallback disk -->
                    <select @change="addFallbackDisk($event.target.value); $event.target.value = ''"
                      class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                      <option value="">+ Add fallback location...</option>
                      <option v-for="disk in availableDisks.filter(d => d.id !== storageSettingsForm.primaryDiskId && !storageSettingsForm.fallbackDiskIds.includes(d.id))"
                        :key="disk.id" :value="disk.id" :disabled="!disk.isOnline">
                        {{ diskOptionText(disk) }}{{ !disk.isOnline ? ' [OFFLINE]' : '' }}
                      </option>
                    </select>
                  </div>

                  <!-- Action buttons -->
                  <div class="flex items-center justify-between pt-3 border-t border-gray-700">
                    <button @click="disableCustomStorage" class="text-sm text-gray-400 hover:text-gray-200 transition">
                      Reset to Defaults
                    </button>
                    <button @click="saveStorageSettings" :disabled="savingStorageSettings"
                      class="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white rounded-lg transition text-sm font-medium flex items-center gap-2">
                      <span v-if="savingStorageSettings" class="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                      {{ savingStorageSettings ? 'Saving...' : 'Save Storage Settings' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
            <h3 class="text-xl font-bold text-yellow-400 mb-4">Add Participant</h3>

            <div class="space-y-4">
              <!-- Add Mode Toggle -->
              <div class="flex gap-2 p-1 bg-gray-900 rounded-lg">
                <button
                  @click="vdoAddMode = 'invite'"
                  :class="[
                    'flex-1 px-3 py-2 rounded text-sm font-semibold transition',
                    vdoAddMode === 'invite' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'
                  ]"
                >
                  Invite by Email
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

              <!-- Invite by Email Mode -->
              <div v-if="vdoAddMode === 'invite'" class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input v-model="vdoParticipantName" type="text"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Participant name..." />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input v-model="vdoParticipantEmail" type="email"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="email@example.com" />
                  <p class="text-xs text-gray-500 mt-1">Invite link will be sent to this email.</p>
                </div>
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
                <label class="block text-sm font-medium text-gray-300 mb-2">Role</label>
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
