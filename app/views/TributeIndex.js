import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'TributeIndex',
  setup() {
    const router = useRouter();
    const highlights = ref([]);
    const loading = ref(true);
    const error = ref('');
    const searchTerm = ref('');
    const activeCategory = ref('');
    const page = ref(1);
    const totalPages = ref(0);
    const total = ref(0);
    const categoryCounts = ref({});

    const categories = [
      { value: '', label: 'All' },
      { value: 'medal-of-honor', label: 'Medal of Honor' },
      { value: 'wwii', label: 'WWII' },
      { value: 'vietnam', label: 'Vietnam' },
      { value: 'korea', label: 'Korea' },
      { value: 'gulf-war', label: 'Gulf War' },
      { value: 'iraq', label: 'Iraq' },
      { value: 'afghanistan', label: 'Afghanistan' },
      { value: 'modern', label: 'Modern' },
      { value: 'historical', label: 'Historical' },
      { value: 'other', label: 'Other' }
    ];

    const fetchTributes = async () => {
      loading.value = true;
      error.value = '';
      try {
        const params = new URLSearchParams({
          page: page.value,
          limit: 24
        });
        if (activeCategory.value) params.set('category', activeCategory.value);
        if (searchTerm.value) params.set('search', searchTerm.value);

        const response = await window.api.get(`/highlights/public?${params.toString()}`, { auth: false });
        if (response.success) {
          highlights.value = response.data.highlights;
          total.value = response.data.pagination.total;
          totalPages.value = response.data.pagination.pages;
          categoryCounts.value = response.data.categoryCounts || {};
        } else {
          error.value = response.message || 'Failed to load tributes';
        }
      } catch (err) {
        error.value = err.message || 'Failed to load tributes';
      } finally {
        loading.value = false;
      }
    };

    const getCategoryLabel = (cat) => {
      const found = categories.find(c => c.value === cat);
      return found ? found.label : cat;
    };

    const getCategoryCount = (cat) => {
      if (!cat) {
        return Object.values(categoryCounts.value).reduce((sum, c) => sum + c, 0);
      }
      return categoryCounts.value[cat] || 0;
    };

    const setCategory = (cat) => {
      activeCategory.value = cat;
      page.value = 1;
      fetchTributes();
    };

    const onSearch = () => {
      page.value = 1;
      fetchTributes();
    };

    const goToTribute = (id) => {
      router.push(`/tribute/${id}`);
    };

    const goToPage = (p) => {
      if (p >= 1 && p <= totalPages.value) {
        page.value = p;
        fetchTributes();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const getProfileImageUrl = (highlight) => {
      return highlight.media?.profileImage?.url || '';
    };

    const getTypeIcon = (type) => {
      const icons = { person: 'user', unit: 'shield', object: 'star', event: 'calendar', topic: 'book', memorial: 'monument' };
      return icons[type] || 'star';
    };

    onMounted(() => {
      document.title = "Veteran's Scene Tributes";
      fetchTributes();
    });

    return {
      highlights, loading, error, searchTerm, activeCategory,
      page, totalPages, total, categories, categoryCounts,
      getCategoryLabel, getCategoryCount, setCategory,
      onSearch, goToTribute, goToPage, getProfileImageUrl, getTypeIcon, fetchTributes
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <!-- Hero Header -->
      <div class="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700">
        <div class="max-w-7xl mx-auto px-4 py-8 sm:py-12 text-center">
          <h1 class="text-3xl sm:text-5xl font-bold text-yellow-400 mb-3">Veteran's Scene Tributes</h1>
          <p class="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto">Honoring those who served. Explore tributes to military heroes, Medal of Honor recipients, and the stories that shaped our nation.</p>

          <!-- Search -->
          <div class="max-w-lg mx-auto mt-6">
            <div class="flex gap-2">
              <input
                v-model="searchTerm"
                @keyup.enter="onSearch"
                type="text"
                placeholder="Search tributes..."
                class="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              <button @click="onSearch" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-3 rounded-lg transition">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Category Filter Chips -->
        <div class="flex flex-wrap gap-2 mb-6 justify-center">
          <button
            v-for="cat in categories"
            :key="cat.value"
            @click="setCategory(cat.value)"
            :class="[
              'px-3 py-1.5 rounded-full text-sm font-medium transition border',
              activeCategory === cat.value
                ? 'bg-yellow-600 text-white border-yellow-600'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-yellow-500 hover:text-yellow-400'
            ]"
          >
            {{ cat.label }}
            <span v-if="getCategoryCount(cat.value)" class="ml-1 text-xs opacity-75">({{ getCategoryCount(cat.value) }})</span>
          </button>
        </div>

        <!-- Results count -->
        <p v-if="!loading && total > 0" class="text-gray-500 text-sm mb-4">
          {{ total }} tribute{{ total !== 1 ? 's' : '' }} found
        </p>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading tributes...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 rounded-lg p-4 mb-6 text-center">
          <p class="text-red-200">{{ error }}</p>
        </div>

        <!-- Grid -->
        <div v-else-if="highlights.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <div
            v-for="h in highlights"
            :key="h._id"
            @click="goToTribute(h._id)"
            class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden cursor-pointer hover:border-yellow-500 transition hover:shadow-lg hover:shadow-yellow-500/10 group"
          >
            <!-- Image -->
            <div class="w-full h-48 sm:h-56 bg-gray-900 overflow-hidden relative">
              <img
                v-if="getProfileImageUrl(h)"
                :src="getProfileImageUrl(h)"
                aria-hidden="true"
                class="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
              />
              <img
                v-if="getProfileImageUrl(h)"
                :src="getProfileImageUrl(h)"
                :alt="h.title"
                class="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
                <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <!-- Category badge -->
              <span v-if="h.category" class="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded font-medium">
                {{ getCategoryLabel(h.category) }}
              </span>
              <!-- Featured star -->
              <span v-if="h.displaySettings?.featured" class="absolute top-2 left-2 text-yellow-400 text-lg">&#9733;</span>
            </div>

            <!-- Content -->
            <div class="p-4">
              <h3 class="text-lg font-bold text-yellow-400 group-hover:text-yellow-300 transition line-clamp-2 mb-1">{{ h.title }}</h3>
              <p v-if="h.personInfo?.rank || h.personInfo?.branch" class="text-sm text-gray-400 mb-2">
                {{ h.personInfo.rank }}<span v-if="h.personInfo.rank && h.personInfo.branch"> &bull; </span>{{ h.personInfo.branch }}
              </p>
              <p v-if="h.aiContent?.biographyBrief" class="text-gray-400 text-sm line-clamp-3">{{ h.aiContent.biographyBrief }}</p>
              <p v-else-if="h.description" class="text-gray-400 text-sm line-clamp-3">{{ h.description }}</p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-16">
          <p class="text-gray-400 text-lg mb-2">No tributes found</p>
          <p class="text-gray-500 text-sm">Try a different search or category filter.</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
          <button
            @click="goToPage(page - 1)"
            :disabled="page === 1"
            class="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            &larr; Prev
          </button>
          <span class="text-gray-400 text-sm">Page {{ page }} of {{ totalPages }}</span>
          <button
            @click="goToPage(page + 1)"
            :disabled="page === totalPages"
            class="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  `
};
