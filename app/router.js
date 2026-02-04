import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js?v=20260124i';
import Login from './views/Login.js?v=20260124i';
import ForgotPassword from './views/ForgotPassword.js?v=20260124i';
import ResetPassword from './views/ResetPassword.js?v=20260124i';
import VerifyEmail from './views/VerifyEmail.js?v=20260124i';
import Apply from './views/Apply.js?v=20260124i';
import Dashboard from './views/Dashboard.js?v=20260124i';
import Applications from './views/Applications.js?v=20260124i';
import ApplicationDetail from './views/ApplicationDetail.js?v=20260124i';
import Users from './views/Users.js?v=20260124i';
import Segments from './views/Segments.js?v=20260124i';
import SegmentDetail from './views/SegmentDetail.js?v=20260124i';
import SegmentNew from './views/SegmentNew.js?v=20260124i';
import Highlights from './views/Highlights.js?v=20260124i';
import HighlightDetail from './views/HighlightDetail.js?v=20260124i';
import HighlightNew from './views/HighlightNew.js?v=20260124i';
import PromptTemplateManager from './views/PromptTemplateManager.js?v=20260124i';
import Flags from './views/Flags.js?v=20260124i';
import FlagDetail from './views/FlagDetail.js?v=20260124i';
import MailEnhanced from './views/MailEnhanced.js?v=20260124i';
import Notifications from './views/Notifications.js?v=20260124i';
import Profile from './views/Profile.js?v=20260124i';
import DropboxBrowser from './views/DropboxBrowser.js?v=20260130';
import DropboxSettings from './views/DropboxSettings.js?v=20260130';
import HelpTopics from './views/HelpTopics.js?v=20260202';
import HighlightDisplay from './views/HighlightDisplay.js?v=20260202';
import HighlightDisplayRandom from './views/HighlightDisplayRandom.js?v=20260202';
import HighlightDisplayOBS from './views/HighlightDisplayOBS.js?v=20260203';

// Routes with direct component imports
const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/login',
    name: 'LoginAlias',
    redirect: '/'
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail
  },
  {
    path: '/apply',
    name: 'Apply',
    component: Apply
  },
  {
    path: '/join',
    name: 'JoinAlias',
    redirect: '/apply'
  },
  {
    path: '/joinus',
    name: 'JoinUsAlias',
    redirect: '/apply'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/applications',
    name: 'Applications',
    component: Applications,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/applications/:id',
    name: 'ApplicationDetail',
    component: ApplicationDetail,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/segments',
    name: 'Segments',
    component: Segments,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/segments/new',
    name: 'SegmentNew',
    component: SegmentNew,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/segments/:id',
    name: 'SegmentDetail',
    component: SegmentDetail,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/highlights',
    name: 'Highlights',
    component: Highlights,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/highlights/new',
    name: 'HighlightNew',
    component: HighlightNew,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/highlights/:id',
    name: 'HighlightDetail',
    component: HighlightDetail,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/prompt-templates',
    name: 'PromptTemplateManager',
    component: PromptTemplateManager,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/flags',
    name: 'Flags',
    component: Flags,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/flags/:id',
    name: 'FlagDetail',
    component: FlagDetail,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/mail',
    name: 'Mail',
    component: MailEnhanced,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/dropbox',
    name: 'DropboxBrowser',
    component: DropboxBrowser,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/dropbox/settings',
    name: 'DropboxSettings',
    component: DropboxSettings,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/help-topics',
    name: 'HelpTopics',
    component: HelpTopics,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/highlight-display/:id',
    name: 'HighlightDisplay',
    component: HighlightDisplay,
    meta: { requiresAuth: false } // Public for OBS Browser Source
  },
  {
    path: '/highlight-random',
    name: 'HighlightDisplayRandom',
    component: HighlightDisplayRandom,
    meta: { requiresAuth: false } // Public for OBS Browser Source
  },
  {
    path: '/highlight-obs/:id',
    name: 'HighlightDisplayOBS',
    component: HighlightDisplayOBS,
    meta: { requiresAuth: false } // Public for OBS Browser Source
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresRole) {
    const userRole = authStore.user.value?.role;
    if (!to.meta.requiresRole.includes(userRole)) {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
