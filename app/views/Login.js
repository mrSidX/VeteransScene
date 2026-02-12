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
    const code = ref('');
    const anonymousHandle = ref('');
    const anonymousPasscode = ref('');
    const loginMethod = ref('password'); // 'password', 'code', or 'anonymous'
    const error = ref('');
    const loading = ref(false);
    const showPassword = ref(false);

    const handleSubmit = async () => {
      error.value = '';
      loading.value = true;
      console.log('Login attempt for:', email.value || anonymousHandle.value, 'method:', loginMethod.value);

      try {
        let response;
        if (loginMethod.value === 'anonymous') {
          response = await authStore.loginAnonymous(anonymousHandle.value, anonymousPasscode.value);
        } else if (loginMethod.value === 'code') {
          response = await authStore.loginWithCode(email.value, code.value);
        } else {
          response = await authStore.login(email.value, password.value);
        }

        console.log('Login response:', response);
        console.log('Is authenticated:', authStore.isAuthenticated.value);
        console.log('User:', authStore.user.value);

        // Redirect to intended page or dashboard
        const redirect = route.query.redirect || '/dashboard';
        console.log('Redirecting to:', redirect);
        await router.push(redirect);
        console.log('Redirect complete');
      } catch (err) {
        console.error('Login error:', err);
        error.value = err.message || 'Login failed. Please check your credentials.';
      } finally {
        loading.value = false;
      }
    };

    const goToForgotPassword = () => {
      router.push('/forgot-password');
    };

    const toggleShowPassword = () => {
      showPassword.value = !showPassword.value;
    };

    return {
      email,
      password,
      code,
      anonymousHandle,
      anonymousPasscode,
      loginMethod,
      error,
      loading,
      showPassword,
      handleSubmit,
      goToForgotPassword,
      toggleShowPassword
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

          <!-- Login Method Toggle -->
          <div class="flex gap-2 bg-gray-700 p-1 rounded-lg">
            <button
              type="button"
              @click="loginMethod = 'password'"
              :class="[
                'flex-1 py-2 px-4 rounded-md font-medium transition text-sm',
                loginMethod === 'password'
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:text-gray-100'
              ]"
            >
              Password
            </button>
            <button
              type="button"
              @click="loginMethod = 'code'"
              :class="[
                'flex-1 py-2 px-4 rounded-md font-medium transition text-sm',
                loginMethod === 'code'
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:text-gray-100'
              ]"
            >
              Login Code
            </button>
            <button
              type="button"
              @click="loginMethod = 'anonymous'"
              :class="[
                'flex-1 py-2 px-4 rounded-md font-medium transition text-sm',
                loginMethod === 'anonymous'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-300 hover:text-gray-100'
              ]"
            >
              🔒 Anonymous
            </button>
          </div>

          <!-- Anonymous Login Fields -->
          <div v-if="loginMethod === 'anonymous'" class="space-y-4">
            <div>
              <label for="anon-handle" class="block text-sm font-medium text-gray-300 mb-2">
                Handle/Username
              </label>
              <input
                id="anon-handle"
                v-model="anonymousHandle"
                type="text"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Your alias or handle"
              />
            </div>
            <div>
              <label for="anon-passcode" class="block text-sm font-medium text-gray-300 mb-2">
                6-Digit Passcode
              </label>
              <input
                id="anon-passcode"
                v-model="anonymousPasscode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm text-center text-3xl tracking-widest font-mono"
                placeholder="000000"
              />
              <p class="text-xs text-gray-400 mt-2">
                From your anonymous account creation
              </p>
            </div>
          </div>

          <!-- Regular Login Fields -->
          <div v-else class="space-y-4">
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

            <!-- Password Input -->
            <div v-if="loginMethod === 'password'">
              <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  @click="toggleShowPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none transition"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                >
                  <svg v-if="!showPassword" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
                    <path d="M15.171 11.586a4 4 0 111.414-1.414l.707.707" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Code Input -->
            <div v-if="loginMethod === 'code'">
              <label for="code" class="block text-sm font-medium text-gray-300 mb-2">
                6-Digit Login Code
              </label>
              <input
                id="code"
                v-model="code"
                type="text"
                inputmode="numeric"
                maxlength="6"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
              />
              <p class="text-xs text-gray-400 mt-2">
                Check your email for the 6-digit code
              </p>
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
