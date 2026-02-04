import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'Login',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);

    const handleSubmit = async () => {
      error.value = '';
      loading.value = true;

      try {
        await authStore.login(email.value, password.value);

        // Redirect to intended page or dashboard
        const redirect = route.query.redirect || '/dashboard';
        router.push(redirect);
      } catch (err) {
        error.value = err.message || 'Login failed. Please check your credentials.';
      } finally {
        loading.value = false;
      }
    };

    const goToForgotPassword = () => {
      router.push('/forgot-password');
    };

    return {
      email,
      password,
      error,
      loading,
      handleSubmit,
      goToForgotPassword
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full space-y-8">
        <!-- Back to Home Button -->
        <div class="flex justify-start">
          <a href="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition font-medium text-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Veterans Scene - Home
          </a>
        </div>

        <div>
          <img src="/assets/img/vs-logo.jpg" alt="Logo" class="mx-auto h-16 w-16 rounded-lg">
          <h2 class="mt-6 text-center text-3xl font-extrabold text-yellow-400">
            Sign in to your account
          </h2>
          <p class="mt-2 text-center text-sm text-gray-400">
            Access your account
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl">
          <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            {{ error }}
          </div>

          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="admin@veteransscene.org"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign in</span>
            </button>
          </div>

          <div class="flex justify-center text-sm">
            <button @click="goToForgotPassword" type="button" class="text-yellow-400 hover:text-yellow-300 underline">
              Forgot password?
            </button>
          </div>
        </form>

        <!-- Sign Up Link -->
        <div class="text-center mt-6">
          <p class="text-gray-400">
            Are you a veteran or family member?
          </p>
          <a href="/signup.html" class="inline-block mt-2 text-yellow-400 hover:text-yellow-300 font-medium">
            Create your profile →
          </a>
        </div>
      </div>
    </div>
  `
};
