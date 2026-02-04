import { BRANCH_CONFIG } from '../config/branches.js';

export default {
  name: 'BranchSelector',
  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    required: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      default: 'Military Branch'
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      BRANCH_CONFIG: BRANCH_CONFIG,
      selected: this.modelValue || []
    };
  },
  watch: {
    modelValue(newValue) {
      this.selected = newValue || [];
    }
  },
  methods: {
    toggleBranch(branchId) {
      const index = this.selected.indexOf(branchId);
      if (index > -1) {
        this.selected.splice(index, 1);
      } else {
        this.selected.push(branchId);
      }
      this.$emit('update:modelValue', [...this.selected]);
    },
    isSelected(branchId) {
      return this.selected.includes(branchId);
    }
  },
  template: `
    <div class="branch-selector">
      <label class="block text-sm font-medium text-gray-700 mb-3">
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
      </label>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
        <div
          v-for="branch in BRANCH_CONFIG"
          :key="branch.id"
          @click="toggleBranch(branch.id)"
          :class="[
            'relative p-4 rounded-lg border-2 cursor-pointer transition-all',
            'hover:scale-105',
            isSelected(branch.id)
              ? 'border-yellow-400 bg-yellow-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          ]"
        >
          <!-- Checkmark indicator -->
          <div
            v-if="isSelected(branch.id)"
            class="absolute top-2 right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center"
          >
            <svg
              class="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>

          <!-- Logo image -->
          <img
            :src="branch.logo"
            :alt="branch.name"
            class="h-20 mx-auto mb-2 object-contain"
            :style="{ opacity: isSelected(branch.id) ? 1 : 0.7 }"
          />

          <!-- Branch name -->
          <p
            :class="[
              'text-center text-sm font-medium',
              isSelected(branch.id)
                ? 'text-yellow-600'
                : 'text-gray-600'
            ]"
          >
            {{ branch.name }}
          </p>
        </div>
      </div>

      <!-- Selection count or empty state -->
      <p v-if="selected.length > 0" class="text-sm text-gray-600">
        {{ selected.length }} branch{{ selected.length !== 1 ? 'es' : '' }} selected
      </p>
      <p v-else-if="!required" class="text-sm text-gray-500 italic">
        No branches selected (optional)
      </p>
    </div>
  `
};
