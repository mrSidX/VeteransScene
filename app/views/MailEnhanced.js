import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';
import RecipientSelector from '../components/RecipientSelector.js';
import FileUploader from '../components/FileUploader.js';
import TemplateEditor from '../components/TemplateEditor.js';
import MailingListEditor from '../components/MailingListEditor.js';

export default {
  name: 'MailEnhanced',
  components: {
    RecipientSelector,
    FileUploader,
    TemplateEditor,
    MailingListEditor
  },
  setup() {
    const currentTab = ref('compose');

    // Compose Tab
    const recipients = ref({
      type: 'custom_emails',
      customEmails: [],
      roles: [],
      mailingListId: null,
      userIds: [],
      excludeUserIds: []
    });
    const subject = ref('');
    const body = ref('');
    const templateId = ref(null);
    const templates = ref([]);
    const attachedFiles = ref([]);
    const sending = ref(false);
    const sendMessage = ref('');
    const sendError = ref('');

    // Templates Tab
    const showTemplateEditor = ref(false);
    const editingTemplate = ref(null);
    const templateList = ref([]);
    const templatesLoading = ref(false);

    // Mailing Lists Tab
    const showMailingListEditor = ref(false);
    const editingMailingList = ref(null);
    const mailingListsList = ref([]);
    const mailingListsLoading = ref(false);

    // Sent History Tab
    const emailLogs = ref([]);
    const logsLoading = ref(false);
    const historyOffset = ref(0);
    const historyLimit = ref(20);
    const hasMoreLogs = ref(false);
    const selectedLog = ref(null);
    const showLogDetail = ref(false);

    // Email Service Status
    const emailStatus = ref(null);

    const recipientCount = computed(() => {
      const displayCount = () => {
        if (recipients.value.type === 'custom_emails') {
          return recipients.value.customEmails.length;
        }
        if (recipients.value.type === 'roles') {
          return `Multiple (${recipients.value.roles.join(', ')})`;
        }
        if (recipients.value.type === 'mailing_list') {
          return 'Dynamic';
        }
        if (recipients.value.type === 'users') {
          return recipients.value.userIds.length;
        }
        return 0;
      };

      const count = displayCount();
      if (recipients.value.excludeUserIds.length > 0) {
        return `${count} - ${recipients.value.excludeUserIds.length} excluded`;
      }
      return count;
    });

    const canSend = computed(() => {
      return subject.value.trim() && body.value.trim() &&
        (recipients.value.customEmails.length > 0 ||
          recipients.value.roles.length > 0 ||
          recipients.value.mailingListId ||
          recipients.value.userIds.length > 0);
    });

    // Load email status
    const loadEmailStatus = async () => {
      try {
        const response = await api.get('/email/status');
        emailStatus.value = response.data;
      } catch (error) {
        console.error('Error loading email status:', error);
      }
    };

    // Load templates
    const loadTemplates = async () => {
      templatesLoading.value = true;
      try {
        const response = await api.getEmailTemplates({ limit: 100, isActive: true });
        templateList.value = response.data;
        templates.value = response.data;
      } catch (error) {
        console.error('Load templates error:', error);
      } finally {
        templatesLoading.value = false;
      }
    };

    // Load mailing lists
    const loadMailingLists = async () => {
      mailingListsLoading.value = true;
      try {
        const response = await api.getMailingLists({ limit: 100, isActive: true });
        mailingListsList.value = response.data;
      } catch (error) {
        console.error('Load mailing lists error:', error);
      } finally {
        mailingListsLoading.value = false;
      }
    };

    // Load email logs
    const loadEmailLogs = async () => {
      logsLoading.value = true;
      try {
        const response = await api.getEmailLogs({
          limit: historyLimit.value,
          offset: historyOffset.value,
          archived: false
        });

        if (historyOffset.value === 0) {
          emailLogs.value = response.data;
        } else {
          emailLogs.value.push(...response.data);
        }

        hasMoreLogs.value = response.pagination?.hasMore || false;
      } catch (error) {
        console.error('Load logs error:', error);
      } finally {
        logsLoading.value = false;
      }
    };

    const loadMoreLogs = () => {
      historyOffset.value += historyLimit.value;
      loadEmailLogs();
    };

    // Apply template
    const applyTemplate = () => {
      if (!templateId.value) return;

      const template = templates.value.find(t => t._id === templateId.value);
      if (template) {
        subject.value = template.subject;
        body.value = template.body;
      }
    };

    // Send email
    const sendEmail = async () => {
      if (!canSend.value) return;

      sending.value = true;
      sendMessage.value = '';
      sendError.value = '';

      try {
        const data = {
          subject: subject.value,
          body: body.value,
          recipientType: recipients.value.type,
          customEmails: recipients.value.customEmails,
          roles: recipients.value.roles,
          mailingListId: recipients.value.mailingListId,
          userIds: recipients.value.userIds,
          templateId: templateId.value,
          excludeUserIds: recipients.value.excludeUserIds,
          excludeEmails: []
        };

        const response = await api.sendEnhancedEmail(data, attachedFiles.value);

        sendMessage.value = `✅ Email sent successfully to ${response.data.recipientCount} recipients!`;

        // Reset form
        subject.value = '';
        body.value = '';
        templateId.value = null;
        attachedFiles.value = [];
        recipients.value = {
          type: 'custom_emails',
          customEmails: [],
          roles: [],
          mailingListId: null,
          userIds: [],
          excludeUserIds: []
        };

        // Reload logs
        historyOffset.value = 0;
        await loadEmailLogs();

        setTimeout(() => {
          sendMessage.value = '';
        }, 5000);
      } catch (error) {
        sendError.value = error.message || 'Failed to send email';
      } finally {
        sending.value = false;
      }
    };

    // Template CRUD
    const createTemplate = async (templateData) => {
      try {
        await api.createEmailTemplate(templateData);
        showTemplateEditor.value = false;
        await loadTemplates();
      } catch (error) {
        alert('Error creating template: ' + error.message);
      }
    };

    const updateTemplate = async (templateData) => {
      try {
        await api.updateEmailTemplate(editingTemplate.value._id, templateData);
        showTemplateEditor.value = false;
        editingTemplate.value = null;
        await loadTemplates();
      } catch (error) {
        alert('Error updating template: ' + error.message);
      }
    };

    const deleteTemplate = async (id) => {
      if (confirm('Are you sure you want to delete this template?')) {
        try {
          await api.deleteEmailTemplate(id);
          await loadTemplates();
        } catch (error) {
          alert('Error deleting template: ' + error.message);
        }
      }
    };

    // Mailing List CRUD
    const createMailingList = async (listData) => {
      try {
        await api.createMailingList(listData);
        showMailingListEditor.value = false;
        await loadMailingLists();
      } catch (error) {
        alert('Error creating list: ' + error.message);
      }
    };

    const updateMailingList = async (listData) => {
      try {
        await api.updateMailingList(editingMailingList.value._id, listData);
        showMailingListEditor.value = false;
        editingMailingList.value = null;
        await loadMailingLists();
      } catch (error) {
        alert('Error updating list: ' + error.message);
      }
    };

    const deleteMailingList = async (id) => {
      if (confirm('Are you sure you want to delete this mailing list?')) {
        try {
          await api.deleteMailingList(id);
          await loadMailingLists();
        } catch (error) {
          alert('Error deleting list: ' + error.message);
        }
      }
    };

    // Log actions
    const viewLogDetail = async (log) => {
      try {
        const response = await api.getEmailLogById(log._id);
        selectedLog.value = response.data;
        showLogDetail.value = true;
      } catch (error) {
        alert('Error loading log details: ' + error.message);
      }
    };

    const archiveLog = async (logId) => {
      try {
        await api.archiveEmailLog(logId);
        historyOffset.value = 0;
        await loadEmailLogs();
      } catch (error) {
        alert('Error archiving log: ' + error.message);
      }
    };

    const deleteLog = async (logId) => {
      if (confirm('Are you sure? Only admins can delete logs.')) {
        try {
          await api.deleteEmailLog(logId);
          historyOffset.value = 0;
          await loadEmailLogs();
        } catch (error) {
          alert('Error deleting log: ' + error.message);
        }
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const getStatusColor = (status) => {
      return {
        'sent': 'bg-green-900/30 border-green-600 text-green-300',
        'pending': 'bg-yellow-900/30 border-yellow-600 text-yellow-300',
        'failed': 'bg-red-900/30 border-red-600 text-red-300',
        'partially-sent': 'bg-orange-900/30 border-orange-600 text-orange-300'
      }[status] || 'bg-gray-800 border-gray-700 text-gray-300';
    };

    onMounted(async () => {
      await loadEmailStatus();
      await loadTemplates();
      await loadMailingLists();
      await loadEmailLogs();
    });

    return {
      currentTab,
      recipients,
      subject,
      body,
      templateId,
      templates,
      attachedFiles,
      sending,
      sendMessage,
      sendError,
      showTemplateEditor,
      editingTemplate,
      templateList,
      templatesLoading,
      showMailingListEditor,
      editingMailingList,
      mailingListsList,
      mailingListsLoading,
      emailLogs,
      logsLoading,
      hasMoreLogs,
      selectedLog,
      showLogDetail,
      emailStatus,
      recipientCount,
      canSend,
      loadEmailStatus,
      loadTemplates,
      loadMailingLists,
      loadEmailLogs,
      loadMoreLogs,
      applyTemplate,
      sendEmail,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createMailingList,
      updateMailingList,
      deleteMailingList,
      viewLogDetail,
      archiveLog,
      deleteLog,
      formatDate,
      getStatusColor
    };
  },
  template: `
    <div class="w-full px-2 sm:px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
      <!-- Back Button -->
      <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </router-link>

      <!-- Header -->
      <div class="mb-4 md:mb-6">
        <h1 class="text-3xl sm:text-4xl font-bold text-white mb-2">✉️ Mail Center</h1>
        <p class="text-sm sm:text-base text-gray-300">Send emails with templates, mailing lists, and attachments</p>
      </div>

      <!-- Email Service Status -->
      <div v-if="emailStatus" class="mb-4 md:mb-6 rounded-lg border-2 p-3 md:p-4" :class="emailStatus.configured ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'">
        <div class="flex items-center gap-2 md:gap-3">
          <div class="flex-shrink-0">
            <svg v-if="emailStatus.configured" class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <svg v-else class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-lg" :class="emailStatus.configured ? 'text-green-800' : 'text-red-800'">
              {{ emailStatus.configured ? '✓ Email Service Active' : '✗ Email Service Not Configured' }}
            </h3>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-3 md:mb-6 border-b-2 border-gray-700 overflow-x-auto">
        <nav class="-mb-px flex gap-1 md:gap-3 min-w-min">
          <button
            @click="currentTab = 'compose'"
            :class="currentTab === 'compose' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-2 md:py-3 px-1 md:px-2 font-semibold text-xs md:text-sm transition-colors flex-shrink-0">
            📝 Compose
          </button>
          <button
            @click="currentTab = 'templates'"
            :class="currentTab === 'templates' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-2 md:py-3 px-1 md:px-2 font-semibold text-xs md:text-sm transition-colors flex-shrink-0">
            📋 Templates
          </button>
          <button
            @click="currentTab = 'lists'"
            :class="currentTab === 'lists' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-2 md:py-3 px-1 md:px-2 font-semibold text-xs md:text-sm transition-colors flex-shrink-0">
            📬 Lists
          </button>
          <button
            @click="currentTab = 'history'"
            :class="currentTab === 'history' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-2 md:py-3 px-1 md:px-2 font-semibold text-xs md:text-sm transition-colors flex-shrink-0">
            📊 History
          </button>
        </nav>
      </div>

      <!-- Compose Tab -->
      <div v-show="currentTab === 'compose'" class="space-y-3 md:space-y-4 lg:space-y-6">
        <!-- Templates Selector -->
        <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 md:p-4">
          <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-2">📋 Use Template (Optional)</label>
          <div class="flex flex-col gap-2">
            <select
              v-model="templateId"
              class="w-full px-2 md:px-4 py-2 md:py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-xs md:text-sm focus:border-yellow-500 focus:outline-none transition">
              <option value="">-- No template --</option>
              <option v-for="template in templates" :key="template._id" :value="template._id">
                {{ template.name }} ({{ template.category }})
              </option>
            </select>
            <button
              @click="applyTemplate"
              :disabled="!templateId"
              class="w-full px-3 md:px-6 py-2 md:py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-gray-900 disabled:text-gray-500 rounded-lg font-semibold transition min-h-[40px] text-xs md:text-sm flex items-center justify-center">
              Apply
            </button>
          </div>
        </div>

        <!-- Recipients -->
        <recipient-selector v-model="recipients" />

        <!-- Subject -->
        <div>
          <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-1.5">📌 Subject</label>
          <input
            v-model="subject"
            type="text"
            placeholder="Subject"
            maxlength="200"
            class="w-full px-2 md:px-4 py-1.5 md:py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-xs md:text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
          <div class="flex justify-between items-center text-xs mt-1">
            <p class="text-gray-400">Clear & concise</p>
            <p :class="subject.length > 150 ? 'text-yellow-500' : 'text-gray-500'">{{ subject.length }}/200</p>
          </div>
        </div>

        <!-- Body -->
        <div>
          <label class="block text-xs md:text-sm font-semibold text-gray-300 mb-1.5">💬 Message</label>
          <textarea
            v-model="body"
            rows="6"
            placeholder="Your message..."
            maxlength="10000"
            class="w-full px-2 md:px-4 py-1.5 md:py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white text-xs md:text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition resize-none"></textarea>
          <div class="flex justify-between items-center text-xs mt-1">
            <p class="text-gray-400">Plain text</p>
            <p :class="body.length > 9000 ? 'text-yellow-500' : 'text-gray-500'">{{ body.length }}/10000</p>
          </div>
        </div>

        <!-- Attachments -->
        <file-uploader @filesChanged="attachedFiles = $event" />

        <!-- Recipient Count Display -->
        <div class="p-1.5 md:p-3 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
          <p class="text-xs text-blue-300">👥 Recipients: <span class="font-semibold">{{ recipientCount }}</span></p>
        </div>

        <!-- Messages -->
        <div v-if="sendMessage" class="p-1.5 md:p-3 bg-green-900/30 border-2 border-green-600 rounded-lg">
          <p class="text-xs text-green-400">{{ sendMessage }}</p>
        </div>

        <div v-if="sendError" class="p-1.5 md:p-3 bg-red-900/30 border-2 border-red-600 rounded-lg">
          <p class="text-xs text-red-400">❌ {{ sendError }}</p>
        </div>

        <!-- Send Button -->
        <div class="flex flex-col-reverse sm:flex-row gap-1.5 md:gap-3 pt-2 md:pt-3">
          <button
            @click="templateId = null; subject = ''; body = ''; attachedFiles = []; recipients = { type: 'custom_emails', customEmails: [], roles: [], mailingListId: null, userIds: [], excludeUserIds: [] }"
            type="button"
            class="flex-1 px-2 md:px-6 py-1.5 md:py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 hover:border-gray-600 transition min-h-[40px] text-xs md:text-sm flex items-center justify-center">
            Clear
          </button>
          <button
            @click="sendEmail"
            :disabled="sending || !canSend"
            :class="sending || !canSend ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg shadow-yellow-500/30'"
            class="flex-1 px-2 md:px-8 py-1.5 md:py-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] text-xs md:text-sm">
            <span v-if="sending">🔄 Sending...</span>
            <span v-else>📤 Send</span>
          </button>
        </div>
      </div>

      <!-- Templates Tab -->
      <div v-show="currentTab === 'templates'" class="space-y-3 md:space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4">
          <div class="flex items-center gap-2 md:gap-3">
            <h2 class="text-xl md:text-2xl font-bold text-white">Email Templates</h2>
            <info-helper topic-slug="email-templates-guide" size="sm" />
          </div>
          <button
            @click="editingTemplate = null; showTemplateEditor = true"
            class="w-full sm:w-auto px-3 md:px-4 py-2 md:py-2.5 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition min-h-[40px] flex items-center justify-center">
            ➕ New Template
          </button>
        </div>

        <div v-if="templatesLoading" class="text-center py-8 text-gray-400">
          Loading templates...
        </div>

        <div v-else-if="templateList.length === 0" class="text-center py-12 bg-gray-800/50 rounded-lg border-2 border-gray-700 border-dashed">
          <p class="text-gray-400">No templates yet. Create one to get started!</p>
        </div>

        <div v-else class="grid gap-3 md:gap-4">
          <div
            v-for="template in templateList"
            :key="template._id"
            class="bg-gray-800 border-2 border-gray-700 rounded-lg p-3 md:p-4 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition">
            <div class="flex items-start justify-between gap-3 md:gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 md:gap-3 flex-wrap">
                  <span class="inline-block px-2 md:px-3 py-0.5 md:py-1 bg-yellow-900/50 border border-yellow-600 rounded-full text-xs text-yellow-300">
                    {{ template.category }}
                  </span>
                  <h3 class="text-base md:text-lg font-bold text-white break-words">{{ template.name }}</h3>
                </div>
                <p class="mt-1.5 md:mt-2 text-xs md:text-sm text-gray-300 line-clamp-2">{{ template.subject }}</p>
                <p class="mt-1 md:mt-2 text-xs text-gray-500">Used {{ template.usageCount }} times</p>
              </div>
              <div class="flex gap-1.5 md:gap-2 flex-shrink-0">
                <button
                  @click="editingTemplate = template; showTemplateEditor = true"
                  class="px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition text-sm min-h-[36px] flex items-center">
                  ✏️
                </button>
                <button
                  @click="deleteTemplate(template._id)"
                  class="px-2 md:px-3 py-1.5 md:py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition text-sm min-h-[36px] flex items-center">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mailing Lists Tab -->
      <div v-show="currentTab === 'lists'" class="space-y-3 md:space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4">
          <div class="flex items-center gap-2 md:gap-3">
            <h2 class="text-xl md:text-2xl font-bold text-white">Mailing Lists</h2>
            <info-helper topic-slug="mailing-lists-explained" size="sm" />
          </div>
          <button
            @click="editingMailingList = null; showMailingListEditor = true"
            class="w-full sm:w-auto px-3 md:px-4 py-2 md:py-2.5 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition min-h-[40px] flex items-center justify-center">
            ➕ New List
          </button>
        </div>

        <div v-if="mailingListsLoading" class="text-center py-8 text-gray-400">
          Loading lists...
        </div>

        <div v-else-if="mailingListsList.length === 0" class="text-center py-12 bg-gray-800/50 rounded-lg border-2 border-gray-700 border-dashed">
          <p class="text-gray-400">No mailing lists yet. Create one to get started!</p>
        </div>

        <div v-else class="grid gap-3 md:gap-4">
          <div
            v-for="list in mailingListsList"
            :key="list._id"
            class="bg-gray-800 border-2 border-gray-700 rounded-lg p-3 md:p-4 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition">
            <div class="flex items-start justify-between gap-3 md:gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 md:gap-3 flex-wrap">
                  <span class="inline-block px-2 md:px-3 py-0.5 md:py-1" :class="list.isDynamic ? 'bg-blue-900/50 border border-blue-600 text-blue-300' : 'bg-purple-900/50 border border-purple-600 text-purple-300'" >
                    <span class="text-xs">{{ list.isDynamic ? 'Dynamic' : 'Static' }}</span>
                  </span>
                  <h3 class="text-base md:text-lg font-bold text-white break-words">{{ list.name }}</h3>
                </div>
                <p v-if="list.description" class="mt-1.5 md:mt-2 text-xs md:text-sm text-gray-300">{{ list.description }}</p>
                <p class="mt-1 md:mt-2 text-xs text-gray-500">{{ list.recipientCount }} recipient(s) • Used {{ list.usageCount }} times</p>
              </div>
              <div class="flex gap-1.5 md:gap-2 flex-shrink-0">
                <button
                  @click="editingMailingList = list; showMailingListEditor = true"
                  class="px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition text-sm min-h-[36px] flex items-center">
                  ✏️
                </button>
                <button
                  @click="deleteMailingList(list._id)"
                  class="px-2 md:px-3 py-1.5 md:py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition text-sm min-h-[36px] flex items-center">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sent History Tab -->
      <div v-show="currentTab === 'history'" class="space-y-3 md:space-y-4">
        <h2 class="text-lg md:text-2xl font-bold text-white">Sent History</h2>

        <div v-if="logsLoading" class="text-center py-8 text-gray-400">
          Loading history...
        </div>

        <div v-else-if="emailLogs.length === 0" class="text-center py-12 bg-gray-800/50 rounded-lg border-2 border-gray-700 border-dashed">
          <p class="text-gray-400">No emails sent yet</p>
        </div>

        <div v-else class="space-y-1.5 md:space-y-3">
          <div
            v-for="log in emailLogs"
            :key="log._id"
            class="bg-gray-800 border-2 border-gray-700 rounded-lg p-2 md:p-3 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition">
            <div class="flex items-start justify-between gap-2 md:gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 md:gap-2 flex-wrap">
                  <span :class="'inline-block px-1.5 md:px-3 py-0.5 border rounded-full text-xs font-semibold ' + getStatusColor(log.status)">
                    {{ log.status === 'sent' ? '✓' : log.status === 'failed' ? '✗' : '⊙' }} {{ log.status.toUpperCase() }}
                  </span>
                  <h3 class="text-xs md:text-sm font-bold text-white truncate">{{ log.subject }}</h3>
                </div>
                <p class="mt-1 text-xs text-gray-300">
                  {{ log.recipients.length }} • {{ formatDate(log.createdAt) }}
                </p>
                <p v-if="log.templateName" class="text-xs text-gray-500 mt-0.5">📋 {{ log.templateName }}</p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button
                  @click="viewLogDetail(log)"
                  class="px-1.5 md:px-2 py-1 md:py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition text-xs min-h-[32px] flex items-center">
                  👁️
                </button>
                <button
                  @click="archiveLog(log._id)"
                  class="px-1.5 md:px-2 py-1 md:py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition text-xs min-h-[32px] flex items-center">
                  📦
                </button>
                <button
                  @click="deleteLog(log._id)"
                  class="px-1.5 md:px-2 py-1 md:py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition text-xs min-h-[32px] flex items-center">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <div v-if="hasMoreLogs" class="text-center pt-1.5 md:pt-3">
            <button
              @click="loadMoreLogs"
              class="px-2 md:px-6 py-1.5 md:py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 hover:border-yellow-500/50 transition min-h-[40px] text-xs md:text-sm flex items-center justify-center">
              📥 Load More
            </button>
          </div>
        </div>
      </div>

      <!-- Template Editor Modal -->
      <template-editor
        :template="editingTemplate"
        :show="showTemplateEditor"
        @save="editingTemplate ? updateTemplate($event) : createTemplate($event)"
        @close="showTemplateEditor = false; editingTemplate = null" />

      <!-- Mailing List Editor Modal -->
      <mailing-list-editor
        :mailing-list="editingMailingList"
        :show="showMailingListEditor"
        @save="editingMailingList ? updateMailingList($event) : createMailingList($event)"
        @close="showMailingListEditor = false; editingMailingList = null" />

      <!-- Log Detail Modal -->
      <div v-if="showLogDetail && selectedLog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-900 border-2 border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-3 md:p-4 border-b border-gray-700 sticky top-0 bg-gray-900">
            <h2 class="text-lg md:text-2xl font-bold text-white">📧 Email Details</h2>
            <button
              @click="showLogDetail = false"
              class="text-gray-400 hover:text-gray-300 flex-shrink-0">
              <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-2.5 md:p-4 space-y-2 md:space-y-3">
            <div>
              <p class="text-xs text-gray-400 font-semibold uppercase">Subject</p>
              <p class="text-white font-semibold text-xs md:text-sm">{{ selectedLog.subject }}</p>
            </div>

            <div>
              <p class="text-xs text-gray-400 font-semibold uppercase">Status</p>
              <span :class="'inline-block px-1.5 md:px-3 py-0.5 border rounded-full text-xs font-semibold ' + getStatusColor(selectedLog.status)">
                {{ selectedLog.status.toUpperCase() }}
              </span>
            </div>

            <div>
              <p class="text-xs text-gray-400 font-semibold uppercase">Recipients</p>
              <p class="text-white text-xs md:text-sm">{{ selectedLog.recipients.length }} recipient(s)</p>
            </div>

            <div v-if="selectedLog.templateName">
              <p class="text-xs text-gray-400 font-semibold uppercase">Template</p>
              <p class="text-white text-xs md:text-sm">{{ selectedLog.templateName }}</p>
            </div>

            <div v-if="selectedLog.attachments && selectedLog.attachments.length > 0">
              <p class="text-xs text-gray-400 font-semibold uppercase">Attachments</p>
              <div class="space-y-0.5">
                <div v-for="(attachment, idx) in selectedLog.attachments" :key="idx" class="text-xs text-white">
                  📎 {{ attachment.originalName }} ({{ (attachment.size / 1024).toFixed(1) }}KB)
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs text-gray-400 font-semibold uppercase">Sent At</p>
              <p class="text-white text-xs md:text-sm">{{ new Date(selectedLog.sentAt).toLocaleString() }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-1.5 md:gap-3 p-2.5 md:p-4 border-t border-gray-700">
            <button
              @click="showLogDetail = false"
              class="px-3 md:px-6 py-2 md:py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 transition min-h-[40px] text-xs md:text-sm flex items-center justify-center">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
