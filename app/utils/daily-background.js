// Daily Rotating Background System - Local Images
// Uses pre-downloaded military/patriotic images from assets folder

const CACHE_KEY = 'vs-daily-bg-cache';
const CACHE_DATE_KEY = 'vs-daily-bg-date';

// Local military/patriotic background images
const MILITARY_IMAGES = [
  '/assets/img/backgrounds/military-01.jpg',
  '/assets/img/backgrounds/military-02.jpg',
  '/assets/img/backgrounds/military-03.jpg'
];

// Get image for today based on day of week
function getTodayImage() {
  const dayOfWeek = new Date().getDay(); // 0-6
  const imageIndex = dayOfWeek % MILITARY_IMAGES.length;
  return MILITARY_IMAGES[imageIndex];
}

// Check if cache is still valid (same day)
function isCacheValid() {
  const today = new Date().toDateString();
  const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
  return cachedDate === today;
}

// Apply background image to dedicated container
function applyDailyBackground() {
  try {
    const bgContainer = document.getElementById('bg-container');

    if (!bgContainer) {
      console.warn('Background container not found');
      return;
    }

    // Get image for today based on day of week
    const imageUrl = getTodayImage();

    // Apply the background image to the dedicated container
    if (imageUrl) {
      bgContainer.style.backgroundImage = `url('${imageUrl}')`;
      console.log('✓ Background applied successfully');
      console.log(`📅 Today's image: ${imageUrl}`);
    } else {
      console.warn('No image available');
    }

  } catch (error) {
    console.error('✗ Error applying daily background:', error);
  }
}

// Force refresh background (for testing)
window.refreshBackground = function() {
  console.log('Manually refreshing background...');
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_DATE_KEY);
  applyDailyBackground();
};

// Initialize background on page load
export function initDailyBackground() {
  console.log('Initializing daily background system...');

  // Apply immediately on load (may be cached)
  applyDailyBackground();

  // Check every minute if day has changed (for midnight transitions)
  setInterval(applyDailyBackground, 60000);
}
