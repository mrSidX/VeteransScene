import { ref } from 'vue';
import api from '../services/api.js';

export default {
  name: 'ForgotPassword',
  setup() {
    const email = ref('');
    const error = ref('');
    const success = ref('');
    const loading = ref(false);

    const handleSubmit = async () => {
      error.value = '';
      success.value = '';
      loading.value = true;

      try {
        const data = await api.post('/auth/forgot-password', {
          email: email.value
        });

        if (data.success) {
          success.value = data.message;
          email.value = ''; // Clear email field
        } else {
          error.value = data.message || 'Failed to send reset email';
        }
      } catch (err) {
        console.error('Forgot password error:', err);
        error.value = err.message || 'An error occurred. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return {
      email,
      error,
      success,
      loading,
      handleSubmit
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full space-y-8">
        <div>
          <img src="/assets/img/vs-logo.jpg" alt="Logo" class="mx-auto h-16 w-16 rounded-lg">
          <h2 class="mt-6 text-center text-3xl font-extrabold text-yellow-400">
            Forgot Password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl">
          <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            {{ error }}
          </div>

          <div v-if="success" class="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
            <div class="flex items-start">
              <svg class="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div class="ml-3">
                <p class="text-sm">{{ success }}</p>
                <p class="mt-2 text-xs text-green-300">Please check your email inbox and spam folder.</p>
              </div>
            </div>
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
                placeholder="your-email@example.com"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <span v-if="loading">Sending...</span>
              <span v-else>Send Reset Link</span>
            </button>
          </div>

          <div class="flex items-center justify-between text-sm">
            <a href="#/" class="text-yellow-400 hover:text-yellow-300">
              ← Back to Login
            </a>
            <a href="/" class="text-gray-400 hover:text-gray-300">
              Home
            </a>
          </div>
        </form>

        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p class="text-xs text-gray-400 text-center">
            <strong class="text-gray-300">Security Note:</strong> For your protection, we won't confirm whether an account exists with this email address.
          </p>
        </div>
      </div>
    </div>
  `
};
