import { ref, computed, watch } from 'vue';

export default {
  name: 'TemplateEditor',
  props: {
    template: {
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
      subject: '',
      body: '',
      category: 'general',
      variables: []
    });

    const newVariable = ref({
      name: '',
      description: '',
      example: ''
    });

    const categories = [
      'general',
      'application',
      'segment',
      'event',
      'notification',
      'other'
    ];

    const initializeForm = () => {
      if (props.template) {
        form.value = {
          name: props.template.name,
          subject: props.template.subject,
          body: props.template.body,
          category: props.template.category || 'general',
          variables: [...(props.template.variables || [])]
        };
      } else {
        form.value = {
          name: '',
          subject: '',
          body: '',
          category: 'general',
          variables: []
        };
      }
      newVariable.value = { name: '', description: '', example: '' };
    };

    const addVariable = () => {
      if (newVariable.value.name.trim()) {
        form.value.variables.push({...newVariable.value});
        newVariable.value = { name: '', description: '', example: '' };
      }
    };

    const removeVariable = (index) => {
      form.value.variables.splice(index, 1);
    };

    const save = () => {
      if (!form.value.name || !form.value.subject || !form.value.body) {
        alert('Please fill in all required fields');
        return;
      }
      emit('save', form.value);
    };

    const close = () => {
      emit('close');
    };

    // Watch show prop
    watch(props.show, (newVal) => {
      if (newVal) {
        initializeForm();
      }
    });

    return {
      form,
      newVariable,
      categories,
      initializeForm,
      addVariable,
      removeVariable,
      save,
      close
    };
  },
  template: `
    <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 border-2 border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-900">
          <h2 class="text-2xl font-bold text-white">
            {{ template ? '✏️ Edit Template' : '➕ Create Template' }}
          </h2>
          <button
            @click="close"
            type="button"
            class="text-gray-400 hover:text-gray-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="p-6 space-y-6">
          <!-- Name -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Template Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., Application Welcome Email"
              maxlength="100"
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
            <p class="text-xs text-gray-400 mt-1">{{ form.name.length }}/100</p>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Category</label>
            <select
              v-model="form.category"
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none transition">
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Subject -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Subject Line *</label>
            <input
              v-model="form.subject"
              type="text"
              placeholder="Email subject (supports {{variables}})"
              maxlength="200"
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition">
            <p class="text-xs text-gray-400 mt-1">{{ form.subject.length }}/200</p>
          </div>

          <!-- Body -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Message Body *</label>
            <textarea
              v-model="form.body"
              rows="10"
              placeholder="Email body (supports {{variables}})"
              maxlength="10000"
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition resize-none"></textarea>
            <p class="text-xs text-gray-400 mt-1">{{ form.body.length }}/10000</p>
          </div>

          <!-- Variables -->
          <div class="border-t border-gray-700 pt-6">
            <label class="block text-sm font-semibold text-gray-300 mb-4">Template Variables</label>

            <!-- Add Variable -->
            <div class="space-y-3 mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div>
                <input
                  v-model="newVariable.name"
                  type="text"
                  placeholder="Variable name (e.g., firstName)"
                  class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition text-sm">
              </div>
              <div>
                <input
                  v-model="newVariable.description"
                  type="text"
                  placeholder="Description (optional)"
                  class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition text-sm">
              </div>
              <div>
                <input
                  v-model="newVariable.example"
                  type="text"
                  placeholder="Example (optional)"
                  class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition text-sm">
              </div>
              <button
                @click="addVariable"
                type="button"
                class="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded font-semibold transition text-sm">
                Add Variable
              </button>
            </div>

            <!-- Variable List -->
            <div v-if="form.variables.length > 0" class="space-y-2">
              <p class="text-sm text-gray-400">{{ form.variables.length }} variable(s)</p>
              <div
                v-for="(variable, index) in form.variables"
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-white">{{ variable.name }}</p>
                  <p v-if="variable.description" class="text-xs text-gray-400">{{ variable.description }}</p>
                </div>
                <button
                  @click="removeVariable(index)"
                  type="button"
                  class="text-gray-400 hover:text-red-400 transition ml-3">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-700 sticky bottom-0 bg-gray-900">
          <button
            @click="close"
            type="button"
            class="px-6 py-3 border-2 border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 transition">
            Cancel
          </button>
          <button
            @click="save"
            type="button"
            class="px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400 transition">
            Save Template
          </button>
        </div>
      </div>
    </div>
  `
};
