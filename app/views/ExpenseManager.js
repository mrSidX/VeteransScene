import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

const blankExpense = () => ({
  _id: null,
  name: '',
  description: '',
  justification: '',
  category: 'infrastructure',
  amount: 0,
  type: 'recurring',
  recurringInterval: 'monthly',
  recurringDueDay: null,
  iconEmoji: '',
  vendorUrl: '',
  displayOrder: 100,
  seekingFunding: true,
  equipmentInUse: false,
  parts: [],
  isActive: true
});

const blankPart = () => ({ name: '', cost: 0, purchasedAt: '', vendorUrl: '', notes: '' });

export default {
  name: 'ExpenseManager',
  setup() {
    const expenses = ref([]);
    const loading = ref(true);
    const error = ref('');
    const activeTab = ref('recurring'); // 'recurring' | 'one_time'
    const showForm = ref(false);
    const editing = ref(blankExpense());
    const saving = ref(false);
    const formError = ref('');

    const filtered = computed(() =>
      expenses.value.filter(e => e.type === activeTab.value).sort((a, b) => (a.displayOrder || 100) - (b.displayOrder || 100))
    );

    const fetchAll = async () => {
      loading.value = true;
      try {
        const res = await api.get('/expenses');
        if (res.success) expenses.value = res.data.expenses;
      } catch (err) {
        error.value = err.message || 'Failed to load expenses';
      } finally {
        loading.value = false;
      }
    };

    const openNew = (type) => {
      editing.value = { ...blankExpense(), type };
      if (type === 'one_time') {
        editing.value.recurringInterval = null;
      }
      formError.value = '';
      showForm.value = true;
    };

    const openEdit = (exp) => {
      editing.value = { ...exp, parts: Array.isArray(exp.parts) ? exp.parts.map(p => ({
        name: p.name || '',
        cost: p.cost || 0,
        purchasedAt: p.purchasedAt ? String(p.purchasedAt).slice(0, 10) : '',
        vendorUrl: p.vendorUrl || '',
        notes: p.notes || ''
      })) : [] };
      formError.value = '';
      showForm.value = true;
    };

    const addPart = () => {
      if (!Array.isArray(editing.value.parts)) editing.value.parts = [];
      editing.value.parts.push(blankPart());
    };
    const removePart = (idx) => {
      editing.value.parts.splice(idx, 1);
    };
    const partsTotal = computed(() => {
      if (!Array.isArray(editing.value.parts)) return 0;
      return editing.value.parts.reduce((s, p) => s + (Number(p.cost) || 0), 0);
    });

    const closeForm = () => {
      showForm.value = false;
      editing.value = blankExpense();
      formError.value = '';
    };

    const save = async () => {
      formError.value = '';
      if (!editing.value.name || !editing.value.amount) {
        formError.value = 'Name and amount are required';
        return;
      }
      saving.value = true;
      try {
        const payload = { ...editing.value };
        if (payload.type === 'one_time') {
          payload.recurringInterval = null;
          payload.recurringDueDay = null;
        }
        delete payload._id;

        if (editing.value._id) {
          await api.put('/expenses/' + editing.value._id, payload);
        } else {
          await api.post('/expenses', payload);
        }
        await fetchAll();
        closeForm();
      } catch (err) {
        formError.value = err.message || 'Failed to save';
      } finally {
        saving.value = false;
      }
    };

    const remove = async (exp) => {
      if (!confirm(`Delete "${exp.name}"? This also deletes all billing periods for it.`)) return;
      try {
        await api.delete('/expenses/' + exp._id);
        await fetchAll();
      } catch (err) {
        alert('Failed to delete: ' + (err.message || 'unknown error'));
      }
    };

    const toggleActive = async (exp) => {
      try {
        await api.put('/expenses/' + exp._id, { isActive: !exp.isActive });
        await fetchAll();
      } catch (err) {
        alert('Failed to toggle: ' + (err.message || 'unknown error'));
      }
    };

    const formatCurrency = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    onMounted(fetchAll);

    return {
      expenses, loading, error, activeTab, filtered,
      showForm, editing, saving, formError,
      openNew, openEdit, closeForm, save, remove, toggleActive,
      formatCurrency,
      addPart, removePart, partsTotal
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="mb-6">
          <router-link to="/dashboard" class="text-xs text-gray-500 hover:text-gray-300">← Back to Dashboard</router-link>
          <h1 class="text-2xl md:text-3xl font-bold text-white mt-2">Expense Manager</h1>
          <p class="text-sm text-gray-400 mt-1">Manage the items shown on the public Cost Transparency page.</p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-4 border-b border-gray-800">
          <button
            @click="activeTab = 'recurring'"
            :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === 'recurring' ? 'border-teal-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200']"
          >
            Recurring
          </button>
          <button
            @click="activeTab = 'one_time'"
            :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === 'one_time' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200']"
          >
            One-Time
          </button>
          <div class="ml-auto">
            <button
              @click="openNew(activeTab)"
              class="px-4 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              + Add {{ activeTab === 'recurring' ? 'Recurring' : 'One-Time' }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10 text-gray-500">Loading...</div>
        <div v-else-if="error" class="text-center py-10 text-red-400">{{ error }}</div>

        <div v-else-if="filtered.length === 0" class="text-center py-10 text-gray-500 italic">
          No {{ activeTab === 'recurring' ? 'recurring' : 'one-time' }} expenses yet.
        </div>

        <!-- List -->
        <div v-else class="grid gap-3">
          <div
            v-for="exp in filtered"
            :key="exp._id"
            :class="['rounded-lg border p-4 flex items-start gap-4', exp.isActive ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900/40 opacity-60']"
          >
            <span v-if="exp.iconEmoji" class="text-2xl flex-shrink-0">{{ exp.iconEmoji }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-white">{{ exp.name }}</h3>
                <span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{{ exp.category }}</span>
                <span v-if="!exp.isActive" class="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300">inactive</span>
                <span v-if="exp.equipmentInUse" class="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">in use</span>
              </div>
              <p v-if="exp.description" class="text-sm text-gray-400 mt-1 line-clamp-2">{{ exp.description }}</p>
              <div class="text-xs text-gray-500 mt-1">
                <span class="text-teal-400 font-semibold">{{ formatCurrency(exp.amount) }}</span>
                <span v-if="exp.type === 'recurring'"> / {{ exp.recurringInterval }}</span>
                <span v-else> · one-time</span>
                <span v-if="exp.type === 'one_time' && exp.seekingFunding"> · seeking {{ formatCurrency(exp.amount - (exp.oneTimeAmountContributed || 0)) }} more</span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <button @click="openEdit(exp)" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Edit</button>
              <button @click="toggleActive(exp)" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">
                {{ exp.isActive ? 'Hide' : 'Show' }}
              </button>
              <button @click="remove(exp)" class="px-3 py-1 text-xs rounded bg-red-900/60 hover:bg-red-800 text-white">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit / New modal -->
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="closeForm">
        <div class="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-bold text-white">{{ editing._id ? 'Edit' : 'New' }} {{ editing.type === 'recurring' ? 'Recurring' : 'One-Time' }} Expense</h3>
              <button @click="closeForm" class="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Name *</label>
                <input v-model="editing.name" type="text" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>

              <div>
                <label class="block text-xs text-gray-400 mb-1">Type</label>
                <select v-model="editing.type" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="recurring">Recurring</option>
                  <option value="one_time">One-Time</option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-400 mb-1">Category</label>
                <select v-model="editing.category" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="infrastructure">Infrastructure</option>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                  <option value="services">Services</option>
                  <option value="tools">Tools</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-400 mb-1">
                  Amount (USD) *
                  <span v-if="editing.parts && editing.parts.length > 0" class="text-teal-400">(auto from parts)</span>
                </label>
                <input
                  v-model.number="editing.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  :disabled="editing.parts && editing.parts.length > 0"
                  class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60"
                />
              </div>

              <div v-if="editing.type === 'recurring'">
                <label class="block text-xs text-gray-400 mb-1">Interval</label>
                <select v-model="editing.recurringInterval" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-400 mb-1">Icon (emoji)</label>
                <input v-model="editing.iconEmoji" type="text" maxlength="4" placeholder="📡" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>

              <div>
                <label class="block text-xs text-gray-400 mb-1">Display order</label>
                <input v-model.number="editing.displayOrder" type="number" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Vendor URL</label>
                <input v-model="editing.vendorUrl" type="url" placeholder="https://..." class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Description (what it is)</label>
                <textarea v-model="editing.description" rows="2" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"></textarea>
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Justification (why this tier/vendor)</label>
                <textarea v-model="editing.justification" rows="2" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"></textarea>
              </div>

              <div v-if="editing.type === 'one_time'" class="md:col-span-2">
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" v-model="editing.seekingFunding" />
                  Seeking funding (show contribute button on public page)
                </label>
              </div>

              <div class="md:col-span-2">
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" v-model="editing.equipmentInUse" />
                  Equipment in use (already owned &amp; actively used in production)
                </label>
              </div>

              <!-- Parts breakdown -->
              <div v-if="editing.type === 'one_time'" class="md:col-span-2 border-t border-gray-800 pt-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-sm font-semibold text-white">Parts / Components</div>
                    <div class="text-xs text-gray-500">List individual parts (e.g. CPU, GPU, mic). Costs are at time of purchase.</div>
                  </div>
                  <button type="button" @click="addPart" class="px-3 py-1 text-xs rounded bg-teal-700 hover:bg-teal-600 text-white font-semibold">
                    + Add Part
                  </button>
                </div>

                <div v-if="editing.parts && editing.parts.length > 0" class="space-y-2">
                  <div
                    v-for="(part, idx) in editing.parts"
                    :key="idx"
                    class="rounded-lg border border-gray-700 bg-gray-800/60 p-3 grid gap-2 md:grid-cols-12"
                  >
                    <div class="md:col-span-4">
                      <label class="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Name *</label>
                      <input v-model="part.name" type="text" placeholder="e.g. AMD Ryzen 9 5950X" class="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Cost *</label>
                      <input v-model.number="part.cost" type="number" step="0.01" min="0" class="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Purchased</label>
                      <input v-model="part.purchasedAt" type="date" class="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white" />
                    </div>
                    <div class="md:col-span-3">
                      <label class="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Vendor URL</label>
                      <input v-model="part.vendorUrl" type="url" placeholder="https://..." class="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white" />
                    </div>
                    <div class="md:col-span-1 flex items-end">
                      <button type="button" @click="removePart(idx)" class="w-full px-2 py-1.5 text-xs rounded bg-red-900/60 hover:bg-red-800 text-white">✕</button>
                    </div>
                    <div class="md:col-span-12">
                      <input v-model="part.notes" type="text" placeholder="Notes (optional, e.g. 'still in use', 'replaced in 2025')" class="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-300" />
                    </div>
                  </div>
                  <div class="text-right text-sm text-gray-400 pt-1">
                    Total: <span class="text-teal-400 font-bold">{{ formatCurrency(partsTotal) }}</span>
                  </div>
                </div>
                <div v-else class="text-xs text-gray-500 italic py-2">
                  No parts listed. The Amount field above is used as-is.
                </div>
              </div>

              <div class="md:col-span-2">
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" v-model="editing.isActive" />
                  Active (visible on public page)
                </label>
              </div>
            </div>

            <div v-if="formError" class="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
              {{ formError }}
            </div>

            <div class="flex gap-2 mt-5">
              <button @click="save" :disabled="saving" class="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold">
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button @click="closeForm" class="px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
