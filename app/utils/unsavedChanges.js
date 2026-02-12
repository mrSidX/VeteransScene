import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Composable to handle unsaved changes detection
 * @param {Ref} hasChanges - Reactive boolean indicating if there are unsaved changes
 * @param {string} pageName - Name of the page for confirmation message
 * @returns {Object} Methods to setup and cleanup unsaved changes detection
 */
export const useUnsavedChanges = (hasChanges, pageName = 'page') => {
  const router = useRouter();
  let navigationBlocked = false;

  // Handle page unload (refresh, close, or navigate to external page)
  const handleBeforeUnload = (e) => {
    if (hasChanges.value && !navigationBlocked) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };

  // Setup: Add event listeners
  const setupUnsavedChangesDetection = () => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  };

  // Cleanup: Remove event listeners
  const cleanupUnsavedChangesDetection = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };

  // Add router guard for in-app navigation
  const setupRouterGuard = () => {
    return router.beforeEach((to, from, next) => {
      if (hasChanges.value && from.path !== to.path) {
        // Don't block navigation to certain pages (like login, home)
        const noPromptRoutes = ['/login', '/logout', '/'];
        if (noPromptRoutes.includes(to.path)) {
          navigationBlocked = true;
          next();
          return;
        }

        const proceed = confirm(
          `You have unsaved changes on this ${pageName}. Do you want to leave without saving?\n\nClick OK to discard changes, or Cancel to stay on this page.`
        );

        if (proceed) {
          navigationBlocked = true;
          next();
        } else {
          next(false);
        }
      } else {
        next();
      }
    });
  };

  return {
    setupUnsavedChangesDetection,
    cleanupUnsavedChangesDetection,
    setupRouterGuard,
    setNavigationBlocked: (blocked) => {
      navigationBlocked = blocked;
    }
  };
};

/**
 * Compare two objects and determine if they're different
 * @param {Object} original - Original data object
 * @param {Object} modified - Modified data object
 * @returns {boolean} True if objects are different
 */
export const hasDataChanged = (original, modified) => {
  if (!original || !modified) return false;

  // Deep comparison
  return JSON.stringify(original) !== JSON.stringify(modified);
};
