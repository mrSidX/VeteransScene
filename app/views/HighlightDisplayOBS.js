import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'HighlightDisplayOBS',
  setup() {
    const route = useRoute();
    const highlightId = route.params.id;

    const highlight = ref(null);
    const currentSlide = ref(0);
    const slideTimer = ref(null);
    const loading = ref(true);
    const error = ref('');

    const slides = computed(() => {
      if (!highlight.value) return [];
      const slideList = [];

      // Slide 1: Biography
      slideList.push({
        id: 'bio',
        title: 'Biography',
        type: 'bio',
        content: highlight.value.aiContent?.biographyBrief ||
                 highlight.value.aiContent?.biography ||
                 highlight.value.description ||
                 'Dedicated military service member'
      });

      // Slide 2: Key Facts (or use regular facts if keyFacts is empty)
      const factsToShow = (highlight.value.aiContent?.keyFacts && highlight.value.aiContent.keyFacts.length > 0)
        ? highlight.value.aiContent.keyFacts.slice(0, 4)  // Limit to 4 items to fit on screen
        : (highlight.value.aiContent?.facts && highlight.value.aiContent.facts.length > 0)
          ? highlight.value.aiContent.facts.slice(0, 4).map(f => ({ text: f.text, icon: '⭐' }))
          : [];

      if (factsToShow.length > 0) {
        slideList.push({
          id: 'facts',
          title: 'Key Facts',
          type: 'facts',
          content: factsToShow
        });
      }

      // Slide 3: Achievements (or use timeline if achievements is empty)
      const achievementsToShow = (highlight.value.aiContent?.achievements && highlight.value.aiContent.achievements.length > 0)
        ? highlight.value.aiContent.achievements.slice(0, 3)  // Limit to 3 items to fit on screen
        : (highlight.value.aiContent?.timeline && highlight.value.aiContent.timeline.length > 0)
          ? highlight.value.aiContent.timeline.slice(0, 3).map(t => ({
              title: t.event || t.date,
              description: t.description,
              date: t.date
            }))
          : [];

      if (achievementsToShow.length > 0) {
        slideList.push({
          id: 'achievements',
          title: 'Achievements & Honors',
          type: 'achievements',
          content: achievementsToShow
        });
      }

      // Slide 4+: Gallery Images
      if (highlight.value.media?.gallery && highlight.value.media.gallery.length > 0) {
        highlight.value.media.gallery.forEach((img, idx) => {
          slideList.push({
            id: `gallery-${idx}`,
            title: img.caption || `Image ${idx + 1}`,
            type: 'gallery',
            content: img
          });
        });
      }

      // Final Slide: Sources (if available)
      const sourcesToShow = (highlight.value.aiContent?.sources && highlight.value.aiContent.sources.length > 0)
        ? highlight.value.aiContent.sources.slice(0, 3)  // Show top 3 sources only
        : [];

      if (sourcesToShow.length > 0) {
        slideList.push({
          id: 'sources',
          title: 'Sources',
          type: 'sources',
          content: sourcesToShow
        });
      }

      // If we only have biography, that's fine - show it alone
      return slideList;
    });

    const slideDuration = computed(() => {
      const duration = highlight.value?.displaySettings?.slideshowDuration || 10;
      return duration * 1000; // Convert to milliseconds
    });

    const fetchHighlight = async () => {
      try {
        loading.value = true;
        error.value = '';
        console.log(`[OBS] Loading highlight: ${highlightId}`);
        // Use the public OBS endpoint (no auth required)
        const response = await api.get(`/highlights/obs/${highlightId}`, { auth: false });
        console.log(`[OBS] Full API Response:`, response);
        if (response.success) {
          highlight.value = response.data.highlight;
          console.log(`[OBS] Highlight loaded:`, highlight.value.title);
          console.log(`[OBS] Profile image data:`, highlight.value.media?.profileImage);
          console.log(`[OBS] Gallery images:`, highlight.value.media?.gallery);
          startSlideshow();
        } else {
          error.value = response.message || 'Failed to load highlight';
          console.error(`[OBS] Error: ${error.value}`);
        }
      } catch (err) {
        error.value = err.message || 'Error loading highlight';
        console.error('[OBS] Error:', err);
      } finally {
        loading.value = false;
      }
    };

    const startSlideshow = () => {
      slideTimer.value = setInterval(() => {
        currentSlide.value = (currentSlide.value + 1) % slides.value.length;
      }, slideDuration.value);
    };

    const stopSlideshow = () => {
      if (slideTimer.value) {
        clearInterval(slideTimer.value);
      }
    };

    const goToSlide = (index) => {
      currentSlide.value = index;
      // Reset timer so it waits full duration before auto-advancing
      stopSlideshow();
      startSlideshow();
    };

    const getImageUrl = (imageObj) => {
      if (!imageObj) return '';
      if (typeof imageObj === 'string') return imageObj;
      return imageObj.url || '';
    };

    const getImageStyle = (image) => {
      const positioning = image?.positioning || { offsetX: 0, offsetY: 0, zoom: 100 };
      const style = {
        objectFit: 'cover',
        objectPosition: `${50 + positioning.offsetX}% ${50 + positioning.offsetY}%`,
        transform: `scale(${positioning.zoom / 100})`,
        transformOrigin: 'center'
      };
      console.log('[OBS] Image positioning:', { image: image?.url || 'unknown', positioning, style });
      return style;
    };

    onMounted(() => {
      fetchHighlight();
    });

    onUnmounted(() => {
      stopSlideshow();
    });

    return {
      highlight,
      currentSlide,
      slides,
      slideDuration,
      loading,
      error,
      getImageUrl,
      getImageStyle,
      goToSlide
    };
  },

  template: `
    <!-- Loading State -->
    <div v-if="loading" class="obs-display loading">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="obs-display error">
      <div class="error-box">
        <h2>Error Loading Highlight</h2>
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- Main Display -->
    <div v-else-if="highlight" class="obs-display">
      <!-- Fixed Profile Image (Left 30%) -->
      <div class="profile-section">
        <div v-if="highlight.media?.profileImage?.url" class="profile-image-container">
          <img
            :src="getImageUrl(highlight.media.profileImage)"
            :alt="highlight.media.profileImage?.altText || highlight.title"
            :style="getImageStyle(highlight.media.profileImage)"
            class="profile-image"
          />
        </div>
        <div v-else class="profile-placeholder">
          <div class="placeholder-text">No Image</div>
        </div>
      </div>

      <!-- Rotating Content (Right 70%) -->
      <div class="content-section">
        <!-- Header (Always Visible) -->
        <div class="header">
          <h1 class="title">{{ highlight.title }}</h1>
          <p v-if="highlight.personInfo" class="subtitle">
            {{ highlight.personInfo.rank }}<span v-if="highlight.personInfo.rank && highlight.personInfo.branch"> • </span>{{ highlight.personInfo.branch }}
          </p>
        </div>

        <!-- Dynamic Slides - Sequential fade: out then in -->
        <transition name="fade" mode="out-in">
          <div v-if="slides.length > 0" :key="'slide-' + currentSlide" class="slide">
            <!-- Slide 1-3: Text Content -->
            <template v-if="slides[currentSlide].type === 'bio'">
              <div class="slide-bio">
                <h2 class="slide-title">{{ slides[currentSlide].title }}</h2>
                <p class="slide-content">{{ slides[currentSlide].content }}</p>
              </div>
            </template>

            <!-- Facts Slide -->
            <template v-else-if="slides[currentSlide].type === 'facts'">
              <div class="slide-facts">
                <h2 class="slide-title">{{ slides[currentSlide].title }}</h2>
                <ul class="facts-list">
                  <li v-for="(fact, index) in slides[currentSlide].content" :key="index" class="fact-item">
                    <span class="fact-icon">{{ fact.icon || '🎖️' }}</span>
                    <span class="fact-text">{{ fact.text }}</span>
                  </li>
                </ul>
              </div>
            </template>

            <!-- Achievements Slide -->
            <template v-else-if="slides[currentSlide].type === 'achievements'">
              <div class="slide-achievements">
                <h2 class="slide-title">{{ slides[currentSlide].title }}</h2>
                <div class="achievements-list">
                  <div v-for="(achievement, index) in slides[currentSlide].content" :key="index" class="achievement">
                    <div class="achievement-title">{{ achievement.title }}</div>
                    <div v-if="achievement.date" class="achievement-date">{{ achievement.date }}</div>
                    <div v-if="achievement.description" class="achievement-desc">{{ achievement.description }}</div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Gallery Image Slide -->
            <template v-else-if="slides[currentSlide].type === 'gallery'">
              <div class="slide-gallery">
                <div class="gallery-image-container">
                  <img
                    :src="getImageUrl(slides[currentSlide].content)"
                    :alt="slides[currentSlide].content.altText || 'Gallery image'"
                    :style="getImageStyle(slides[currentSlide].content)"
                    class="gallery-image"
                  />
                </div>
                <div v-if="slides[currentSlide].content.caption" class="gallery-caption">
                  {{ slides[currentSlide].content.caption }}
                </div>
              </div>
            </template>

            <!-- Sources Slide -->
            <template v-else-if="slides[currentSlide].type === 'sources'">
              <div class="slide-sources">
                <h2 class="slide-title">{{ slides[currentSlide].title }}</h2>
                <ul class="sources-list">
                  <li v-for="(source, idx) in slides[currentSlide].content" :key="idx" class="source-item">
                    <span class="source-label">📚</span>
                    <span class="source-text">{{ source.title }}</span>
                  </li>
                </ul>
              </div>
            </template>
          </div>
        </transition>

        <!-- Progress Indicator -->
        <div v-if="slides.length > 1" class="progress-dots">
          <span
            v-for="(slide, idx) in slides"
            :key="idx"
            :class="['dot', { active: currentSlide === idx }]"
            :title="(idx + 1) + '. ' + slide.title"
            @click="goToSlide(idx)"
            role="button"
            tabindex="0"
          ></span>
        </div>
      </div>

      <!-- Veterans Scene Branding -->
      <div class="obs-branding">
        <div class="obs-logo">
          <img src="/assets/img/vs-logo.jpg" alt="Veterans Scene Logo" class="logo-image" />
        </div>
        <div class="obs-website">VeteransScene.org</div>
      </div>
    </div>
  `
};
