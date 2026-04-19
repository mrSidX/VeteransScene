import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import Login from './views/Login.js';
import Dashboard from './views/Dashboard.js?v=20260410b';
import Applications from './views/Applications.js';
import ApplicationDetail from './views/ApplicationDetail.js';
import Users from './views/Users.js';
import Segments from './views/Segments.js';
import SegmentDetail from './views/SegmentDetail.js';
import SegmentNew from './views/SegmentNew.js';
import Mail from './views/Mail.js';
import Profile from './views/Profile.js';
import Highlights from './views/Highlights.js?v=20260330';
import HighlightDetail from './views/HighlightDetail.js?v=20260330';
import HighlightNew from './views/HighlightNew.js?v=20260330';
import Flags from './views/Flags.js?v=20260211';
import FlagDetail from './views/FlagDetail.js?v=20260211';
import PromptTemplateManager from './views/PromptTemplateManager.js?v=20260211';
import DropboxBrowser from './views/DropboxBrowser.js?v=20260130';
import DropboxSettings from './views/DropboxSettings.js?v=20260130';
import HelpTopics from './views/HelpTopics.js?v=20260202';
import MyApplications from './views/MyApplications.js?v=20260206';
import RecordingAccessManager from './views/RecordingAccessManager.js?v=20260211d';
import RecordingStudio from './views/RecordingStudio.js?v=20260211i';
import RecordingsBrowser from './views/RecordingsBrowser.js?v=20260211';
import StorageManager from './views/StorageManager.js?v=20260224';
import S3Browser from './views/S3Browser.js?v=20260224';
import HighlightDisplayOBS from './views/HighlightDisplayOBS.js?v=20260330';
import RecordingSlots from './views/RecordingSlots.js?v=20260310';
import SecurityMonitor from './views/SecurityMonitor.js?v=20260318';
import ObsMachines from './views/ObsMachines.js?v=20260321';
import SiteSettings from './views/SiteSettings.js?v=20260410e';
import SuperAdminQueue from './views/SuperAdminQueue.js?v=20260329';
import Transparency from './views/Transparency.js?v=20260410d';
import ExpenseManager from './views/ExpenseManager.js?v=20260410c';
import ReadinessChecks from './views/ReadinessChecks.js?v=20260418b';

// Admin-only routes - no password reset functionality
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
    path: '/readiness-checks',
    name: 'ReadinessChecks',
    component: ReadinessChecks,
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
    path: '/mail',
    name: 'Mail',
    component: Mail,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
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
    path: '/prompt-templates',
    name: 'PromptTemplateManager',
    component: PromptTemplateManager,
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
    path: '/my-applications',
    name: 'MyApplications',
    component: MyApplications,
    meta: { requiresAuth: true }
  },
  {
    path: '/recording-access',
    name: 'RecordingAccessManager',
    component: RecordingAccessManager,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/recording/:sessionId',
    name: 'RecordingStudio',
    component: RecordingStudio,
    meta: { requiresAuth: true }
  },
  {
    path: '/recordings-browser',
    name: 'RecordingsBrowser',
    component: RecordingsBrowser,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/storage',
    name: 'StorageManager',
    component: StorageManager,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/s3-browser',
    name: 'S3Browser',
    component: S3Browser,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/recording-slots',
    name: 'RecordingSlots',
    component: RecordingSlots,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/security',
    name: 'SecurityMonitor',
    component: SecurityMonitor,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/obs-machines',
    name: 'ObsMachines',
    component: ObsMachines,
    meta: { requiresAuth: true, requiresRole: ['admin', 'moderator'] }
  },
  {
    path: '/site-settings',
    name: 'SiteSettings',
    component: SiteSettings,
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/super-admin',
    name: 'SuperAdminQueue',
    component: SuperAdminQueue,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/highlight-obs/:id',
    name: 'HighlightDisplayOBS',
    component: HighlightDisplayOBS,
    meta: { requiresAuth: false }
  },
  {
    path: '/transparency/costs',
    name: 'TransparencyCosts',
    component: Transparency,
    meta: { requiresAuth: false }
  },
  {
    path: '/transparency',
    name: 'TransparencyRoot',
    redirect: '/transparency/costs'
  },
  {
    path: '/expense-manager',
    name: 'ExpenseManager',
    component: ExpenseManager,
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
  const user = authStore.user.value;

  // Get all user roles
  const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);

  console.log(`[Router Guard] To: ${to.path}, Auth: ${authStore.isAuthenticated.value}, Roles: ${userRoles}`);

  // Redirect logged-in users away from login page
  if ((to.name === 'Login' || to.name === 'LoginAlias') && authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting authenticated user to dashboard');
    next({ name: 'Dashboard' });
    return;
  }

  if (requiresAuth && !authStore.isAuthenticated.value) {
    console.log('[Router Guard] Redirecting to login');
    next({ path: '/', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresSuperAdmin) {
    if (!user?.isSuperAdmin) {
      console.log('[Router Guard] Super Admin required, redirecting to dashboard');
      next('/dashboard');
    } else {
      next();
    }
  } else if (requiredRoles && !requiredRoles.some(r => userRoles.includes(r))) {
    console.log('[Router Guard] User does not have required role');
    next('/dashboard');
  } else {
    console.log('[Router Guard] Navigation allowed');
    next();
  }
});

export default router;
