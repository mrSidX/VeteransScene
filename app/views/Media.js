export default {
  name: 'Media',
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <!-- Hero Section -->
      <section class="relative bg-cover bg-center h-[50vh]" style="background-image: url('/assets/img/vs-banner.png');">
        <div class="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center text-center px-6">
          <h1 class="text-5xl sm:text-6xl font-bold text-yellow-400 mb-4 drop-shadow-lg">Veteran's Scene Media</h1>
          <p class="max-w-3xl text-xl text-gray-200">
            Amplifying veteran voices through podcasts, videos, and digital storytelling.
          </p>
        </div>
      </section>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-6 py-16">

        <!-- Our Productions Section -->
        <section class="mb-20">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-yellow-400 mb-4">Our Productions</h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto">
              We create authentic content that shares veteran stories, addresses real issues, and builds community.
              From intimate interviews to roundtable discussions, our productions give veterans a platform to be heard.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Main Podcast -->
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-yellow-400 transition">
              <div class="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-black bg-opacity-40"></div>
                <svg class="w-20 h-20 text-yellow-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                </svg>
              </div>
              <div class="p-6">
                <h3 class="text-2xl font-bold text-yellow-400 mb-3">Veteran's Scene Podcast</h3>
                <p class="text-gray-300 mb-4">
                  Our flagship show featuring in-depth conversations with veterans about their service, challenges, and triumphs.
                  Real stories from real veterans.
                </p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Interviews</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Stories</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Weekly</span>
                </div>
                <a href="https://www.youtube.com/@VeteransScene" target="_blank" rel="noopener" class="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded transition">
                  Watch Episodes
                </a>
              </div>
            </div>

            <!-- Roundtable Discussions -->
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-yellow-400 transition">
              <div class="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-black bg-opacity-40"></div>
                <svg class="w-20 h-20 text-yellow-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                </svg>
              </div>
              <div class="p-6">
                <h3 class="text-2xl font-bold text-yellow-400 mb-3">Roundtable Discussions</h3>
                <p class="text-gray-300 mb-4">
                  Multiple veterans come together to discuss topics that matter - from VA benefits to transition challenges.
                  Diverse perspectives, honest conversations.
                </p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Panel</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Discussion</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Monthly</span>
                </div>
                <a href="https://www.youtube.com/@VeteransScene" target="_blank" rel="noopener" class="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded transition">
                  Watch Discussions
                </a>
              </div>
            </div>

            <!-- Special Features -->
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-yellow-400 transition">
              <div class="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-black bg-opacity-40"></div>
                <svg class="w-20 h-20 text-yellow-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                </svg>
              </div>
              <div class="p-6">
                <h3 class="text-2xl font-bold text-yellow-400 mb-3">Special Features</h3>
                <p class="text-gray-300 mb-4">
                  Documentary-style content exploring veteran issues, community events, and special commemorations.
                  Stories that need to be told.
                </p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Documentary</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Events</span>
                  <span class="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">Special</span>
                </div>
                <a href="https://www.youtube.com/@VeteransScene" target="_blank" rel="noopener" class="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded transition">
                  View Features
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Where to Find Us -->
        <section class="mb-20">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-yellow-400 mb-4">Where to Find Our Content</h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto">
              Watch, listen, and engage with Veteran's Scene across multiple platforms.
            </p>
          </div>

          <div class="grid md:grid-cols-2 gap-8">
            <!-- YouTube Channel -->
            <div class="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-yellow-400 transition">
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0">
                  <div class="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                    <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-yellow-400 mb-3">YouTube Channel</h3>
                  <p class="text-gray-300 mb-4">
                    Subscribe to our YouTube channel for full episodes, clips, and behind-the-scenes content.
                    New videos uploaded weekly.
                  </p>
                  <a href="https://www.youtube.com/@VeteransScene" target="_blank" rel="noopener" class="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition">
                    Subscribe on YouTube
                  </a>
                </div>
              </div>
            </div>

            <!-- Podcast Platforms -->
            <div class="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-yellow-400 transition">
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0">
                  <div class="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                    <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                    </svg>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-yellow-400 mb-3">Podcast Platforms</h3>
                  <p class="text-gray-300 mb-4">
                    Listen to our podcast on your favorite platform. Available on Spotify, Apple Podcasts, Google Podcasts, and more.
                  </p>
                  <div class="text-gray-400 text-sm">
                    Coming soon to all major podcast platforms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Production Resources & Tutorials -->
        <section class="mb-20">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-yellow-400 mb-4">Production Resources</h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto">
              Learn about our production process and the tools we use to create quality content.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <!-- Zoom Setup -->
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-3">Zoom Recording Setup</h3>
              <p class="text-gray-300 mb-4 text-sm">
                Step-by-step guides for setting up Zoom for high-quality remote interviews and discussions.
              </p>
              <div class="text-gray-400 text-sm italic">Tutorial coming soon</div>
            </div>

            <!-- VDO.Ninja -->
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-3">VDO.Ninja Guide</h3>
              <p class="text-gray-300 mb-4 text-sm">
                Learn how to use VDO.Ninja for professional-quality streaming without downloads.
              </p>
              <div class="text-gray-400 text-sm italic">Tutorial coming soon</div>
            </div>

            <!-- Recording Best Practices -->
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-400 transition">
              <div class="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-yellow-400 mb-3">Best Practices</h3>
              <p class="text-gray-300 mb-4 text-sm">
                Tips for audio quality, lighting, and creating engaging content for our platform.
              </p>
              <div class="text-gray-400 text-sm italic">Guide coming soon</div>
            </div>
          </div>
        </section>

        <!-- Want to Participate Section -->
        <section class="bg-gray-800 rounded-lg p-8 md:p-12 border border-gray-700 mb-20">
          <div class="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 class="text-3xl font-bold text-yellow-400 mb-4">Share Your Story</h2>
              <p class="text-lg text-gray-300 mb-6">
                We're always looking for veterans with stories to tell. Whether you want to discuss your service,
                share lessons learned, or talk about challenges you've overcome - we want to hear from you.
              </p>
              <ul class="text-gray-300 mb-6 space-y-2">
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span>One-on-one interviews or panel discussions</span>
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span>Remote or in-person recording options</span>
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span>Technical support and guidance provided</span>
                </li>
              </ul>
              <router-link to="/apply" class="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-3 rounded-lg transition text-lg">
                Apply to Join Our Show
              </router-link>
            </div>
            <div class="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg p-8 border border-gray-600">
              <div class="aspect-square flex items-center justify-center">
                <svg class="w-32 h-32 text-yellow-400 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Episodes / Archive -->
        <section>
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-yellow-400 mb-4">Browse Our Archive</h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto mb-6">
              Explore our complete library of episodes, interviews, and special features.
            </p>
          </div>

          <div class="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div class="mb-6">
              <svg class="w-24 h-24 text-yellow-400 mx-auto mb-4 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
              <p class="text-gray-300 text-lg mb-6">
                Watch all our episodes, interviews, and special content on our YouTube channel.
              </p>
            </div>
            <a href="https://www.youtube.com/@VeteransScene" target="_blank" rel="noopener" class="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-3 rounded-lg transition text-lg">
              Visit Our YouTube Channel
            </a>
          </div>
        </section>

      </main>
    </div>
  `
};
