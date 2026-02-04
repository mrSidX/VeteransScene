import { ref, reactive, computed, onMounted } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'PromptTemplateManager',
  setup() {
    const authStore = useAuthStore();

    // State
    const templates = ref([]);
    const loading = ref(false);
    const error = ref('');
    const successMessage = ref('');
    const showForm = ref(false);
    const editingId = ref(null);
    const testingId = ref(null);
    const showTestModal = ref(false);

    // Form state
    const form = reactive({
      name: '',
      description: '',
      category: 'custom',
      systemMessage: '',
      userMessageTemplate: '',
      outputFormat: {
        includeDetailed: true,
        includeBrief: true,
        detailedInstructions: '300-500 word comprehensive biography with citations',
        briefInstructions: '2-3 sentence compelling summary for video transitions'
      },
      isDefault: false
    });

    // Test form state
    const testForm = reactive({
      title: '',
      type: 'person',
      context: ''
    });

    // Computed properties
    const categoryLabel = computed(() => {
      const labels = {
        'museum-detailed': '🏛️ Museum Detailed',
        'video-transitions': '🎬 Video Transitions',
        'social-media': '📱 Social Media',
        'educational': '📚 Educational',
        'custom': '⚙️ Custom'
      };
      return labels;
    });

    const groupedTemplates = computed(() => {
      const groups = {};
      templates.value.forEach(template => {
        if (!groups[template.category]) {
          groups[template.category] = [];
        }
        groups[template.category].push(template);
      });
      return groups;
    });

    // Methods
    const loadTemplates = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.getPromptTemplates();
        templates.value = response.data.templates || [];
      } catch (err) {
        error.value = `Failed to load templates: ${err.message}`;
        console.error('Error loading templates:', err);
      } finally {
        loading.value = false;
      }
    };

    const resetForm = () => {
      editingId.value = null;
      form.name = '';
      form.description = '';
      form.category = 'custom';
      form.systemMessage = '';
      form.userMessageTemplate = '';
      form.outputFormat = {
        includeDetailed: true,
        includeBrief: true,
        detailedInstructions: '300-500 word comprehensive biography with citations',
        briefInstructions: '2-3 sentence compelling summary for video transitions'
      };
      form.isDefault = false;
      showForm.value = false;
    };

    const startEdit = async (template) => {
      editingId.value = template._id;
      form.name = template.name;
      form.description = template.description;
      form.category = template.category;
      form.systemMessage = template.systemMessage;
      form.userMessageTemplate = template.userMessageTemplate;
      form.outputFormat = { ...template.outputFormat };
      form.isDefault = template.isDefault;
      showForm.value = true;
    };

    const startCreate = () => {
      resetForm();
      showForm.value = true;
    };

    const saveTemplate = async () => {
      error.value = '';
      successMessage.value = '';

      if (!form.name || !form.systemMessage || !form.userMessageTemplate) {
        error.value = 'Please fill in all required fields';
        return;
      }

      try {
        if (editingId.value) {
          await api.updatePromptTemplate(editingId.value, form);
          successMessage.value = 'Template updated successfully';
        } else {
          await api.createPromptTemplate(form);
          successMessage.value = 'Template created successfully';
        }
        await loadTemplates();
        resetForm();
        setTimeout(() => successMessage.value = '', 3000);
      } catch (err) {
        error.value = `Failed to save template: ${err.message}`;
        console.error('Error saving template:', err);
      }
    };

    const deleteTemplate = async (templateId) => {
      if (!confirm('Are you sure you want to delete this template?')) {
        return;
      }

      error.value = '';
      try {
        await api.deletePromptTemplate(templateId);
        successMessage.value = 'Template deleted successfully';
        await loadTemplates();
        setTimeout(() => successMessage.value = '', 3000);
      } catch (err) {
        error.value = `Failed to delete template: ${err.message}`;
        console.error('Error deleting template:', err);
      }
    };

    const setAsDefault = async (templateId) => {
      error.value = '';
      try {
        await api.setPromptTemplateAsDefault(templateId);
        successMessage.value = 'Template set as default';
        await loadTemplates();
        setTimeout(() => successMessage.value = '', 3000);
      } catch (err) {
        error.value = `Failed to set default: ${err.message}`;
        console.error('Error setting default:', err);
      }
    };

    const startTest = (templateId) => {
      testingId.value = templateId;
      testForm.title = '';
      testForm.type = 'person';
      testForm.context = '';
      showTestModal.value = true;
    };

    const testTemplate = async () => {
      error.value = '';
      try {
        const response = await api.testPromptTemplate(testingId.value, {
          title: testForm.title,
          type: testForm.type,
          context: testForm.context
        });

        // Show test result in a simple dialog
        const result = response.data;
        alert(`System Message:\n${result.systemMessage}\n\nUser Message:\n${result.userMessage}`);
        showTestModal.value = false;
      } catch (err) {
        error.value = `Failed to test template: ${err.message}`;
        console.error('Error testing template:', err);
      }
    };

    // Lifecycle
    onMounted(() => {
      loadTemplates();
    });

    return {
      templates,
      loading,
      error,
      successMessage,
      showForm,
      editingId,
      testingId,
      showTestModal,
      form,
      testForm,
      categoryLabel,
      groupedTemplates,
      loadTemplates,
      resetForm,
      startEdit,
      startCreate,
      saveTemplate,
      deleteTemplate,
      setAsDefault,
      startTest,
      testTemplate
    };
  },
  template: `
    <div class="prompt-template-manager">
      <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Prompt Templates</h1>
          <button
            @click="startCreate"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Create Template
          </button>
        </div>

        <!-- Messages -->
        <div v-if="successMessage" class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          {{ successMessage }}
        </div>
        <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {{ error }}
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-8">
          <div class="text-lg text-gray-600">Loading templates...</div>
        </div>

        <!-- Form Modal -->
        <div v-if="showForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-4">{{ editingId ? 'Edit Template' : 'Create Template' }}</h2>

              <form @submit.prevent="saveTemplate" class="space-y-4">
                <!-- Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Museum Detailed"
                  />
                </div>

                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    v-model="form.description"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Template purpose and use case..."
                    rows="2"
                  ></textarea>
                </div>

                <!-- Category -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    v-model="form.category"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="museum-detailed">🏛️ Museum Detailed</option>
                    <option value="video-transitions">🎬 Video Transitions</option>
                    <option value="social-media">📱 Social Media</option>
                    <option value="educational">📚 Educational</option>
                    <option value="custom">⚙️ Custom</option>
                  </select>
                </div>

                <!-- System Message -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">System Message *</label>
                  <textarea
                    v-model="form.systemMessage"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder="System role and instructions..."
                    rows="4"
                  ></textarea>
                </div>

                <!-- User Message Template -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">User Message Template *</label>
                  <textarea
                    v-model="form.userMessageTemplate"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder="User prompt (use {{title}}, {{type}}, {{context}} as placeholders)"
                    rows="4"
                  ></textarea>
                  <p class="text-xs text-gray-500 mt-1">Available placeholders: {{title}}, {{type}}, {{context}}</p>
                </div>

                <!-- Output Format -->
                <div class="border-t pt-4">
                  <h3 class="font-semibold mb-3 text-gray-700">Output Format Configuration</h3>

                  <div class="grid grid-cols-2 gap-4 mb-3">
                    <label class="flex items-center">
                      <input
                        v-model="form.outputFormat.includeDetailed"
                        type="checkbox"
                        class="mr-2"
                      />
                      <span class="text-sm">Include Detailed Version</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="form.outputFormat.includeBrief"
                        type="checkbox"
                        class="mr-2"
                      />
                      <span class="text-sm">Include Brief Version</span>
                    </label>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Detailed Instructions</label>
                    <textarea
                      v-model="form.outputFormat.detailedInstructions"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      rows="2"
                    ></textarea>
                  </div>

                  <div class="mt-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Brief Instructions</label>
                    <textarea
                      v-model="form.outputFormat.briefInstructions"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      rows="2"
                    ></textarea>
                  </div>
                </div>

                <!-- Default checkbox -->
                <label class="flex items-center">
                  <input
                    v-model="form.isDefault"
                    type="checkbox"
                    class="mr-2"
                  />
                  <span class="text-sm">Set as default for this category</span>
                </label>

                <!-- Buttons -->
                <div class="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    @click="resetForm"
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {{ editingId ? 'Update' : 'Create' }} Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Test Modal -->
        <div v-if="showTestModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-xl w-full">
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-4">Test Template</h2>

              <form @submit.prevent="testTemplate" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    v-model="testForm.title"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., George Washington"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    v-model="testForm.type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="person">Person</option>
                    <option value="unit">Unit</option>
                    <option value="object">Object</option>
                    <option value="event">Event</option>
                    <option value="topic">Topic</option>
                    <option value="memorial">Memorial</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Context</label>
                  <textarea
                    v-model="testForm.context"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Additional context..."
                    rows="3"
                  ></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    @click="showTestModal = false"
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Test Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Templates List -->
        <div v-if="!loading && templates.length === 0" class="text-center py-12">
          <div class="text-gray-500 text-lg mb-4">No templates found</div>
          <button
            @click="startCreate"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create First Template
          </button>
        </div>

        <!-- Templates by Category -->
        <div v-if="!loading && templates.length > 0" class="space-y-6">
          <div v-for="(categoryTemplates, category) in groupedTemplates" :key="category">
            <h2 class="text-xl font-bold text-gray-800 mb-3">
              {{ categoryLabel[category] || category }}
            </h2>

            <div class="grid gap-4">
              <div
                v-for="template in categoryTemplates"
                :key="template._id"
                class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition"
              >
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-bold text-lg text-gray-900">
                      {{ template.name }}
                      <span v-if="template.isDefault" class="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        ⭐ Default
                      </span>
                      <span v-if="template.isSystem" class="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        🔒 System
                      </span>
                    </h3>
                    <p class="text-gray-600 text-sm mt-1">{{ template.description }}</p>
                  </div>
                </div>

                <div class="mb-4 space-y-2 text-sm text-gray-600">
                  <div>
                    <span class="font-medium">System Message:</span>
                    <div class="bg-gray-100 p-2 rounded mt-1 text-xs font-mono max-h-20 overflow-hidden">
                      {{ template.systemMessage }}
                    </div>
                  </div>
                  <div>
                    <span class="font-medium">Output:</span>
                    Detailed: {{ template.outputFormat.includeDetailed ? '✓' : '✗' }} |
                    Brief: {{ template.outputFormat.includeBrief ? '✓' : '✗' }} |
                    Usage: {{ template.usageCount || 0 }}
                  </div>
                </div>

                <div class="flex justify-end gap-2">
                  <button
                    v-if="!template.isSystem"
                    @click="startEdit(template)"
                    class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    @click="startTest(template._id)"
                    class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                  >
                    Test
                  </button>
                  <button
                    v-if="!template.isDefault"
                    @click="setAsDefault(template._id)"
                    class="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                  >
                    Set Default
                  </button>
                  <button
                    v-if="!template.isSystem"
                    @click="deleteTemplate(template._id)"
                    class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
