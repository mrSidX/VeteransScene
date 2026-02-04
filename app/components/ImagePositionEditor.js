import { ref, computed } from 'vue';

export default {
  name: 'ImagePositionEditor',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    imageUrl: {
      type: String,
      required: true
    },
    imageType: {
      type: String,
      required: true
    },
    currentPosition: {
      type: Object,
      default: () => ({ offsetX: 0, offsetY: 0, zoom: 100 })
    }
  },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const offsetX = ref(props.currentPosition?.offsetX || 0);
    const offsetY = ref(props.currentPosition?.offsetY || 0);
    const zoom = ref(props.currentPosition?.zoom || 100);

    const imageStyle = computed(() => ({
      objectFit: 'cover',
      objectPosition: `${50 + offsetX.value}% ${50 + offsetY.value}%`,
      transform: `scale(${zoom.value / 100})`,
      transformOrigin: 'center',
      width: '100%',
      height: '100%'
    }));

    const resetToDefault = () => {
      offsetX.value = 0;
      offsetY.value = 0;
      zoom.value = 100;
    };

    const handleSave = () => {
      emit('save', {
        offsetX: offsetX.value,
        offsetY: offsetY.value,
        zoom: zoom.value
      });
    };

    const handleClose = () => {
      emit('close');
    };

    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    };

    return {
      offsetX,
      offsetY,
      zoom,
      imageStyle,
      resetToDefault,
      handleSave,
      handleClose,
      handleBackdropClick
    };
  },

  template: `
    <div
      v-if="show"
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      @click="handleBackdropClick"
    >
      <!-- Modal Container -->
      <div class="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
          <h2 class="text-2xl font-bold text-yellow-400">Adjust Image Position</h2>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>

        <!-- Live Preview (Matches OBS aspect ratio: 576:1080) -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-3">Live Preview (OBS Profile Aspect Ratio)</label>
          <div class="flex justify-center">
            <div class="bg-gray-900 rounded overflow-hidden border-2 border-gray-700 flex items-center justify-center" style="width: 205px; height: 384px;">
              <img
                :src="imageUrl"
                :style="imageStyle"
                alt="Position preview"
                class="w-full h-full"
                @error="$event.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22205%22 height=%22384%22%3E%3Crect fill=%22%23333%22 width=%22205%22 height=%22384%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E'"
              />
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2 text-center">Profile image aspect ratio (576×1080 scaled)</p>
        </div>

        <!-- Controls -->
        <div class="space-y-6 mb-6">
          <!-- Horizontal Pan -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Horizontal Pan: <span class="text-yellow-400">{{ offsetX }}%</span>
            </label>
            <input
              v-model.number="offsetX"
              type="range"
              min="-100"
              max="100"
              step="1"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>← Left</span>
              <span>Center</span>
              <span>Right →</span>
            </div>
          </div>

          <!-- Vertical Pan -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Vertical Pan: <span class="text-yellow-400">{{ offsetY }}%</span>
            </label>
            <input
              v-model.number="offsetY"
              type="range"
              min="-100"
              max="100"
              step="1"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>↑ Top</span>
              <span>Center</span>
              <span>Bottom ↓</span>
            </div>
          </div>

          <!-- Zoom -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Zoom: <span class="text-yellow-400">{{ zoom }}%</span>
            </label>
            <input
              v-model.number="zoom"
              type="range"
              min="100"
              max="300"
              step="5"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>100% (Original)</span>
              <span>200% (2x)</span>
              <span>300% (3x)</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-end">
          <button
            @click="resetToDefault"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Reset to Default
          </button>
          <button
            @click="handleClose"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded transition"
          >
            Save Position
          </button>
        </div>
      </div>
    </div>

    <style scoped>
      /* Custom range slider styling */
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        transition: background 0.15s ease-in-out;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        background: #f59e0b;
      }

      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease-in-out;
      }

      input[type="range"]::-moz-range-thumb:hover {
        background: #f59e0b;
      }

      input[type="range"]::-webkit-slider-runnable-track {
        background: #374151;
        height: 8px;
        border-radius: 4px;
      }

      input[type="range"]::-moz-range-track {
        background: transparent;
        border: none;
      }

      input[type="range"]::-moz-range-progress {
        background: #4b5563;
        height: 8px;
        border-radius: 4px;
      }
    </style>
  `
};
