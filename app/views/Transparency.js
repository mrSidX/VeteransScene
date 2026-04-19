import { ref, computed, onMounted, nextTick } from 'vue';
import api from '../services/api.js';
import { tierForAmount, renderTier, TIERS } from '../utils/contributorTiers.js';

// Resolve the Stripe publishable key. We try (in order):
//  1. window.__STRIPE_PUBLIC_KEY__  (optional global injection)
//  2. /api/config/stripe endpoint   (not implemented — safe no-op)
//  3. null → Contribute button disabled with a friendly message
async function loadStripeJs() {
  if (window.Stripe) return window.Stripe;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    s.onload = () => resolve(window.Stripe);
    s.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(s);
  });
}

export default {
  name: 'Transparency',
  setup() {
    const loading = ref(true);
    const error = ref('');
    const recurring = ref([]);
    const oneTime = ref([]);
    const projectFund = ref({ totalContributed: 0, contributorCount: 0 });

    // Contribute modal state
    const showContribute = ref(false);
    const contributeTarget = ref(null); // { type, id, label, amountDue, amountContributed }
    const contributeAmount = ref(20);
    const contributeName = ref('');
    const contributeEmail = ref('');
    const contributeMessage = ref('');
    const contributeAnonymous = ref(false);
    const contributeShowRank = ref(false);
    const contributeShowAmount = ref(false);
    const contributeTheme = ref('military'); // 'military' | 'neutral'
    const contributeStatus = ref(''); // '', 'processing', 'success', 'error'
    const contributeError = ref('');

    // Parts expansion tracking (which equipment cards are showing their breakdown)
    const expandedParts = ref({});
    const togglePartsFor = (id) => { expandedParts.value[id] = !expandedParts.value[id]; };

    // Split one-time expenses into equipment-in-use vs still-seeking
    const equipmentInUse = computed(() => oneTime.value.filter(e => e.equipmentInUse));
    const oneTimeSeeking = computed(() => oneTime.value.filter(e => !e.equipmentInUse));

    // Leaderboard (Hall of Honor)
    const leaderboardLoading = ref(false);
    const leaderboardAllTime = ref([]);
    const leaderboardThisYear = ref([]);
    const leaderboardSeasonLabel = ref('');
    const leaderboardTab = ref('year'); // 'year' | 'all'

    // Live tier preview for whatever the contributor is about to give
    const contributeTierPreview = computed(() => {
      const t = tierForAmount(Number(contributeAmount.value) || 0);
      return renderTier(t, contributeTheme.value);
    });
    let stripeInstance = null;
    let stripeElements = null;

    const stripePublicKey = ref('');
    const stripeMode = ref('test');

    const fetchStripeKey = async () => {
      try {
        const res = await api.get('/site-settings/stripe-public-key', { auth: false });
        if (res.success && res.data.publicKey) {
          stripePublicKey.value = res.data.publicKey;
          stripeMode.value = res.data.mode;
        }
      } catch (err) {
        console.warn('Failed to fetch Stripe public key:', err);
      }
    };

    const fetchLeaderboard = async () => {
      leaderboardLoading.value = true;
      try {
        const res = await api.get('/contributions/leaderboard?limit=10', { auth: false });
        if (res.success) {
          leaderboardAllTime.value = res.data.allTime || [];
          leaderboardThisYear.value = res.data.thisYear || [];
          leaderboardSeasonLabel.value = res.data.seasonLabel || '';
        }
      } catch (err) {
        console.warn('Failed to load leaderboard:', err);
      } finally {
        leaderboardLoading.value = false;
      }
    };

    const fetchData = async () => {
      loading.value = true;
      try {
        const res = await api.get('/expenses/public', { auth: false });
        if (res.success) {
          recurring.value = res.data.recurring || [];
          oneTime.value = res.data.oneTime || [];
          projectFund.value = res.data.projectFund || { totalContributed: 0, contributorCount: 0 };
        }
      } catch (err) {
        error.value = err.message || 'Failed to load cost data';
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (n) => {
      const num = Number(n || 0);
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: num % 1 ? 2 : 0, maximumFractionDigits: 2 });
    };

    const categoryLabel = (c) => ({
      infrastructure: 'Infrastructure',
      software: 'Software',
      hardware: 'Hardware',
      services: 'Services',
      tools: 'Tools',
      other: 'Other'
    }[c] || 'Other');

    const intervalLabel = (i) => ({
      monthly: '/ month',
      yearly: '/ year',
      quarterly: '/ quarter',
      weekly: '/ week'
    }[i] || '');

    const sponsorButtonLabel = (i) => ({
      monthly: 'Sponsor this Month',
      yearly: 'Sponsor this Year',
      quarterly: 'Sponsor this Quarter',
      weekly: 'Sponsor this Week'
    }[i] || 'Sponsor this Period');

    // -----------------------------------------------------
    // Contribute flow
    // -----------------------------------------------------
    const openContribute = (target) => {
      contributeTarget.value = target;
      contributeAmount.value = Math.min(20, Math.max(1, Math.round((target.amountDue || 20) - (target.amountContributed || 0)) || 20));
      contributeName.value = '';
      contributeEmail.value = '';
      contributeMessage.value = '';
      contributeAnonymous.value = false;
      contributeShowRank.value = false;
      contributeShowAmount.value = false;
      contributeTheme.value = 'military';
      contributeStatus.value = '';
      contributeError.value = '';
      stripeElements = null;
      showContribute.value = true;
    };

    const openProjectContribute = () => {
      openContribute({ type: 'project', id: null, label: 'General Project Fund' });
    };

    const closeContribute = () => {
      showContribute.value = false;
      contributeTarget.value = null;
      stripeElements = null;
      const mountEl = document.getElementById('stripe-payment-element');
      if (mountEl) mountEl.innerHTML = '';
    };

    const startPayment = async () => {
      contributeError.value = '';
      if (!contributeAmount.value || Number(contributeAmount.value) < 1) {
        contributeError.value = 'Please enter an amount of at least $1';
        return;
      }

      contributeStatus.value = 'processing';
      try {
        // 1. Create PaymentIntent on the server
        const intentRes = await api.post('/contributions/intent', {
          amount: Number(contributeAmount.value),
          target: contributeTarget.value.type,
          targetId: contributeTarget.value.id,
          displayName: contributeName.value || 'Anonymous',
          email: contributeEmail.value,
          message: contributeMessage.value,
          isAnonymous: contributeAnonymous.value,
          showRank: contributeShowRank.value,
          showAmount: contributeShowAmount.value,
          insigniaTheme: contributeTheme.value
        }, { auth: false });

        if (!intentRes.success) throw new Error(intentRes.message || 'Failed to start payment');

        // 2. Load Stripe.js lazily
        if (!stripePublicKey.value) {
          throw new Error('Stripe is not configured yet. Please try again later.');
        }
        await loadStripeJs();
        if (!stripeInstance) stripeInstance = window.Stripe(stripePublicKey.value);

        // 3. Mount Payment Element
        stripeElements = stripeInstance.elements({
          clientSecret: intentRes.data.clientSecret,
          appearance: { theme: 'night', labels: 'floating' }
        });
        const paymentElement = stripeElements.create('payment');
        await nextTick();
        paymentElement.mount('#stripe-payment-element');

        contributeStatus.value = 'ready';
      } catch (err) {
        contributeError.value = err.message || 'Failed to start payment';
        contributeStatus.value = 'error';
      }
    };

    const confirmPayment = async () => {
      if (!stripeInstance || !stripeElements) return;
      contributeError.value = '';
      contributeStatus.value = 'processing';
      try {
        const { error: stripeError } = await stripeInstance.confirmPayment({
          elements: stripeElements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required'
        });

        if (stripeError) {
          contributeError.value = stripeError.message;
          contributeStatus.value = 'error';
          return;
        }

        contributeStatus.value = 'success';
        // Refresh data so the new contribution and progress appear (after webhook)
        // There's a small delay while the webhook processes; we retry a few times.
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 1500));
          await Promise.all([fetchData(), fetchLeaderboard()]);
        }
      } catch (err) {
        contributeError.value = err.message || 'Payment failed';
        contributeStatus.value = 'error';
      }
    };

    onMounted(async () => {
      await Promise.all([fetchData(), fetchStripeKey(), fetchLeaderboard()]);
    });

    return {
      loading, error, recurring, oneTime, projectFund,
      showContribute, contributeTarget, contributeAmount, contributeName, contributeEmail, contributeMessage, contributeAnonymous,
      contributeShowRank, contributeShowAmount, contributeTheme, contributeTierPreview,
      contributeStatus, contributeError,
      openContribute, openProjectContribute, closeContribute, startPayment, confirmPayment,
      formatCurrency, categoryLabel, intervalLabel, sponsorButtonLabel,
      stripePublicKey, stripeMode,
      leaderboardLoading, leaderboardAllTime, leaderboardThisYear, leaderboardSeasonLabel, leaderboardTab,
      expandedParts, togglePartsFor, equipmentInUse, oneTimeSeeking
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <!-- Header -->
      <div class="border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-900/50">
        <div class="max-w-6xl mx-auto px-4 py-10">
          <div class="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
            <span>Transparency</span>
            <span>/</span>
            <span class="text-teal-400">Costs</span>
          </div>
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <h1 class="text-3xl md:text-4xl font-bold text-white">Cost Transparency</h1>
            <span v-if="stripeMode === 'test'" class="text-xs px-2 py-1 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 font-semibold uppercase tracking-wide">Test Mode — no real charges</span>
          </div>
          <p class="text-gray-400 max-w-3xl">
            Every dollar it takes to keep Veterans Scene running — in the open. Below are the
            ongoing bills and the one-time tools &amp; equipment we rely on. If you'd like to help
            carry any of it, you can sponsor a specific line item or contribute to the general fund.
          </p>

          <!-- General fund card -->
          <div class="mt-6 rounded-xl border border-purple-500/30 bg-purple-900/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div class="flex-1">
              <div class="text-sm text-purple-300 font-semibold uppercase tracking-wide">General Project Fund</div>
              <div class="text-gray-300 text-sm mt-1">
                Flexible contributions that go wherever they're needed most.
                <span class="text-white font-semibold">{{ formatCurrency(projectFund.totalContributed) }}</span>
                contributed to date from
                <span class="text-white font-semibold">{{ projectFund.contributorCount }}</span>
                {{ projectFund.contributorCount === 1 ? 'supporter' : 'supporters' }}.
              </div>
            </div>
            <button
              @click="openProjectContribute"
              class="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all hover:scale-[1.02]"
            >
              Sponsor the Project
            </button>
          </div>
        </div>
      </div>

      <!-- Loading / error -->
      <div v-if="loading" class="max-w-6xl mx-auto px-4 py-12 text-center text-gray-400">
        Loading cost breakdown...
      </div>
      <div v-else-if="error" class="max-w-6xl mx-auto px-4 py-12 text-center text-red-400">
        {{ error }}
      </div>

      <div v-else class="max-w-6xl mx-auto px-4 py-8 space-y-12">
        <!-- RECURRING -->
        <section>
          <div class="flex items-end justify-between mb-4">
            <div>
              <h2 class="text-2xl font-bold text-white">Ongoing Monthly &amp; Yearly Costs</h2>
              <p class="text-sm text-gray-500 mt-1">The bills that keep the lights on — every month, every year.</p>
            </div>
          </div>

          <div v-if="recurring.length === 0" class="text-gray-500 italic">No recurring expenses listed yet.</div>

          <div v-else class="grid gap-4 md:grid-cols-2">
            <div
              v-for="exp in recurring"
              :key="exp._id"
              class="rounded-xl border border-gray-800 bg-gray-800/40 p-5 hover:border-teal-500/40 transition-all"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span v-if="exp.iconEmoji" class="text-2xl flex-shrink-0">{{ exp.iconEmoji }}</span>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-white truncate">{{ exp.name }}</h3>
                    <div class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <span>{{ categoryLabel(exp.category) }}</span>
                      <span v-if="exp.equipmentInUse" class="inline-flex items-center gap-1 text-[10px] normal-case tracking-normal text-emerald-400/80" title="Owned and actively used in production">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>in use
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xl font-bold text-teal-400">{{ formatCurrency(exp.amount) }}</div>
                  <div class="text-xs text-gray-500">{{ intervalLabel(exp.recurringInterval) }}</div>
                </div>
              </div>

              <p v-if="exp.description" class="text-sm text-gray-400 mb-2">{{ exp.description }}</p>
              <div v-if="exp.justification" class="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-3 mb-3">
                Why this tier: {{ exp.justification }}
              </div>
              <a v-if="exp.vendorUrl" :href="exp.vendorUrl" target="_blank" rel="noopener" class="text-xs text-teal-400 hover:text-teal-300 inline-block mb-3">Vendor →</a>

              <!-- Current period progress -->
              <div v-if="exp.currentPeriod" class="mt-3 pt-3 border-t border-gray-800">
                <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>{{ exp.currentPeriod.periodLabel }}</span>
                  <span>
                    <span class="text-white font-semibold">{{ formatCurrency(exp.currentPeriod.amountContributed) }}</span>
                    of {{ formatCurrency(exp.currentPeriod.amountDue) }}
                  </span>
                </div>
                <div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                    :style="{ width: exp.currentPeriod.progressPercent + '%' }"
                  ></div>
                </div>
                <div class="flex items-center justify-between mt-3">
                  <div v-if="exp.currentPeriod.status === 'fulfilled'" class="text-xs text-emerald-400 font-semibold">Fully covered this period — thank you!</div>
                  <div v-else-if="exp.currentPeriod.status === 'paid'" class="text-xs text-gray-500">Paid in full</div>
                  <div v-else class="text-xs text-gray-500">{{ 100 - exp.currentPeriod.progressPercent }}% remaining</div>
                  <button
                    v-if="exp.currentPeriod.status === 'open'"
                    @click="openContribute({
                      type: 'period',
                      id: exp.currentPeriod._id,
                      label: exp.currentPeriod.periodLabel,
                      amountDue: exp.currentPeriod.amountDue,
                      amountContributed: exp.currentPeriod.amountContributed
                    })"
                    class="px-3 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all"
                  >
                    {{ sponsorButtonLabel(exp.recurringInterval) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- EQUIPMENT IN USE -->
        <section v-if="equipmentInUse.length > 0">
          <div class="mb-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
              <span class="text-emerald-400">🛠️</span> Equipment In Use
            </h2>
            <p class="text-sm text-gray-500 mt-1">Gear we already own and use in production. Listed for transparency — no contribution needed.</p>
            <div class="mt-3 text-xs text-gray-400 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 flex items-start gap-2">
              <span class="text-amber-400 flex-shrink-0">ⓘ</span>
              <span>Costs shown reflect the price paid <strong class="text-white">at the time of purchase</strong>. Current market values, resale values, and depreciation are not accounted for. This page exists to disclose actual money spent — not current asset value.</span>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div
              v-for="exp in equipmentInUse"
              :key="exp._id"
              class="rounded-xl border border-gray-800 bg-gray-800/40 p-5 hover:border-emerald-500/40 transition-all"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span v-if="exp.iconEmoji" class="text-2xl flex-shrink-0">{{ exp.iconEmoji }}</span>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-white truncate">{{ exp.name }}</h3>
                    <div class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <span>{{ categoryLabel(exp.category) }}</span>
                      <span class="inline-flex items-center gap-1 text-[10px] normal-case tracking-normal text-emerald-400/80">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>in use
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xl font-bold text-emerald-400">{{ formatCurrency(exp.amount) }}</div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wide">at purchase</div>
                </div>
              </div>

              <p v-if="exp.description" class="text-sm text-gray-400 mb-2">{{ exp.description }}</p>
              <div v-if="exp.justification" class="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-3 mb-3">
                Why: {{ exp.justification }}
              </div>
              <a v-if="exp.vendorUrl" :href="exp.vendorUrl" target="_blank" rel="noopener" class="text-xs text-emerald-400 hover:text-emerald-300 inline-block mb-2">Link →</a>

              <!-- Parts breakdown -->
              <div v-if="exp.parts && exp.parts.length > 0" class="mt-3 pt-3 border-t border-gray-800">
                <button
                  @click="togglePartsFor(exp._id)"
                  class="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition"
                >
                  <span class="font-semibold uppercase tracking-wide">{{ exp.parts.length }} part{{ exp.parts.length === 1 ? '' : 's' }}</span>
                  <span class="text-gray-500">{{ expandedParts[exp._id] ? 'Hide ▲' : 'Show breakdown ▼' }}</span>
                </button>
                <div v-if="expandedParts[exp._id]" class="mt-3 space-y-2">
                  <div
                    v-for="(part, idx) in exp.parts"
                    :key="idx"
                    class="text-xs rounded border border-gray-800 bg-gray-900/60 p-2 flex items-start justify-between gap-3"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="text-white font-medium truncate">{{ part.name }}</div>
                      <div v-if="part.notes" class="text-gray-500 text-[11px] mt-0.5">{{ part.notes }}</div>
                      <a v-if="part.vendorUrl" :href="part.vendorUrl" target="_blank" rel="noopener" class="text-[11px] text-emerald-400/80 hover:text-emerald-300 inline-block mt-0.5">Vendor →</a>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="text-emerald-400 font-bold">{{ formatCurrency(part.cost) }}</div>
                      <div v-if="part.purchasedAt" class="text-[10px] text-gray-500">{{ new Date(part.purchasedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ONE TIME — Seeking Funding -->
        <section>
          <div class="mb-4">
            <h2 class="text-2xl font-bold text-white">One-Time Expenses</h2>
            <p class="text-sm text-gray-500 mt-1">Tools, hardware, and upgrades we're actively raising funds for.</p>
          </div>

          <div v-if="oneTimeSeeking.length === 0" class="text-gray-500 italic">No one-time expenses currently seeking funding.</div>

          <div v-else class="grid gap-4 md:grid-cols-2">
            <div
              v-for="exp in oneTimeSeeking"
              :key="exp._id"
              class="rounded-xl border border-gray-800 bg-gray-800/40 p-5 hover:border-purple-500/40 transition-all"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span v-if="exp.iconEmoji" class="text-2xl flex-shrink-0">{{ exp.iconEmoji }}</span>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-white truncate">{{ exp.name }}</h3>
                    <div class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <span>{{ categoryLabel(exp.category) }}</span>
                      <span v-if="exp.equipmentInUse" class="inline-flex items-center gap-1 text-[10px] normal-case tracking-normal text-emerald-400/80" title="Owned and actively used in production">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>in use
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xl font-bold text-purple-400">{{ formatCurrency(exp.amount) }}</div>
                  <div class="text-xs text-gray-500">one-time</div>
                </div>
              </div>

              <p v-if="exp.description" class="text-sm text-gray-400 mb-2">{{ exp.description }}</p>
              <div v-if="exp.justification" class="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-3 mb-3">
                Why: {{ exp.justification }}
              </div>
              <a v-if="exp.vendorUrl" :href="exp.vendorUrl" target="_blank" rel="noopener" class="text-xs text-purple-400 hover:text-purple-300 inline-block mb-3">Link →</a>

              <!-- Progress -->
              <div v-if="exp.seekingFunding" class="mt-3 pt-3 border-t border-gray-800">
                <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Crowd-funded so far</span>
                  <span>
                    <span class="text-white font-semibold">{{ formatCurrency(exp.oneTimeAmountContributed) }}</span>
                    of {{ formatCurrency(exp.amount) }}
                  </span>
                </div>
                <div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                    :style="{ width: exp.progressPercent + '%' }"
                  ></div>
                </div>
                <div class="flex items-center justify-between mt-3">
                  <div v-if="exp.oneTimeFulfilled" class="text-xs text-emerald-400 font-semibold">Fully funded — thank you!</div>
                  <div v-else class="text-xs text-gray-500">{{ 100 - exp.progressPercent }}% remaining</div>
                  <button
                    v-if="!exp.oneTimeFulfilled"
                    @click="openContribute({
                      type: 'expense',
                      id: exp._id,
                      label: exp.name,
                      amountDue: exp.amount,
                      amountContributed: exp.oneTimeAmountContributed
                    })"
                    class="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
                  >
                    Contribute
                  </button>
                </div>
              </div>
              <div v-else class="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 italic">
                Already paid for — listed for transparency.
              </div>
            </div>
          </div>
        </section>

        <!-- HALL OF HONOR -->
        <section>
          <div class="mb-4 flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                <span class="text-amber-400">🏛️</span> Hall of Honor
              </h2>
              <p class="text-sm text-gray-500 mt-1">The supporters keeping the lights on. Contributors opt in to be listed — others keep their support private.</p>
            </div>
            <div class="flex gap-1 p-1 rounded-lg bg-gray-800 border border-gray-700">
              <button
                @click="leaderboardTab = 'year'"
                :class="['px-3 py-1 text-xs font-semibold rounded transition', leaderboardTab === 'year' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white']"
              >
                {{ leaderboardSeasonLabel || 'This Year' }}
              </button>
              <button
                @click="leaderboardTab = 'all'"
                :class="['px-3 py-1 text-xs font-semibold rounded transition', leaderboardTab === 'all' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white']"
              >
                All Time
              </button>
            </div>
          </div>

          <div v-if="leaderboardLoading" class="text-center py-8 text-gray-500 text-sm">Loading contributors...</div>

          <template v-else>
            <div v-if="(leaderboardTab === 'year' ? leaderboardThisYear : leaderboardAllTime).length === 0" class="rounded-xl border border-dashed border-gray-800 bg-gray-800/20 p-8 text-center">
              <div class="text-4xl mb-2">🎗️</div>
              <div class="text-gray-400 text-sm">No listed contributors yet. Be the first to lend your support — and rank up!</div>
            </div>

            <div v-else class="grid gap-2">
              <div
                v-for="entry in (leaderboardTab === 'year' ? leaderboardThisYear : leaderboardAllTime)"
                :key="entry.rank + '-' + entry.displayName"
                class="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/40 hover:bg-gray-800/60 hover:border-amber-500/30 transition-all p-3"
              >
                <!-- Rank number -->
                <div class="w-8 text-center font-bold text-gray-500 text-sm">#{{ entry.rank }}</div>

                <!-- Token: coin with insignia -->
                <div
                  v-if="entry.tier"
                  class="relative w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-2xl shadow-lg"
                  :style="{ background: 'radial-gradient(circle at 30% 30%, rgba(252,211,77,0.35), rgba(180,83,9,0.25) 60%, rgba(120,53,15,0.15) 100%)', border: '2px solid rgba(252,211,77,0.5)' }"
                  :title="entry.tier.label"
                >
                  <span>{{ entry.tier.emoji }}</span>
                </div>
                <div v-else class="w-12 h-12 flex-shrink-0 rounded-full bg-gray-800 border-2 border-gray-700"></div>

                <!-- Name + rank label -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-white truncate">{{ entry.displayName }}</div>
                  <div v-if="entry.tier" class="text-xs text-amber-400/80">{{ entry.tier.label }}</div>
                </div>

                <!-- Amount (if opted in) -->
                <div v-if="entry.total !== null" class="text-right flex-shrink-0">
                  <div class="text-sm font-bold text-emerald-400">{{ formatCurrency(entry.total) }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-gray-500">{{ entry.contributionCount }} {{ entry.contributionCount === 1 ? 'gift' : 'gifts' }}</div>
                </div>
                <div v-else class="text-right flex-shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                  {{ entry.contributionCount }} {{ entry.contributionCount === 1 ? 'gift' : 'gifts' }}
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>

      <!-- Contribute Modal -->
      <div v-if="showContribute" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="closeContribute">
        <div class="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="text-xs uppercase tracking-wide text-teal-400 mb-1">Contribute to</div>
                <h3 class="text-xl font-bold text-white">{{ contributeTarget?.label }}</h3>
              </div>
              <button @click="closeContribute" class="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <!-- Success state -->
            <div v-if="contributeStatus === 'success'" class="text-center py-8">
              <div class="text-5xl mb-3">🙏</div>
              <h4 class="text-xl font-bold text-white mb-2">Thank you!</h4>
              <p class="text-gray-400">Your contribution has been received. You should see a receipt from Stripe in your email.</p>
              <button @click="closeContribute" class="mt-6 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold">Close</button>
            </div>

            <!-- Form state -->
            <div v-else-if="contributeStatus !== 'ready'" class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Amount (USD)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    v-model="contributeAmount"
                    type="number"
                    min="1"
                    step="1"
                    class="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div class="flex gap-2 mt-2">
                  <button v-for="preset in [5, 10, 20, 50, 100]" :key="preset" @click="contributeAmount = preset"
                    class="px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 hover:border-teal-500 hover:text-white">
                    \${{ preset }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-1">Display name</label>
                <input
                  v-model="contributeName"
                  type="text"
                  placeholder="Anonymous"
                  maxlength="80"
                  class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-1">Email (for receipt)</label>
                <input
                  v-model="contributeEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-1">Message (optional)</label>
                <textarea
                  v-model="contributeMessage"
                  rows="2"
                  maxlength="500"
                  class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                ></textarea>
              </div>

              <label class="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" v-model="contributeAnonymous" class="rounded" />
                Show as "Anonymous" publicly
              </label>

              <!-- Recognition / exposure opt-ins -->
              <div v-if="!contributeAnonymous" class="rounded-lg border border-amber-900/30 bg-amber-950/10 p-3 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs uppercase tracking-wide text-amber-400/80 font-semibold">Recognition (optional)</div>
                  <div v-if="contributeTierPreview" class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                      :style="{ background: 'radial-gradient(circle at 30% 30%, rgba(252,211,77,0.35), rgba(180,83,9,0.25) 60%, rgba(120,53,15,0.15) 100%)', border: '2px solid rgba(252,211,77,0.5)' }"
                    >{{ contributeTierPreview.emoji }}</div>
                    <div class="text-xs text-amber-300 font-semibold">{{ contributeTierPreview.label }}</div>
                  </div>
                </div>

                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" v-model="contributeShowRank" class="rounded" />
                  List me on the Hall of Honor with my rank
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" v-model="contributeShowAmount" class="rounded" />
                  Show the amount I've contributed
                </label>

                <div>
                  <div class="text-xs text-gray-400 mb-1.5">Insignia style</div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="contributeTheme = 'military'"
                      :class="['px-3 py-2 rounded-lg border text-sm font-semibold transition', contributeTheme === 'military' ? 'border-amber-500 bg-amber-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white']"
                    >
                      🎖️ Military
                    </button>
                    <button
                      type="button"
                      @click="contributeTheme = 'neutral'"
                      :class="['px-3 py-2 rounded-lg border text-sm font-semibold transition', contributeTheme === 'neutral' ? 'border-emerald-500 bg-emerald-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white']"
                    >
                      🌿 Neutral
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="contributeError" class="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
                {{ contributeError }}
              </div>

              <button
                @click="startPayment"
                :disabled="contributeStatus === 'processing'"
                class="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold"
              >
                {{ contributeStatus === 'processing' ? 'Preparing payment...' : 'Continue to Payment' }}
              </button>
            </div>

            <!-- Payment ready state -->
            <div v-show="contributeStatus === 'ready' || contributeStatus === 'processing'" :class="contributeStatus === 'ready' || contributeStatus === 'processing' ? 'space-y-4' : 'hidden'">
              <div class="text-sm text-gray-400">
                Contributing <span class="text-white font-bold">{{ formatCurrency(contributeAmount) }}</span>
                to <span class="text-teal-400">{{ contributeTarget?.label }}</span>.
              </div>
              <div id="stripe-payment-element" class="bg-gray-800 p-3 rounded-lg"></div>
              <div v-if="contributeError" class="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
                {{ contributeError }}
              </div>
              <button
                @click="confirmPayment"
                :disabled="contributeStatus === 'processing'"
                class="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold"
              >
                {{ contributeStatus === 'processing' ? 'Processing...' : 'Pay ' + formatCurrency(contributeAmount) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
