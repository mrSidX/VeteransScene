import { ref } from 'vue';

export default {
  name: 'FileUploader',
  props: {
    maxFiles: {
      type: Number,
      default: 5
    },
    maxSize: {
      type: Number,
      default: 10 * 1024 * 1024 // 10MB
    },
    accept: {
      type: String,
      default: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv'
    }
  },
  emits: ['filesChanged'],
  setup(props, { emit }) {
    const files = ref([]);
    const errorMessage = ref('');
    const isDragover = ref(false);

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const handleFileSelect = (event) => {
      const newFiles = Array.from(event.target.files || []);
      addFiles(newFiles);
    };

    const addFiles = (newFiles) => {
      errorMessage.value = '';

      // Check file count
      if (files.value.length + newFiles.length > props.maxFiles) {
        errorMessage.value = `Maximum ${props.maxFiles} files allowed`;
        return;
      }

      // Validate and add files
      const validFiles = newFiles.filter(file => {
        if (file.size > props.maxSize) {
          errorMessage.value = `File "${file.name}" exceeds maximum size of ${formatFileSize(props.maxSize)}`;
          return false;
        }
        return true;
      });

      files.value.push(...validFiles);
      emit('filesChanged', files.value);
    };

    const removeFile = (index) => {
      files.value.splice(index, 1);
      emit('filesChanged', files.value);
    };

    const handleDragover = (event) => {
      event.preventDefault();
      isDragover.value = true;
    };

    const handleDragleave = (event) => {
      event.preventDefault();
      isDragover.value = false;
    };

    const handleDrop = (event) => {
      event.preventDefault();
      isDragover.value = false;
      const droppedFiles = Array.from(event.dataTransfer?.files || []);
      addFiles(droppedFiles);
    };

    return {
      files,
      errorMessage,
      isDragover,
      formatFileSize,
      handleFileSelect,
      removeFile,
      handleDragover,
      handleDragleave,
      handleDrop
    };
  },
  template: `
    <div class="space-y-3">
      <label class="block text-sm font-semibold text-gray-300">📎 Attachments</label>

      <!-- Upload Area -->
      <div
        @dragover="handleDragover"
        @dragleave="handleDragleave"
        @drop="handleDrop"
        :class="isDragover ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-700 bg-gray-800/50'"
        class="border-2 border-dashed rounded-lg p-6 transition text-center cursor-pointer hover:border-yellow-500/50">
        <div class="flex flex-col items-center gap-2">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <div>
            <input
              type="file"
              @change="handleFileSelect"
              :accept="accept"
              multiple
              class="hidden"
              ref="fileInput">
            <button
              type="button"
              @click="$refs.fileInput?.click()"
              class="text-yellow-400 hover:text-yellow-300 font-semibold">
              Click to upload
            </button>
            <span class="text-gray-400"> or drag and drop</span>
          </div>
          <p class="text-xs text-gray-500">
            Max {{ maxFiles }} files, {{ formatFileSize(maxSize) }} each
          </p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="p-3 bg-red-900/30 border-2 border-red-600 rounded-lg">
        <p class="text-sm text-red-400">⚠️ {{ errorMessage }}</p>
      </div>

      <!-- File List -->
      <div v-if="files.length > 0" class="space-y-2">
        <p class="text-xs text-gray-400">{{ files.length }} file(s) selected</p>
        <div class="space-y-2">
          <div
            v-for="(file, index) in files"
            :key="index"
            class="flex items-center justify-between gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path fill-rule="evenodd" d="M3 4a2 2 0 00-2 2v4a1 1 0 001 1h12a1 1 0 001-1V6a2 2 0 00-2-2H3zm11.378 1.555a1 1 0 00-.633-1.066l-4-1a1 1 0 00-1.002.236L7.528 5.43a1 1 0 00-.163 1.263l2 3A1 1 0 0010 9h5a2 2 0 002-2V7a1 1 0 00-1-1h-1.378z" clip-rule="evenodd"/>
              </svg>
              <div class="min-w-0">
                <p class="text-sm text-gray-300 truncate">{{ file.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="removeFile(index)"
              class="text-gray-400 hover:text-red-400 transition flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
