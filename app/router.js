import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import Login from './views/Login.js?v=20260124i';
import ForgotPassword from './views/ForgotPassword.js?v=20260124i';
import ResetPassword from './views/ResetPassword.js?v=20260124i';
import VerifyEmail from './views/VerifyEmail.js?v=20260124i';
import Apply from './views/Apply.js?v=20260124i';
import Dashboard from './views/Dashboard.js?v=20260206';
import Applications from './views/Applications.js?v=20260124i';
import ApplicationDetail from './views/ApplicationDetail.js?v=20260124i';
import Users from './views/Users.js';
import Segments from './views/Segments.js?v=20260124i';
import SegmentDetail from './views/SegmentDetail.js?v=20260218e';
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
import Waiver from './views/Waiver.js?v=20260305';
import MyApplications from './views/MyApplications.js?v=20260206';
import WaiverSign from './views/WaiverSign.js?v=20260305';
import RecordingStudio from './views/RecordingStudio.js?v=20260211i';
import RecordingAccessManager from './views/RecordingAccessManager.js?v=20260211';
import InviteRedeem from './views/InviteRedeem.js?v=20260212';
import GuestDashboard from './views/GuestDashboard.js?v=20260212';
import StorageManager from './views/StorageManager.js?v=20260224';
import S3Browser from './views/S3Browser.js?v=20260224';
import RecordingsBrowser from './views/RecordingsBrowser.js?v=20260224';

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
    path: '/invite/:token',
    name: 'InviteRedeem',
    component: InviteRedeem
  },
  {
    path: '/apply',
    name: 'Apply',
    beforeEnter: () => {
      window.location.href = 'https://beta.veteransscene.org/apply.html';
    }
  },
  {
    path: '/join',
    name: 'JoinAlias',
    beforeEnter: () => {
      window.location.href = 'https://beta.veteransscene.org/apply.html';
    }
  },
  {
    path: '/joinus',
    name: 'JoinUsAlias',
    beforeEnter: () => {
      window.location.href = 'https://beta.veteransscene.org/apply.html';
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/guest-dashboard',
    name: 'GuestDashboard',
    component: GuestDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/my-applications',
    name: 'MyApplications',
    component: MyApplications,
    meta: { requiresAuth: true }
  },
  {
    path: '/sign-waiver/:token',
    name: 'WaiverPublic',
    component: Waiver,
    meta: { requiresAuth: false }
  },
  {
    path: '/waiver/:applicationId',
    name: 'WaiverSign',
    component: WaiverSign,
    meta: { requiresAuth: true }
  },
  {
    path: '/recording/:sessionId',
    name: 'RecordingStudio',
    component: RecordingStudio,
    meta: { requiresAuth: true }
  },
  {
    path: '/recording-access',
    name: 'RecordingAccessManager',
    component: RecordingAccessManager,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
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
    path: '/storage',
    name: 'StorageManager',
    component: StorageManager,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/help-topics',
    name: 'HelpTopics',
    component: HelpTopics,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/s3-browser',
    name: 'S3Browser',
    component: S3Browser,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/recordings-browser',
    name: 'RecordingsBrowser',
    component: RecordingsBrowser,
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
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  console.log(`[Router Guard] From: ${from.name} (${from.path}) → To: ${to.name} (${to.path})`);
  console.log(`[Router Guard] Authenticated: ${authStore.isAuthenticated.value}, RequiresAuth: ${to.meta.requiresAuth}, RequiresRole: ${to.meta.requiresRole ? JSON.stringify(to.meta.requiresRole) : 'none'}`);

  // Redirect logged-in users away from login page to dashboard
  if ((to.name === 'Login' || to.name === 'LoginAlias') && authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting logged-in user from login to dashboard');
    next({ name: 'Dashboard' });
    return;
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting unauthenticated user to login');
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresRole) {
    // Check both .role (singular) and .roles (plural) for flexibility
    const userRole = authStore.user.value?.role || (Array.isArray(authStore.user.value?.roles) ? authStore.user.value.roles[0] : null);
    console.log(`[Router Guard] Checking role: user has ${userRole}, requires ${to.meta.requiresRole}`);
    if (!userRole || !to.meta.requiresRole.includes(userRole)) {
      console.log('[Router Guard] User does not have required role, redirecting to dashboard');
      next({ name: 'Dashboard' });
    } else {
      console.log('[Router Guard] User has required role, allowing navigation');
      next();
    }
  } else {
    console.log('[Router Guard] No restrictions, allowing navigation');
    next();
  }
});

export default router;
