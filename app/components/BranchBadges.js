import { BRANCH_CONFIG, getBranchName } from '../config/branches.js';

export default {
  name: 'BranchBadges',
  props: {
    branches: {
      type: Array,
      default: () => []
    },
    size: {
      type: String,
      enum: ['sm', 'md', 'lg'],
      default: 'md'
    }
  },
  data() {
    return {
      BRANCH_CONFIG: BRANCH_CONFIG
    };
  },
  computed: {
    sizeClasses() {
      const sizes = {
        sm: 'h-8',
        md: 'h-12',
        lg: 'h-16'
      };
      return sizes[this.size];
    },
    sizeGap() {
      const gaps = {
        sm: 'gap-2',
        md: 'gap-3',
        lg: 'gap-4'
      };
      return gaps[this.size];
    }
  },
  methods: {
    getBranchData(branchId) {
      return BRANCH_CONFIG.find(b => b.id === branchId);
    }
  },
  template: `
    <div>
      <div v-if="branches && branches.length > 0" :class="['flex flex-wrap items-center', sizeGap]">
        <div
          v-for="branchId in branches"
          :key="branchId"
          class="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1"
        >
          <img
            v-if="getBranchData(branchId)"
            :src="getBranchData(branchId).logo"
            :alt="getBranchData(branchId).name"
            :class="['object-contain mr-2', sizeClasses]"
          />
          <span class="text-sm font-medium text-gray-700">
            {{ getBranchData(branchId)?.name || branchId }}
          </span>
        </div>
      </div>
      <div v-else class="text-gray-500 text-sm">
        No branch specified
      </div>
    </div>
  `
};
