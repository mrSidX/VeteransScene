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

    // Max characters that fit on a single OBS slide (tuned for 1920x1080)
    const BIO_CHAR_LIMIT = 380;
    const FACT_TEXT_LIMIT = 120;
    const ACHIEVEMENT_DESC_LIMIT = 150;

    // Split long text into chunks that fit on individual slides
    const splitText = (text, limit) => {
      if (!text || text.length <= limit) return [text];
      const chunks = [];
      // Split on sentence boundaries where possible
      const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
      let current = '';
      for (const sentence of sentences) {
        if ((current + sentence).length > limit && current.length > 0) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
      // Safety: if any chunk is still too long (no sentence breaks), hard split
      const result = [];
      for (const chunk of chunks) {
        if (chunk.length <= limit) {
          result.push(chunk);
        } else {
          for (let i = 0; i < chunk.length; i += limit) {
            const sub = chunk.substring(i, i + limit);
            // Try to break at last space
            if (i + limit < chunk.length) {
              const lastSpace = sub.lastIndexOf(' ');
              if (lastSpace > limit * 0.6) {
                result.push(sub.substring(0, lastSpace).trim());
                i = i - (limit - lastSpace); // backtrack
                continue;
              }
            }
            result.push(sub.trim());
          }
        }
      }
      return result.filter(c => c.length > 0);
    };

    // Truncate a single string with ellipsis
    const truncate = (text, limit) => {
      if (!text || text.length <= limit) return text;
      const trimmed = text.substring(0, limit);
      const lastSpace = trimmed.lastIndexOf(' ');
      return (lastSpace > limit * 0.6 ? trimmed.substring(0, lastSpace) : trimmed) + '…';
    };

    const slides = computed(() => {
      if (!highlight.value) return [];
      const slideList = [];

      // Biography — split into multiple slides if long
      const bioText = highlight.value.aiContent?.biographyBrief ||
                      highlight.value.aiContent?.biography ||
                      highlight.value.description ||
                      'Dedicated military service member';
      const bioChunks = splitText(bioText, BIO_CHAR_LIMIT);
      bioChunks.forEach((chunk, idx) => {
        slideList.push({
          id: bioChunks.length > 1 ? `bio-${idx}` : 'bio',
          title: bioChunks.length > 1 ? `Biography (${idx + 1}/${bioChunks.length})` : 'Biography',
          type: 'bio',
          content: chunk
        });
      });

      // Key Facts — truncate individual fact text to prevent overflow
      const factsToShow = (highlight.value.aiContent?.keyFacts && highlight.value.aiContent.keyFacts.length > 0)
        ? highlight.value.aiContent.keyFacts.slice(0, 4)
        : (highlight.value.aiContent?.facts && highlight.value.aiContent.facts.length > 0)
          ? highlight.value.aiContent.facts.slice(0, 4).map(f => ({ text: f.text, icon: '⭐' }))
          : [];

      if (factsToShow.length > 0) {
        // Truncate each fact to prevent overflow
        const clampedFacts = factsToShow.map(f => ({
          ...f,
          text: truncate(f.text, FACT_TEXT_LIMIT)
        }));
        slideList.push({
          id: 'facts',
          title: 'Key Facts',
          type: 'facts',
          content: clampedFacts
        });
      }

      // Achievements — truncate descriptions, split if many
      const allAchievements = (highlight.value.aiContent?.achievements && highlight.value.aiContent.achievements.length > 0)
        ? highlight.value.aiContent.achievements
        : (highlight.value.aiContent?.timeline && highlight.value.aiContent.timeline.length > 0)
          ? highlight.value.aiContent.timeline.map(t => ({
              title: t.event || t.date,
              description: t.description,
              date: t.date
            }))
          : [];

      if (allAchievements.length > 0) {
        // Truncate descriptions and split into groups of 3
        const clamped = allAchievements.map(a => ({
          ...a,
          description: truncate(a.description, ACHIEVEMENT_DESC_LIMIT)
        }));
        for (let i = 0; i < clamped.length; i += 3) {
          const group = clamped.slice(i, i + 3);
          const pageNum = Math.floor(i / 3) + 1;
          const totalPages = Math.ceil(clamped.length / 3);
          slideList.push({
            id: totalPages > 1 ? `achievements-${pageNum}` : 'achievements',
            title: totalPages > 1 ? `Achievements & Honors (${pageNum}/${totalPages})` : 'Achievements & Honors',
            type: 'achievements',
            content: group
          });
        }
      }

      // Gallery Images
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

      // Sources
      const sourcesToShow = (highlight.value.aiContent?.sources && highlight.value.aiContent.sources.length > 0)
        ? highlight.value.aiContent.sources.slice(0, 3)
        : [];

      if (sourcesToShow.length > 0) {
        slideList.push({
          id: 'sources',
          title: 'Sources',
          type: 'sources',
          content: sourcesToShow
        });
      }

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
        <img src="/assets/img/vs-logo.jpg" alt="Veterans Scene Logo" class="logo-image" />
        <div class="obs-website">VeteransScene.org</div>
      </div>
    </div>
  `
};
