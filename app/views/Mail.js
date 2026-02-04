import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'Mail',
  setup() {
    const currentTab = ref('compose');
    const recipientType = ref('custom');
    const emailForm = ref({
      to: '',
      subject: '',
      message: ''
    });
    const sending = ref(false);
    const successMessage = ref('');
    const errorMessage = ref('');
    const emailHistory = ref([]);
    const loadingHistory = ref(false);
    const hasMoreHistory = ref(false);
    const historyOffset = ref(0);
    const historyLimit = ref(20);
    const testEmailAddress = ref('');
    const sendingTest = ref(false);
    const testSuccessMessage = ref('');
    const testErrorMessage = ref('');
    const emailStatus = ref(null);

    const canSendEmail = computed(() => {
      if (recipientType.value === 'moderators') {
        return emailForm.value.subject.trim() && emailForm.value.message.trim();
      }
      return emailForm.value.to.trim() && emailForm.value.subject.trim() && emailForm.value.message.trim();
    });

    const loadEmailStatus = async () => {
      try {
        const response = await api.get('/email/status');
        emailStatus.value = response.data;
      } catch (error) {
        console.error('Error loading email status:', error);
      }
    };

    const sendEmail = async () => {
      sending.value = true;
      successMessage.value = '';
      errorMessage.value = '';

      try {
        let response;

        if (recipientType.value === 'moderators') {
          // Send to all moderators
          response = await api.post('/email/to-moderators', {
            subject: emailForm.value.subject,
            message: emailForm.value.message
          });
          successMessage.value = response.message || `Email sent to ${response.recipientCount} moderators successfully!`;
        } else {
          // Send to custom recipient
          const recipients = emailForm.value.to.split(',').map(e => e.trim()).filter(e => e);
          response = await api.post('/email/send', {
            to: recipients,
            subject: emailForm.value.subject,
            message: emailForm.value.message
          });
          successMessage.value = response.message || 'Email sent successfully!';
        }

        // Reset form and reload history
        resetForm();
        await loadEmailHistory();

        // Clear success message after 5 seconds
        setTimeout(() => {
          successMessage.value = '';
        }, 5000);

      } catch (error) {
        console.error('Send email error:', error);
        errorMessage.value = error.message || 'Failed to send email. Please try again.';
      } finally {
        sending.value = false;
      }
    };

    const loadEmailHistory = async () => {
      loadingHistory.value = true;
      try {
        const response = await api.get(`/email/history?limit=${historyLimit.value}&offset=${historyOffset.value}`);

        if (historyOffset.value === 0) {
          emailHistory.value = response.data;
        } else {
          emailHistory.value.push(...response.data);
        }

        hasMoreHistory.value = response.pagination?.hasMore || false;
      } catch (error) {
        console.error('Load email history error:', error);
      } finally {
        loadingHistory.value = false;
      }
    };

    const loadMoreHistory = async () => {
      historyOffset.value += historyLimit.value;
      await loadEmailHistory();
    };

    const sendTestEmail = async () => {
      sendingTest.value = true;
      testSuccessMessage.value = '';
      testErrorMessage.value = '';

      try {
        const response = await api.post('/email/test', {
          testEmail: testEmailAddress.value
        });

        testSuccessMessage.value = response.message || 'Test email sent successfully! Check your inbox.';

        // Clear success message after 5 seconds
        setTimeout(() => {
          testSuccessMessage.value = '';
        }, 5000);

      } catch (error) {
        console.error('Test email error:', error);
        testErrorMessage.value = error.message || 'Failed to send test email. Please check your SMTP configuration.';
      } finally {
        sendingTest.value = false;
      }
    };

    const resetForm = () => {
      emailForm.value = {
        to: '',
        subject: '',
        message: ''
      };
      successMessage.value = '';
      errorMessage.value = '';
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    onMounted(async () => {
      await loadEmailStatus();
      await loadEmailHistory();
    });

    return {
      currentTab,
      recipientType,
      emailForm,
      sending,
      successMessage,
      errorMessage,
      emailHistory,
      loadingHistory,
      hasMoreHistory,
      testEmailAddress,
      sendingTest,
      testSuccessMessage,
      testErrorMessage,
      emailStatus,
      canSendEmail,
      sendEmail,
      loadMoreHistory,
      sendTestEmail,
      resetForm,
      formatDate
    };
  },
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back to Dashboard -->
      <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </router-link>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">✉️ Mail Center</h1>
        <p class="text-gray-300">Send emails to applicants and moderators</p>
      </div>

      <!-- Email Service Status -->
      <div v-if="emailStatus" class="mb-8 rounded-lg border-2 p-5" :class="emailStatus.configured ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <svg v-if="emailStatus.configured" class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <svg v-else class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg" :class="emailStatus.configured ? 'text-green-800' : 'text-red-800'">
              {{ emailStatus.configured ? '✓ Email Service Active' : '✗ Email Service Not Configured' }}
            </h3>
            <p class="mt-1 text-sm" :class="emailStatus.configured ? 'text-green-700' : 'text-red-700'">
              <span v-if="emailStatus.configured">Server: <code class="font-mono">{{ emailStatus.host }}:{{ emailStatus.port }}</code></span>
              <span v-else>Configure SMTP settings in the .env file to enable email sending</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-8 border-b-2 border-gray-700">
        <nav class="-mb-px flex gap-8">
          <button
            @click="currentTab = 'compose'"
            :class="currentTab === 'compose' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-4 px-1 font-semibold text-base transition-colors">
            📝 Compose Email
          </button>
          <button
            @click="currentTab = 'history'"
            :class="currentTab === 'history' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-4 px-1 font-semibold text-base transition-colors">
            📋 Email History
          </button>
          <button
            @click="currentTab = 'test'"
            :class="currentTab === 'test' ? 'border-b-4 border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
            class="whitespace-nowrap py-4 px-1 font-semibold text-base transition-colors">
            🧪 Test Email
          </button>
        </nav>
      </div>

      <!-- Compose Email Tab -->
      <div v-show="currentTab === 'compose'" class="space-y-6">
        <!-- Recipient Type Selection -->
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-3">👥 Send To</label>
          <div class="flex gap-4">
            <button
              @click="recipientType = 'custom'"
              :class="recipientType === 'custom' ? 'bg-yellow-500 text-gray-900 border-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-gray-700'"
              class="flex-1 px-4 py-3 border-2 rounded-lg font-semibold transition">
              Custom Recipient
            </button>
            <button
              @click="recipientType = 'moderators'"
              :class="recipientType === 'moderators' ? 'bg-yellow-500 text-gray-900 border-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-gray-700'"
              class="flex-1 px-4 py-3 border-2 rounded-lg font-semibold transition">
              All Moderators
            </button>
          </div>
        </div>

        <!-- Custom Recipient Input -->
        <div v-if="recipientType === 'custom'" class="space-y-2">
          <label for="to" class="block text-sm font-semibold text-gray-300">Email Address(es)</label>
          <input
            type="email"
            id="to"
            v-model="emailForm.to"
            placeholder="recipient@example.com or email1@example.com, email2@example.com"
            class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
          <p class="text-xs text-gray-400">💡 Tip: Separate multiple emails with commas</p>
        </div>

        <!-- Subject -->
        <div class="space-y-2">
          <label for="subject" class="block text-sm font-semibold text-gray-300">📌 Subject Line</label>
          <input
            type="text"
            id="subject"
            v-model="emailForm.subject"
            placeholder="Enter email subject"
            maxlength="200"
            class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
          <div class="flex justify-between items-center text-xs">
            <p class="text-gray-400">Keep it clear and concise</p>
            <p :class="emailForm.subject.length > 150 ? 'text-yellow-500' : 'text-gray-500'">{{ emailForm.subject.length }}/200</p>
          </div>
        </div>

        <!-- Message -->
        <div class="space-y-2">
          <label for="message" class="block text-sm font-semibold text-gray-300">💬 Message</label>
          <textarea
            id="message"
            v-model="emailForm.message"
            rows="12"
            placeholder="Write your message here... (Plain text format)"
            maxlength="5000"
            class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition resize-none"></textarea>
          <div class="flex justify-between items-center text-xs">
            <p class="text-gray-400">Your message will be formatted with the official email template</p>
            <p :class="emailForm.message.length > 4000 ? 'text-yellow-500' : 'text-gray-500'">{{ emailForm.message.length }}/5000</p>
          </div>
        </div>

        <!-- Send Button -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            @click="resetForm"
            type="button"
            class="px-6 py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 hover:border-gray-600 transition">
            Clear Form
          </button>
          <button
            @click="sendEmail"
            :disabled="sending || !canSendEmail"
            :class="sending || !canSendEmail ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg shadow-yellow-500/30'"
            class="px-8 py-3 rounded-lg font-bold transition flex items-center gap-2">
            <span v-if="sending">🔄 Sending...</span>
            <span v-else>📤 Send Email</span>
          </button>
        </div>

        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="p-4 bg-green-900/30 border-2 border-green-600 rounded-lg">
          <div class="flex gap-3">
            <span class="text-2xl">✅</span>
            <div>
              <p class="font-semibold text-green-400">Success!</p>
              <p class="text-sm text-green-300 mt-1">{{ successMessage }}</p>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="p-4 bg-red-900/30 border-2 border-red-600 rounded-lg">
          <div class="flex gap-3">
            <span class="text-2xl">❌</span>
            <div>
              <p class="font-semibold text-red-400">Error</p>
              <p class="text-sm text-red-300 mt-1">{{ errorMessage }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Email History Tab -->
      <div v-show="currentTab === 'history'" class="space-y-6">
        <div v-if="loadingHistory" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-yellow-500 border-t-yellow-300"></div>
          <p class="mt-4 text-gray-400">Loading email history...</p>
        </div>

        <div v-else-if="emailHistory.length === 0" class="text-center py-16 bg-gray-800/50 rounded-lg border-2 border-gray-700 border-dashed">
          <div class="text-5xl mb-4">📭</div>
          <h3 class="text-lg font-semibold text-gray-300">No emails sent yet</h3>
          <p class="mt-2 text-gray-400">Start composing your first email to see it appear here</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="log in emailHistory" :key="log._id" class="bg-gray-800 border-2 border-gray-700 rounded-lg p-5 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">📧</span>
                  <h3 class="text-base font-bold text-white truncate">{{ log.metadata?.subject || 'Email sent' }}</h3>
                </div>
                <p class="mt-2 text-sm text-gray-300">{{ log.description }}</p>
                <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span class="flex items-center gap-1">👤 {{ log.user?.firstName }} {{ log.user?.lastName }}</span>
                  <span>•</span>
                  <span class="flex items-center gap-1">🕐 {{ formatDate(log.createdAt) }}</span>
                  <span v-if="log.metadata?.recipients">•</span>
                  <span v-if="log.metadata?.recipients" class="flex items-center gap-1">
                    📨 {{ Array.isArray(log.metadata.recipients) ? log.metadata.recipients.length : 1 }} recipient(s)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="hasMoreHistory" class="text-center pt-4">
            <button
              @click="loadMoreHistory"
              :disabled="loadingHistory"
              class="px-6 py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 hover:border-yellow-500/50 transition">
              📥 Load More History
            </button>
          </div>
        </div>
      </div>

      <!-- Test Email Tab -->
      <div v-show="currentTab === 'test'" class="space-y-6">
        <div class="bg-yellow-900/30 border-2 border-yellow-600 rounded-lg p-6">
          <div class="flex gap-4">
            <span class="text-3xl">🧪</span>
            <div>
              <h3 class="text-lg font-bold text-yellow-400 mb-1">Test Email Configuration</h3>
              <p class="text-sm text-yellow-300">Send a test email to verify your SMTP settings are configured correctly and emails can be delivered successfully.</p>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label for="testEmail" class="block text-sm font-semibold text-gray-300">📬 Your Email Address</label>
          <input
            type="email"
            id="testEmail"
            v-model="testEmailAddress"
            placeholder="your-email@example.com"
            class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
          <p class="text-xs text-gray-400">💡 The test email will be sent to this address so you can verify it arrives correctly</p>
        </div>

        <div class="flex justify-end pt-4">
          <button
            @click="sendTestEmail"
            :disabled="sendingTest || !testEmailAddress"
            :class="sendingTest || !testEmailAddress ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg shadow-yellow-500/30'"
            class="px-8 py-3 rounded-lg font-bold transition flex items-center gap-2">
            <span v-if="sendingTest">🔄 Sending Test...</span>
            <span v-else>🚀 Send Test Email</span>
          </button>
        </div>

        <!-- Test Success/Error Messages -->
        <div v-if="testSuccessMessage" class="p-5 bg-green-900/30 border-2 border-green-600 rounded-lg">
          <div class="flex gap-3">
            <span class="text-3xl">✅</span>
            <div>
              <p class="font-semibold text-green-400">Test Email Sent!</p>
              <p class="text-sm text-green-300 mt-1">{{ testSuccessMessage }}</p>
              <p class="text-xs text-green-400 mt-2">Check your inbox (and spam folder) to confirm delivery.</p>
            </div>
          </div>
        </div>

        <div v-if="testErrorMessage" class="p-5 bg-red-900/30 border-2 border-red-600 rounded-lg">
          <div class="flex gap-3">
            <span class="text-3xl">❌</span>
            <div>
              <p class="font-semibold text-red-400">Test Failed</p>
              <p class="text-sm text-red-300 mt-1">{{ testErrorMessage }}</p>
              <p class="text-xs text-red-400 mt-2">Please check your SMTP configuration in the .env file and try again.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
