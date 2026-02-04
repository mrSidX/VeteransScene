import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.js';

export default {
  name: 'App',
  components: {
    Navbar
  },
  setup() {
    const route = useRoute();

    // Hide navbar/footer for OBS display
    const showNavbar = () => {
      return route.name !== 'HighlightDisplayOBS';
    };

    const showFooter = () => {
      return route.name !== 'HighlightDisplayOBS';
    };

    return {
      showNavbar,
      showFooter
    };
  },
  template: `
    <div id="app" class="min-h-screen bg-gray-900">
      <Navbar v-if="showNavbar()" />
      <router-view />

      <!-- Footer -->
      <footer v-if="showFooter()" class="bg-gray-900 border-t border-gray-700 text-center py-8 text-gray-400 mt-auto">
        <p>Need help now? <strong>Veterans Crisis Line:</strong> <a href="tel:988" class="text-yellow-400 hover:underline">Dial 988 (Press 1)</a></p>
        <p class="mt-2">Email: <a href="mailto:veteransscene@gmail.com" class="text-yellow-400 hover:underline">veteransscene@gmail.com</a></p>
        <p class="m-6">
          This information is provided by veteran volunteers and is not affiliated with or endorsed by the U.S. Department of Veterans Affairs.
          VETERAN'S SCENE provides this information voluntarily. We are not affiliated with the VA and we are not advocates.
        </p>
        <p class="mt-2">© {{ new Date().getFullYear() }} Veteran's Scene. All Rights Reserved.</p>
      </footer>
    </div>
  `
};
