export default {
  name: 'Home',
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <!-- Hero Banner -->
      <section class="relative bg-cover bg-center h-[60vh]" style="background-image: url('/assets/img/vs-banner.png');">
        <div class="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center text-center px-6">
          <h2 class="text-5xl sm:text-6xl font-bold text-yellow-400 mb-4 drop-shadow-lg">Welcome to Veteran's Scene</h2>
          <p class="max-w-2xl text-lg text-gray-200 mb-6">
            Empowering Veterans through connection, education, and shared experiences.
          </p>
          <router-link to="/apply" class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition">
            Apply to Participate
          </router-link>
        </div>
      </section>

      <!-- Media Highlight Section -->
      <section class="bg-gray-800 border-y border-gray-700 py-16">
        <div class="max-w-6xl mx-auto px-6">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-yellow-400 mb-4">Our Media</h2>
            <p class="max-w-3xl mx-auto text-lg text-gray-300">
              Authentic veteran stories, meaningful conversations, and media that amplifies voices from the military community.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-6 mb-8">
            <!-- Podcast Card -->
            <div class="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="flex justify-center mb-4">
                <svg class="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-2 text-center">Podcast Interviews</h3>
              <p class="text-gray-300 text-center text-sm">In-depth conversations with veterans about service and life after.</p>
            </div>

            <!-- Roundtable Card -->
            <div class="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="flex justify-center mb-4">
                <svg class="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-2 text-center">Roundtables</h3>
              <p class="text-gray-300 text-center text-sm">Panel discussions on topics that matter to the veteran community.</p>
            </div>

            <!-- Special Features Card -->
            <div class="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="flex justify-center mb-4">
                <svg class="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-2 text-center">Special Features</h3>
              <p class="text-gray-300 text-center text-sm">Documentary content exploring veteran issues and community events.</p>
            </div>
          </div>

          <!-- Join Us Section -->
          <div class="bg-gray-900 rounded-lg p-8 border border-gray-700 mb-8">
            <div class="max-w-4xl mx-auto">
              <h3 class="text-2xl font-bold text-yellow-400 mb-4 text-center">Join Our Program</h3>
              <p class="text-gray-300 text-center mb-6">
                We're always looking for veterans willing to share their experiences. Whether you served in combat,
                provided support, or transitioned to civilian life - your story matters. Join us for authentic
                conversations about military service, challenges, triumphs, and life after uniform.
              </p>
              <div class="flex flex-wrap justify-center gap-4">
                <router-link to="/apply" class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-3 rounded-lg transition">
                  Apply to Join Us
                </router-link>
                <router-link to="/media" class="bg-gray-700 hover:bg-gray-600 text-gray-100 font-bold px-6 py-3 rounded-lg transition">
                  Learn More About Our Media
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <main class="flex-grow flex flex-col items-center justify-center text-center px-6 py-16">
        <h2 class="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4">Veteran's Scene</h2>
        <p class="max-w-2xl text-lg text-gray-300 mb-8">
          A community-driven project dedicated to empowering Veterans through connection, education, and resources.
          We're building a platform for discussion, events, and support.
        </p>

        <!-- Branch Logos Grid -->
        <div class="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-5xl">
          <div class="bg-gray-800 p-4 rounded-lg shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Logo_of_the_United_States_Army.svg/500px-Logo_of_the_United_States_Army.svg.png" alt="Army" class="rounded mb-2 mx-auto h-20">
            <p class="text-sm text-gray-400 text-center">U.S. Army</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Emblem_of_the_United_States_Navy.svg/600px-Emblem_of_the_United_States_Navy.svg.png" alt="Navy" class="rounded mb-2 mx-auto h-20">
            <p class="text-sm text-gray-400 text-center">U.S. Navy</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Military_service_mark_of_the_United_States_Air_Force.svg/640px-Military_service_mark_of_the_United_States_Air_Force.svg.png" alt="Air Force" class="rounded mb-2 mx-auto h-20">
            <p class="text-sm text-gray-400 text-center">U.S. Air Force</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Emblem_of_the_United_States_Marine_Corps.svg/640px-Emblem_of_the_United_States_Marine_Corps.svg.png" alt="Marines" class="rounded mb-2 mx-auto h-20">
            <p class="text-sm text-gray-400 text-center">U.S. Marines</p>
          </div>
        </div>
      </main>
    </div>
  `
};
