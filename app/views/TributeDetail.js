import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'TributeDetail',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const tributeId = route.params.id;

    const highlight = ref(null);
    const loading = ref(true);
    const error = ref('');

    // Hero slideshow state
    const currentSlide = ref(0);
    const slideTimer = ref(null);

    const BIO_CHAR_LIMIT = 300;

    const truncate = (text, limit) => {
      if (!text || text.length <= limit) return text;
      const trimmed = text.substring(0, limit);
      const lastSpace = trimmed.lastIndexOf(' ');
      return (lastSpace > limit * 0.6 ? trimmed.substring(0, lastSpace) : trimmed) + '...';
    };

    const heroSlides = computed(() => {
      if (!highlight.value) return [];
      const slides = [];

      // Bio brief
      const bio = highlight.value.aiContent?.biographyBrief ||
                  truncate(highlight.value.aiContent?.biography, BIO_CHAR_LIMIT) ||
                  highlight.value.description || '';
      if (bio) {
        slides.push({ id: 'bio', title: 'Biography', type: 'bio', content: bio });
      }

      // Key facts (max 4)
      const facts = (highlight.value.aiContent?.keyFacts?.length
        ? highlight.value.aiContent.keyFacts
        : highlight.value.aiContent?.facts?.map(f => ({ text: f.text, icon: '&#9733;' })) || []
      ).slice(0, 4);
      if (facts.length) {
        slides.push({ id: 'facts', title: 'Key Facts', type: 'facts', content: facts });
      }

      // Achievements (max 3)
      const achievements = (highlight.value.aiContent?.achievements?.length
        ? highlight.value.aiContent.achievements
        : highlight.value.aiContent?.timeline?.map(t => ({ title: t.event || t.date, description: t.description, date: t.date })) || []
      ).slice(0, 3);
      if (achievements.length) {
        slides.push({ id: 'achievements', title: 'Achievements & Honors', type: 'achievements', content: achievements });
      }

      return slides;
    });

    const slideDuration = computed(() => {
      return (highlight.value?.displaySettings?.slideshowDuration || 10) * 1000;
    });

    const startSlideshow = () => {
      if (heroSlides.value.length <= 1) return;
      slideTimer.value = setInterval(() => {
        currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length;
      }, slideDuration.value);
    };

    const stopSlideshow = () => {
      if (slideTimer.value) clearInterval(slideTimer.value);
    };

    const goToSlide = (idx) => {
      currentSlide.value = idx;
      stopSlideshow();
      startSlideshow();
    };

    const fetchTribute = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await window.api.get(`/highlights/public/${tributeId}`, { auth: false });
        if (response.success) {
          highlight.value = response.data.highlight;
          document.title = `Veteran's Scene Tributes: ${highlight.value.title}`;
          startSlideshow();
        } else {
          error.value = response.message || 'Tribute not found';
        }
      } catch (err) {
        error.value = err.message || 'Error loading tribute';
      } finally {
        loading.value = false;
      }
    };

    const getImageUrl = (imgObj) => {
      if (!imgObj) return '';
      return typeof imgObj === 'string' ? imgObj : imgObj.url || '';
    };

    const getImageStyle = (image) => {
      const p = image?.positioning || { offsetX: 0, offsetY: 0, zoom: 100 };
      return {
        objectFit: 'cover',
        objectPosition: `${50 + p.offsetX}% ${50 + p.offsetY}%`,
        transform: `scale(${p.zoom / 100})`,
        transformOrigin: 'center'
      };
    };

    const shareUrl = () => {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    };

    const getCategoryLabel = (cat) => {
      const labels = {
        'wwii': 'World War II', 'vietnam': 'Vietnam War', 'korea': 'Korean War',
        'gulf-war': 'Gulf War', 'iraq': 'Iraq War', 'afghanistan': 'Afghanistan',
        'modern': 'Modern', 'medal-of-honor': 'Medal of Honor', 'historical': 'Historical', 'other': 'Other'
      };
      return labels[cat] || cat;
    };

    onMounted(() => {
      fetchTribute();
      // Add fade transition CSS if not already present
      if (!document.getElementById('tribute-fade-css')) {
        const style = document.createElement('style');
        style.id = 'tribute-fade-css';
        style.textContent = `.fade-enter-active{transition:opacity .6s ease}.fade-leave-active{transition:opacity .4s ease}.fade-enter-from,.fade-leave-to{opacity:0}`;
        document.head.appendChild(style);
      }
    });
    onUnmounted(() => { stopSlideshow(); });

    return {
      highlight, loading, error, currentSlide, heroSlides,
      goToSlide, getImageUrl, getImageStyle, shareUrl, getCategoryLabel, router
    };
  },

  template: `
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen bg-gray-900 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
        <p class="text-gray-400">Loading tribute...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <h2 class="text-2xl font-bold text-red-400 mb-4">Tribute Not Found</h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <router-link to="/tributes" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition">
          Browse All Tributes
        </router-link>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="highlight" class="min-h-screen bg-gray-900 text-gray-100">

      <!-- Hero Section -->
      <div class="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row" style="min-height: 400px; max-height: 540px;">

            <!-- Profile Image (Left) -->
            <div class="w-full md:w-1/3 bg-black/40 flex items-center justify-center overflow-hidden" style="min-height: 280px;">
              <img
                v-if="highlight.media?.profileImage?.url"
                :src="getImageUrl(highlight.media.profileImage)"
                :alt="highlight.media?.profileImage?.altText || highlight.title"
                :style="getImageStyle(highlight.media.profileImage)"
                class="w-full h-full object-cover"
              />
              <div v-else class="text-gray-600 flex items-center justify-center w-full h-full">
                <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
            </div>

            <!-- Rotating Content (Right) -->
            <div class="flex-1 flex flex-col p-6 md:p-8 relative overflow-hidden">
              <!-- Header -->
              <div class="mb-4 border-b-2 border-yellow-600 pb-3">
                <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-400 leading-tight">{{ highlight.title }}</h1>
                <p v-if="highlight.personInfo?.rank || highlight.personInfo?.branch" class="text-lg text-yellow-600 mt-1">
                  {{ highlight.personInfo.rank }}<span v-if="highlight.personInfo.rank && highlight.personInfo.branch"> &bull; </span>{{ highlight.personInfo.branch }}
                </p>
              </div>

              <!-- Slides -->
              <div v-if="heroSlides.length > 0" class="flex-1 overflow-hidden relative">
                <transition name="fade" mode="out-in">
                  <div :key="'slide-' + currentSlide" class="h-full">

                    <!-- Bio Slide -->
                    <template v-if="heroSlides[currentSlide]?.type === 'bio'">
                      <div>
                        <h3 class="text-sm font-bold text-yellow-600 uppercase tracking-wider mb-2">{{ heroSlides[currentSlide].title }}</h3>
                        <p class="text-gray-200 text-base sm:text-lg leading-relaxed line-clamp-6">{{ heroSlides[currentSlide].content }}</p>
                      </div>
                    </template>

                    <!-- Facts Slide -->
                    <template v-else-if="heroSlides[currentSlide]?.type === 'facts'">
                      <div>
                        <h3 class="text-sm font-bold text-yellow-600 uppercase tracking-wider mb-3">{{ heroSlides[currentSlide].title }}</h3>
                        <ul class="space-y-2">
                          <li v-for="(fact, i) in heroSlides[currentSlide].content" :key="i" class="flex items-start gap-2">
                            <span class="text-lg flex-shrink-0" v-html="fact.icon || '&#127894;'"></span>
                            <span class="text-gray-200 text-sm sm:text-base">{{ fact.text }}</span>
                          </li>
                        </ul>
                      </div>
                    </template>

                    <!-- Achievements Slide -->
                    <template v-else-if="heroSlides[currentSlide]?.type === 'achievements'">
                      <div>
                        <h3 class="text-sm font-bold text-yellow-600 uppercase tracking-wider mb-3">{{ heroSlides[currentSlide].title }}</h3>
                        <div class="space-y-3">
                          <div v-for="(a, i) in heroSlides[currentSlide].content" :key="i" class="border-l-2 border-yellow-600 pl-3">
                            <p class="font-semibold text-yellow-400 text-sm sm:text-base">{{ a.title }}</p>
                            <p v-if="a.date" class="text-xs text-gray-500">{{ a.date }}</p>
                            <p v-if="a.description" class="text-gray-300 text-sm line-clamp-2">{{ a.description }}</p>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </transition>
              </div>

              <!-- Progress Dots -->
              <div v-if="heroSlides.length > 1" class="flex gap-2 mt-3 justify-end">
                <span
                  v-for="(s, idx) in heroSlides"
                  :key="idx"
                  @click="goToSlide(idx)"
                  :class="[
                    'w-2.5 h-2.5 rounded-full cursor-pointer transition-all',
                    currentSlide === idx ? 'bg-yellow-400 scale-125' : 'bg-gray-600 hover:bg-gray-500'
                  ]"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Article Content -->
      <div class="max-w-4xl mx-auto px-4 py-8 sm:py-12">

        <!-- Navigation & Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-8">
          <router-link to="/tributes" class="text-yellow-400 hover:text-yellow-300 font-medium text-sm">
            &larr; All Tributes
          </router-link>
          <div class="flex gap-2">
            <span v-if="highlight.category" class="bg-yellow-600/20 text-yellow-400 text-xs px-3 py-1 rounded-full font-medium border border-yellow-600/30">
              {{ getCategoryLabel(highlight.category) }}
            </span>
            <button @click="shareUrl" class="text-gray-400 hover:text-yellow-400 text-sm flex items-center gap-1 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              Share
            </button>
          </div>
        </div>

        <!-- Person Info Banner -->
        <div v-if="highlight.personInfo && (highlight.personInfo.fullName || highlight.personInfo.rank)" class="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 mb-8">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div v-if="highlight.personInfo.fullName">
              <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Full Name</p>
              <p class="text-gray-100 font-medium">{{ highlight.personInfo.fullName }}</p>
            </div>
            <div v-if="highlight.personInfo.rank">
              <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Rank</p>
              <p class="text-gray-100 font-medium">{{ highlight.personInfo.rank }}</p>
            </div>
            <div v-if="highlight.personInfo.branch">
              <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Branch</p>
              <p class="text-gray-100 font-medium">{{ highlight.personInfo.branch }}</p>
            </div>
            <div v-if="highlight.personInfo.yearsOfService?.start">
              <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Service</p>
              <p class="text-gray-100 font-medium">{{ highlight.personInfo.yearsOfService.start }}{{ highlight.personInfo.yearsOfService.end ? ' - ' + highlight.personInfo.yearsOfService.end : '+' }}</p>
            </div>
          </div>
        </div>

        <!-- Full Biography -->
        <section v-if="highlight.aiContent?.biography" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Biography</h2>
          <div class="text-gray-300 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">{{ highlight.aiContent.biography }}</div>
        </section>

        <!-- Facts -->
        <section v-if="highlight.aiContent?.facts?.length" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Key Facts</h2>
          <div class="grid gap-3">
            <div v-for="(fact, i) in highlight.aiContent.facts" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p class="text-gray-200">{{ fact.text }}</p>
              <p v-if="fact.source" class="text-gray-500 text-sm mt-1 italic">&mdash; {{ fact.source }}</p>
            </div>
          </div>
        </section>

        <!-- Achievements -->
        <section v-if="highlight.aiContent?.achievements?.length" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Achievements & Honors</h2>
          <div class="space-y-4">
            <div v-for="(a, i) in highlight.aiContent.achievements" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-4 border-l-4 border-l-yellow-600">
              <p class="font-semibold text-yellow-400">{{ a.title }}</p>
              <p v-if="a.date" class="text-sm text-gray-500 mt-1">{{ a.date }}</p>
              <p v-if="a.description" class="text-gray-300 mt-2">{{ a.description }}</p>
            </div>
          </div>
        </section>

        <!-- Notable Quotes -->
        <section v-if="highlight.aiContent?.quotes?.length" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Notable Quotes</h2>
          <div class="space-y-4">
            <blockquote v-for="(q, i) in highlight.aiContent.quotes" :key="i" class="border-l-4 border-yellow-600 pl-4 py-2">
              <p class="text-gray-200 italic text-lg">"{{ q.text }}"</p>
              <cite v-if="q.context" class="text-gray-500 text-sm mt-2 block not-italic">&mdash; {{ q.context }}</cite>
            </blockquote>
          </div>
        </section>

        <!-- Timeline -->
        <section v-if="highlight.aiContent?.timeline?.length" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Timeline</h2>
          <div class="relative pl-6 border-l-2 border-gray-700 space-y-6">
            <div v-for="(t, i) in highlight.aiContent.timeline" :key="i" class="relative">
              <div class="absolute -left-8 top-1 w-4 h-4 bg-yellow-600 rounded-full border-2 border-gray-900"></div>
              <p class="text-yellow-400 font-semibold text-sm">{{ t.date }}</p>
              <p v-if="t.event" class="text-gray-100 font-medium mt-1">{{ t.event }}</p>
              <p v-if="t.description" class="text-gray-400 mt-1 text-sm">{{ t.description }}</p>
            </div>
          </div>
        </section>

        <!-- Gallery -->
        <section v-if="highlight.media?.gallery?.length" class="mb-10">
          <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Gallery</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="(img, i) in highlight.media.gallery" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <img :src="getImageUrl(img)" :alt="img.altText || 'Gallery image'" class="w-full h-48 sm:h-64 object-cover" />
              <p v-if="img.caption" class="p-3 text-sm text-gray-400">{{ img.caption }}</p>
            </div>
          </div>
        </section>

        <!-- Sources -->
        <section v-if="highlight.aiContent?.sources?.length" class="mb-10">
          <h2 class="text-xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Sources & References</h2>
          <ul class="space-y-2">
            <li v-for="(s, i) in highlight.aiContent.sources" :key="i" class="text-sm">
              <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300">
                {{ s.title || s.url }}
              </a>
              <span v-else class="text-gray-400">{{ s.title }}</span>
            </li>
          </ul>
        </section>

        <!-- Footer -->
        <div class="border-t border-gray-700 pt-6 text-center">
          <router-link to="/tributes" class="text-yellow-400 hover:text-yellow-300 font-medium">
            &larr; Browse All Tributes
          </router-link>
        </div>
      </div>
    </div>
  `
};
