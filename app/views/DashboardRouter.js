import { computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import Dashboard from './Dashboard.js?v=20260210';
import ParticipantDashboard from './ParticipantDashboard.js?v=20260210';

export default {
  name: 'DashboardRouter',
  components: {
    Dashboard,
    ParticipantDashboard
  },
  setup() {
    const authStore = useAuthStore();

    // Determine which dashboard to show based on user role
    const currentDashboard = computed(() => {
      if (authStore.hasAnyRole('admin', 'moderator')) {
        return Dashboard;
      }
      return ParticipantDashboard;
    });

    console.log('[DashboardRouter] User roles:', authStore.user.value?.roles, 'Dashboard:', currentDashboard.value?.name);

    return {
      currentDashboard,
      user: authStore.user
    };
  },
  template: `
    <component :is="currentDashboard" />
  `
};
