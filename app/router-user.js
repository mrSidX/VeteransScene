import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import Login from './views/Login.js?v=20260211';
import ForgotPassword from './views/ForgotPassword.js?v=20260211';
import ResetPassword from './views/ResetPassword.js?v=20260211';
import VerifyEmail from './views/VerifyEmail.js?v=20260211';
import Dashboard from './views/Dashboard.js?v=20260211';
import MyApplications from './views/MyApplications.js?v=20260206';
import Waiver from './views/Waiver.js?v=20260306';
import WaiverSign from './views/WaiverSign.js?v=20260206';
import Profile from './views/Profile.js?v=20260211';
import Notifications from './views/Notifications.js?v=20260211';
import RecordingStudio from './views/RecordingStudio.js?v=20260211i';
import Applications from './views/Applications.js?v=20260211';
import ApplicationDetail from './views/ApplicationDetail.js?v=20260211';
import Users from './views/Users.js?v=20260211';
import Segments from './views/Segments.js?v=20260211';
import SegmentDetail from './views/SegmentDetail.js?v=20260211';
import SegmentNew from './views/SegmentNew.js?v=20260211';
import Highlights from './views/Highlights.js?v=20260211';
import HighlightDetail from './views/HighlightDetail.js?v=20260211';
import HighlightNew from './views/HighlightNew.js?v=20260211';
import PromptTemplateManager from './views/PromptTemplateManager.js?v=20260211';
import Flags from './views/Flags.js?v=20260211';
import FlagDetail from './views/FlagDetail.js?v=20260211';
import MailEnhanced from './views/MailEnhanced.js?v=20260211';
import DropboxBrowser from './views/DropboxBrowser.js?v=20260211';
import DropboxSettings from './views/DropboxSettings.js?v=20260211';
import HelpTopics from './views/HelpTopics.js?v=20260211';
import HighlightDisplay from './views/HighlightDisplay.js?v=20260211';
import HighlightDisplayRandom from './views/HighlightDisplayRandom.js?v=20260211';
import HighlightDisplayOBS from './views/HighlightDisplayOBS.js?v=20260211';
import RecordingAccessManager from './views/RecordingAccessManager.js?v=20260211d';
import RecordingsBrowser from './views/RecordingsBrowser.js?v=20260211';
import InviteRedeem from './views/InviteRedeem.js?v=20260212';
import GuestDashboard from './views/GuestDashboard.js?v=20260212';

// User portal routes - full route set with role-based access control
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
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
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
    meta: { requiresAuth: false }
  },
  {
    path: '/highlight-random',
    name: 'HighlightDisplayRandom',
    component: HighlightDisplayRandom,
    meta: { requiresAuth: false }
  },
  {
    path: '/highlight-obs/:id',
    name: 'HighlightDisplayOBS',
    component: HighlightDisplayOBS,
    meta: { requiresAuth: false }
  },
  {
    path: '/recording-access',
    name: 'RecordingAccessManager',
    component: RecordingAccessManager,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/recordings-browser',
    name: 'RecordingsBrowser',
    component: RecordingsBrowser,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiredRoles = to.meta.requiresRole;

  console.log(`[Router Guard] To: ${to.path}, Auth: ${authStore.isAuthenticated.value}, Roles: ${authStore.user.value?.role}, Required: ${requiredRoles}`);

  // Redirect logged-in users away from login page
  if ((to.name === 'Login' || to.name === 'LoginAlias') && authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting authenticated user to dashboard');
    next({ name: 'Dashboard' });
    return;
  }

  // Check if route requires authentication
  if (requiresAuth && !authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting to login - auth required');
    next({ path: '/', query: { redirect: to.fullPath } });
    return;
  }

  // Check if route requires specific role
  if (requiredRoles && authStore.isAuthenticated.value) {
    const userRole = authStore.user.value?.role || (Array.isArray(authStore.user.value?.roles) ? authStore.user.value.roles[0] : null);
    if (!userRole || !requiredRoles.includes(userRole)) {
      console.log('[Router Guard] User does not have required role, redirecting to dashboard');
      next({ name: 'Dashboard' });
      return;
    }
  }

  console.log('[Router Guard] Navigation allowed');
  next();
});

export default router;
