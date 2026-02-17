import RecordingNotificationBanner from '../components/RecordingNotificationBanner.js?v=20260211';

export default {
  name: 'Dashboard',
  components: {
    RecordingNotificationBanner
  },
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Header -->
      <div class="mb-4 flex items-center gap-4">
        <!-- Avatar -->
        <div class="flex-shrink-0">
          <div v-if="user?.avatarUrl" class="w-12 h-12 rounded-lg bg-gray-700 overflow-hidden border-2 border-yellow-400">
            <img :src="user.avatarUrl" :alt="user.firstName" class="w-full h-full object-cover">
          </div>
          <div v-else class="w-12 h-12 rounded-lg bg-yellow-600 flex items-center justify-center text-gray-900 font-bold text-lg border-2 border-yellow-400">
            {{ (user?.firstName || 'U')[0] }}{{ (user?.lastName || '')[0] }}
          </div>
        </div>
        <!-- Greeting -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-2xl font-bold text-white">Dashboard</h1>
            <info-helper topic-slug="dashboard-overview" size="md" />
          </div>
          <p class="text-gray-400 text-sm">Welcome back, {{ user.fullName || user.firstName || user.name || 'User' }}!</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>

      <!-- Dashboard Content -->
      <div v-else>
        <!-- Recording Notification Banner -->
        <recording-notification-banner />

        <!-- Tools Navigation Bar -->
        <div class="sticky top-0 z-10 bg-gray-900 py-2 -mx-4 px-4 mb-2 md:mb-4 border-b border-gray-800 flex flex-wrap gap-2 md:gap-3">
          <!-- Todo List Button -->
          <button
            v-if="hasAnyRole('admin', 'moderator')"
            @click="toggleDashPanel('todos')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03]',
              expandedDashPanels.todos
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-green-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300',
              expandedDashPanels.todos ? 'bg-green-500/30' : 'bg-gray-700 group-hover:bg-green-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <span class="text-xs md:text-sm">To Do List</span>
            <span v-if="todos.length > 0" class="text-xs px-1.5 py-0.5 bg-green-500/30 text-green-300 rounded-full font-medium">{{ todos.length }}</span>
          </button>

          <!-- Calendar Button -->
          <button
            v-if="hasAnyRole('admin', 'moderator')"
            @click="toggleDashPanel('calendar')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03]',
              expandedDashPanels.calendar
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-blue-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300',
              expandedDashPanels.calendar ? 'bg-blue-500/30' : 'bg-gray-700 group-hover:bg-blue-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-xs md:text-sm">Calendar</span>
            <span v-if="calendarEvents.length > 0" class="text-xs px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded-full font-medium">{{ calendarEvents.length }}</span>
          </button>

          <!-- My Segments Button -->
          <button
            v-if="hasAnyRole('admin', 'moderator', 'user')"
            @click="toggleDashPanel('mySegments')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03]',
              expandedDashPanels.mySegments
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-purple-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300',
              expandedDashPanels.mySegments ? 'bg-purple-500/30' : 'bg-gray-700 group-hover:bg-purple-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
              </svg>
            </div>
            <span class="text-xs md:text-sm">My Segments</span>
            <span v-if="(upcomingSegments?.length || 0) + (otherSegments?.length || 0) > 0" class="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded-full font-medium">{{ (upcomingSegments?.length || 0) + (otherSegments?.length || 0) }}</span>
          </button>

          <!-- Notifications Button -->
          <button
            @click="toggleDashPanel('notifications')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03] relative',
              expandedDashPanels.notifications
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/25'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-yellow-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300 relative',
              expandedDashPanels.notifications ? 'bg-yellow-500/30' : 'bg-gray-700 group-hover:bg-yellow-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span v-if="notifications.unread > 0" class="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full animate-pulse font-medium">{{ notifications.unread }}</span>
            </div>
            <span class="text-xs md:text-sm">Notifications</span>
          </button>

          <!-- Activity Button -->
          <button
            @click="toggleDashPanel('activity')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03]',
              expandedDashPanels.activity
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-indigo-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300',
              expandedDashPanels.activity ? 'bg-indigo-500/30' : 'bg-gray-700 group-hover:bg-indigo-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span class="text-xs md:text-sm">Activity</span>
          </button>

          <!-- Segments Button -->
          <button
            @click="navigateTo('/segments')"
            :class="[
              'group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-semibold transition-all duration-700 hover:scale-[1.03]',
              'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-purple-500/50'
            ]"
          >
            <div :class="[
              'p-1 md:p-1.5 rounded-lg transition-colors duration-300',
              expandedDashPanels.segments ? 'bg-purple-500/30' : 'bg-gray-700 group-hover:bg-purple-900/30'
            ]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
              </svg>
            </div>
            <span class="text-xs md:text-sm">Segments</span>
            <span v-if="segments.length > 0" class="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded-full font-medium">{{ segments.length }}</span>
          </button>
        </div>

        <!-- Reorderable Panels Container (flex layout for dynamic ordering) - appears ABOVE Overview -->
        <div class="flex flex-col gap-4 md:gap-6 mb-4 md:mb-6">

        <!-- Call-to-Actions (Urgent Items) -->
        <div v-if="callToActions.length > 0" class="mb-0" :style="{ order: 0 }">
          <h2 class="text-sm md:text-base font-semibold text-white mb-2">Action Required</h2>
          <div class="grid gap-2 md:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="action in callToActions"
              :key="action.type"
              @click="navigateTo(action.link)"
              :class="[
                'p-1.5 md:p-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg',
                action.priority === 'urgent' ? 'border-red-500 bg-red-900/20' :
                action.priority === 'high' ? 'border-orange-500 bg-orange-900/20' :
                'border-yellow-500 bg-yellow-900/20'
              ]"
            >
              <div class="flex items-start justify-between mb-1">
                <h3 class="text-white font-medium text-xs md:text-sm">{{ action.title }}</h3>
                <span :class="[
                  'px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ml-1',
                  action.priority === 'urgent' ? 'bg-red-600 text-white' :
                  action.priority === 'high' ? 'bg-orange-600 text-white' :
                  'bg-yellow-600 text-gray-900'
                ]">
                  {{ action.priority }}
                </span>
              </div>
              <p class="text-gray-300 text-xs mb-1.5">{{ action.description }}</p>
              <div class="flex items-center justify-between">
                <span class="text-white text-lg font-bold">{{ action.count }}</span>
                <span class="text-blue-400 text-xs hover:text-blue-300">View →</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Todo List Panel (Collapsible) -->
        <transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 max-h-0 -translate-y-8"
          enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-active-class="transition-all duration-700 ease-in"
          leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-to-class="opacity-0 max-h-0 -translate-y-8"
        >
        <div v-show="expandedDashPanels.todos && hasAnyRole('admin', 'moderator')" class="overflow-hidden" :style="{ order: getOrderFor('todos') }">
          <div class="bg-gray-800 border border-green-500/30 rounded-xl p-3 md:p-4 shadow-lg">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2 md:mb-2.5">
              <div class="flex items-center gap-1.5 flex-1 min-w-0">
                <div class="p-1 bg-green-600/20 rounded flex-shrink-0">
                  <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs md:text-sm font-bold text-white">To Do List</h3>
                  <p class="text-xs text-gray-400 hidden sm:block">{{ todos.length }} tasks</p>
                </div>
              </div>
              <select
                v-model="todoFilter"
                @change="loadTodos"
                class="w-full sm:w-auto bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1 h-8 md:h-auto"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="all">All Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <!-- Add Todo Form -->
            <div class="flex gap-1 mb-2 md:mb-3">
              <input
                v-model="newTodoTitle"
                @keyup.enter="createTodo"
                type="text"
                placeholder="Add task..."
                class="flex-1 bg-gray-700 border border-gray-600 text-white text-xs md:text-sm rounded px-2 py-1 md:py-1.5 placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
              />
              <button
                @click="createTodo"
                :disabled="!newTodoTitle.trim()"
                class="px-2.5 py-1 md:py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-medium text-xs md:text-sm rounded transition-colors flex-shrink-0 h-8 md:h-auto flex items-center justify-center"
              >
                Add
              </button>
            </div>

            <!-- Todo List -->
            <div class="space-y-0.5 md:space-y-1 max-h-[75vh] overflow-y-auto animate-in">
              <div v-if="todosLoading" class="text-center py-3">
                <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
              <div v-else-if="todos.length === 0" class="text-gray-400 text-sm text-center py-3">
                No tasks found
              </div>
              <template v-else v-for="todo in todos" :key="todo._id">
                <!-- Todo Item -->
                <div
                  :class="[
                    'bg-gray-750 rounded border transition-colors cursor-pointer group',
                    expandedTodoId === todo._id ? 'border-yellow-600 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-750/50'
                  ]"
                  @click="openEditTodoModal(todo)"
                >
                  <div class="flex items-start gap-1.5 md:gap-2 p-1.5 md:p-2">
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <!-- Title + Buttons (Single line on mobile) -->
                      <div class="flex items-start justify-between gap-1 mb-0.5">
                        <p :class="['text-xs md:text-sm font-medium truncate group-hover:text-yellow-400 transition-colors', todo.status === 'completed' ? 'text-gray-500 line-through' : 'text-white']" :title="todo.title">
                          {{ todo.title }}
                        </p>
                        <!-- Actions: Compact on mobile, more spaced on desktop -->
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                          <!-- Comments Button (Always visible) -->
                          <button
                            @click.stop="toggleTodoComments(todo)"
                            :class="[
                              'h-6 rounded transition-colors flex items-center justify-center text-xs flex-shrink-0 font-medium',
                              expandedTodoId === todo._id
                                ? 'bg-yellow-600 text-gray-900 px-1.5'
                                : todo.commentCount > 0
                                  ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 px-1.5'
                                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 px-1.5'
                            ]"
                            :title="todo.commentCount > 0 ? 'View comments' : 'Add a note'"
                          >
                            💬<span class="ml-0.5">{{ todo.commentCount > 0 ? todo.commentCount : '+' }}</span>
                          </button>

                          <!-- Menu Button -->
                          <div class="relative">
                            <button
                              @click.stop="$data.todoMenuOpenId = $data.todoMenuOpenId === todo._id ? null : todo._id"
                              class="h-6 w-6 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors text-xs flex items-center justify-center flex-shrink-0"
                              title="More options"
                            >
                              ⋮
                            </button>
                            <!-- Dropdown Menu -->
                            <div v-if="$data.todoMenuOpenId === todo._id" class="absolute right-0 mt-0.5 w-32 bg-gray-700 border border-gray-600 rounded shadow-lg z-10">
                              <button
                                @click="openEditTodoModal(todo); $data.todoMenuOpenId = null"
                                class="w-full text-left px-2.5 py-1.5 text-xs text-gray-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                              >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Edit
                              </button>
                              <button
                                @click="deleteTodo(todo); $data.todoMenuOpenId = null"
                                class="w-full text-left px-2.5 py-1.5 text-xs text-gray-300 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 border-t border-gray-600"
                              >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- Metadata (Priority + Due Date on one line) -->
                      <div class="flex flex-wrap items-center gap-1 text-xs" :class="expandedTodoId === todo._id ? 'block' : 'hidden md:flex'">
                        <span v-if="todo.priority" :class="getPriorityBadgeClass(todo.priority)" class="px-1 py-0.5 rounded text-xs font-medium">
                          {{ todo.priority }}
                        </span>
                        <span v-if="todo.dueDate" :class="['text-xs', isOverdue(todo) ? 'text-red-400 font-medium' : 'text-gray-400']">
                          📅 {{ formatDueDate(todo.dueDate) }}
                        </span>
                        <span v-if="todo.assignedTo" class="text-blue-400 hidden sm:inline text-xs">
                          👤 {{ todo.assignedTo.firstName }}
                        </span>
                      </div>
                      <!-- Description (Hidden on mobile unless expanded) -->
                      <p v-if="todo.description && expandedTodoId === todo._id" class="text-xs text-gray-400 mt-1">
                        {{ todo.description }}
                      </p>
                      <!-- Creator info (Hidden on mobile unless expanded) -->
                      <div v-if="expandedTodoId === todo._id" class="text-xs text-gray-500 mt-0.5">
                        Created by {{ todo.createdBy?.firstName ? todo.createdBy.firstName + ' ' + (todo.createdBy.lastName || '') : 'Unknown' }} • {{ formatDate(todo.createdAt) }}
                      </div>
                    </div>
                  </div>

                  <!-- Inline Expanded Comments Section -->
                  <div v-if="expandedTodoId === todo._id" @click.stop class="border-t border-gray-600 bg-gray-800 rounded-b">
                    <!-- Comments List -->
                    <div class="p-3 md:p-4 space-y-2 md:space-y-2.5 max-h-[50vh] overflow-y-auto">
                      <div v-if="todoCommentsLoading" class="flex items-center justify-center py-3">
                        <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                      <div v-else-if="todoComments.length === 0" class="text-gray-500 text-xs text-center py-3">
                        <p class="font-medium">No notes yet</p>
                        <p class="text-gray-600 text-xs mt-1">Be the first to add a note to this task</p>
                      </div>
                      <div
                        v-else
                        v-for="comment in todoComments"
                        :key="comment._id"
                        class="bg-gray-750 rounded p-2.5 md:p-3 border border-gray-600 hover:border-gray-500 transition-colors"
                      >
                        <div class="flex items-start justify-between gap-2 mb-1.5">
                          <div class="flex items-center gap-2 min-w-0 flex-1">
                            <!-- Avatar Image or Initials -->
                            <div v-if="comment.author?.profile?.avatarUrl" class="w-6 h-6 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                              <img :src="comment.author.avatarUrl" :alt="comment.author.firstName" class="w-full h-full object-cover">
                            </div>
                            <div v-else class="w-6 h-6 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-xs font-bold flex-shrink-0">
                              {{ getInitials(comment.author) }}
                            </div>
                            <div class="min-w-0">
                              <div class="flex items-center gap-1 flex-wrap">
                                <span class="text-white text-sm font-medium">{{ comment.author?.firstName }}</span>
                                <span v-if="comment.isEdited" class="text-gray-500 text-xs">(edited)</span>
                              </div>
                              <span class="text-gray-500 text-xs">{{ formatDate(comment.createdAt) }}</span>
                            </div>
                          </div>
                          <div class="flex items-center gap-1 flex-shrink-0 text-xs">
                            <button
                              v-if="canEditComment(comment)"
                              @click="startEditComment(comment)"
                              class="text-gray-500 hover:text-blue-400 hover:bg-blue-600/20 p-1 rounded transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              v-if="canDeleteComment(comment)"
                              @click="deleteComment(comment, todo)"
                              class="text-gray-500 hover:text-red-400 hover:bg-red-600/20 p-1 rounded transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <!-- Edit Mode -->
                        <div v-if="editingComment && editingComment._id === comment._id">
                          <textarea
                            v-model="editCommentContent"
                            rows="3"
                            class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-2.5 py-1.5 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/30 resize-none"
                          ></textarea>
                          <div class="flex justify-end gap-2 mt-1.5">
                            <button @click="cancelEditComment" class="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                              Cancel
                            </button>
                            <button
                              @click="saveEditComment()"
                              :disabled="!editCommentContent.trim()"
                              class="px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-medium rounded transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        <!-- Display Mode -->
                        <p v-else class="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{{ comment.content }}</p>
                      </div>
                    </div>

                    <!-- Add Comment Form -->
                    <div class="p-3 md:p-4 border-t border-gray-600 bg-gray-800/50">
                      <div class="flex gap-2 flex-col md:flex-row">
                        <input
                          v-model="newTodoComment"
                          @keyup.enter="addTodoComment(todo)"
                          type="text"
                          placeholder="Add a note or update..."
                          class="flex-1 bg-gray-700 border border-gray-600 text-white text-sm md:text-xs rounded px-3 py-2 md:py-1.5 placeholder-gray-400 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/30 min-h-10 md:min-h-8 transition-colors"
                        />
                        <button
                          @click="addTodoComment(todo)"
                          :disabled="!newTodoComment.trim() || addingComment"
                          class="px-3 md:px-2 py-2 md:py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-medium text-sm md:text-xs rounded transition-colors min-h-10 md:min-h-8 flex items-center justify-center whitespace-nowrap"
                        >
                          {{ addingComment ? '...' : 'Post' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        </transition>

        <!-- Calendar Panel (Collapsible) -->
        <transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 max-h-0 -translate-y-8"
          enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-active-class="transition-all duration-700 ease-in"
          leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-to-class="opacity-0 max-h-0 -translate-y-8"
        >
        <div v-show="expandedDashPanels.calendar && hasAnyRole('admin', 'moderator')" class="overflow-hidden w-full lg:w-1/2" :style="{ order: getOrderFor('calendar') }">
          <div class="bg-gray-800 border border-blue-500/30 rounded-xl p-3 shadow-lg">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-white flex items-center gap-1">
                <span>📅</span> Calendar
              </h3>
              <div class="flex items-center gap-1">
                <button
                  @click="openEventModal()"
                  class="text-xs bg-yellow-600 hover:bg-yellow-500 text-gray-900 px-2 py-0.5 rounded font-medium"
                >
                  + Event
                </button>
                <button
                  @click="changeMonth(-1)"
                  class="text-gray-400 hover:text-white px-1.5 py-0.5 text-xs"
                >
                  ◀
                </button>
                <span class="text-white text-xs font-medium min-w-[80px] text-center">
                  {{ currentMonthName }} {{ currentYear }}
                </span>
                <button
                  @click="changeMonth(1)"
                  class="text-gray-400 hover:text-white px-1.5 py-0.5 text-xs"
                >
                  ▶
                </button>
              </div>
            </div>

            <!-- Priority Filter -->
            <div class="flex flex-wrap gap-1 mb-2">
              <button
                v-for="filter in ['all', 'urgent', 'high', 'medium', 'low']"
                :key="filter"
                @click="calendarPriorityFilter = filter"
                :class="[
                  'px-2 py-0.5 text-xs rounded font-medium transition-colors',
                  calendarPriorityFilter === filter
                    ? 'bg-yellow-600 text-gray-900'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
              </button>
            </div>

            <!-- Mini Calendar Grid -->
            <div class="mb-2">
              <div class="grid grid-cols-7 gap-0.5 text-center mb-0.5">
                <span v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day" class="text-gray-500 text-xs">
                  {{ day }}
                </span>
              </div>
              <div class="grid grid-cols-7 gap-0.5">
                <div
                  v-for="(day, index) in calendarDays"
                  :key="index"
                  @click="day.date && selectDate(day.date)"
                  :class="[
                    'aspect-square flex flex-col items-center justify-center text-sm rounded cursor-pointer transition-colors relative',
                    !day.date ? 'invisible' : '',
                    day.isToday ? 'bg-yellow-600 text-gray-900 font-bold' : '',
                    day.isSelected && !day.isToday ? 'bg-blue-600 text-white' : '',
                    !day.isToday && !day.isSelected ? 'hover:bg-gray-700 text-gray-300' : '',
                    day.hasEvents ? 'font-medium' : ''
                  ]"
                >
                  <span>{{ day.date?.getDate() }}</span>
                  <div v-if="day.hasEvents" class="flex gap-0.5 mt-0.5">
                    <span
                      v-for="(color, i) in day.eventColors.slice(0, 3)"
                      :key="i"
                      :class="['w-1 h-1 rounded-full', color]"
                    ></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Upcoming Events List -->
            <div class="border-t border-gray-700 pt-2">
              <div class="flex items-center justify-between mb-1.5">
                <h4 class="text-xs font-medium text-gray-300">
                  {{ selectedDate ? formatSelectedDate(selectedDate) : 'Events' }}
                  <span v-if="!selectedDate && filteredCalendarEvents.length > 0" class="text-gray-500 text-xs ml-1">
                    ({{ filteredCalendarEvents.length }})
                  </span>
                </h4>
                <button v-if="selectedDate" @click="selectedDate = null" class="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                  Show All
                </button>
              </div>
              <div class="space-y-1 max-h-32 overflow-y-auto">
                <div v-if="filteredCalendarEvents.length === 0" class="text-gray-500 text-sm text-center py-4">
                  No upcoming events {{ selectedDate ? 'on this date' : 'in the next 30 days' }}
                </div>
                <div
                  v-for="event in filteredCalendarEvents.slice(0, 8)"
                  :key="event._id"
                  @click="event.isEvent ? openEventModal(event) : (event.link !== '#' ? navigateTo(event.link) : null)"
                  :class="[
                    'p-1.5 rounded border cursor-pointer transition-colors text-xs group',
                    getPriorityBorderClass(event.priority)
                  ]"
                >
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-white text-xs font-medium truncate flex-1">{{ event.title }}</span>
                    <div class="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        v-if="event.isEvent"
                        @click.stop="deleteCalendarEvent(event)"
                        class="text-gray-400 hover:text-red-400 text-xs px-0.5 transition-colors"
                        title="Delete event"
                      >
                        ✕
                      </button>
                      <span :class="getPriorityBadgeClass(event.priority)" class="px-1 py-0.5 text-xs rounded">
                        {{ event.type }}
                      </span>
                    </div>
                  </div>
                  <p class="text-gray-400 text-xs mt-0.5">{{ formatEventDate(event.date) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </transition>

        <!-- Notifications Panel (Collapsible) -->
        <transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 max-h-0 -translate-y-8"
          enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-active-class="transition-all duration-700 ease-in"
          leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-to-class="opacity-0 max-h-0 -translate-y-8"
        >
        <div v-show="expandedDashPanels.notifications && notifications.recent && notifications.recent.length > 0" class="overflow-hidden" :style="{ order: getOrderFor('notifications') }">
          <div class="bg-gray-800 border border-yellow-500/30 rounded-xl p-3 md:p-4 shadow-lg">
            <button
              class="w-full flex items-center justify-between text-left"
            >
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <span>🔔</span>
                Recent Notifications
                <span v-if="notifications.unread > 0" class="px-2 py-0.5 bg-red-600 text-white text-xs rounded">
                  {{ notifications.unread }}
                </span>
              </h3>
              <div class="flex items-center gap-3">
                <span @click.stop="navigateTo('/notifications')" class="text-blue-400 hover:text-blue-300 text-xs">
                  View All →
                </span>
                <svg :class="['w-4 h-4 transition-transform duration-700 flex-shrink-0', expandedDashPanels.notifications ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </button>
            <div class="mt-2 space-y-2">
              <div
                v-for="notification in notifications.recent.slice(0, 5)"
                :key="notification._id"
                @click="handleNotificationClick(notification)"
                :class="[
                  'p-2 rounded border cursor-pointer transition-colors text-sm',
                  !notification.read ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-750 border-gray-600 hover:border-gray-500'
                ]"
              >
                <div class="flex items-start justify-between mb-0.5">
                  <span class="text-white font-medium text-sm">{{ notification.title }}</span>
                  <span v-if="!notification.read" class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                </div>
                <p class="text-gray-400 text-xs">{{ notification.message }}</p>
                <p class="text-gray-500 text-xs mt-0.5">{{ formatDate(notification.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
        </transition>

        <!-- My Segments Panel (Collapsible) -->
        <transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 max-h-0 -translate-y-8"
          enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-active-class="transition-all duration-700 ease-in"
          leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-to-class="opacity-0 max-h-0 -translate-y-8"
        >
        <div v-show="expandedDashPanels.mySegments && ((upcomingSegments && upcomingSegments.length > 0) || (otherSegments && otherSegments.length > 0))" class="overflow-hidden" :style="{ order: getOrderFor('mySegments') }">
          <div class="bg-gray-800 border border-purple-500/30 rounded-xl p-3 md:p-4 shadow-lg">
            <button class="w-full flex items-center justify-between text-left mb-3">
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <span>🎬</span>My Segments
                <span class="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">{{ (upcomingSegments?.length || 0) + (otherSegments?.length || 0) }}</span>
              </h3>
              <div class="flex items-center gap-3">
                <span @click.stop="navigateTo('/segments')" class="text-blue-400 hover:text-blue-300 text-xs">
                  View All →
                </span>
                <svg :class="['w-4 h-4 transition-transform duration-700 flex-shrink-0', expandedDashPanels.mySegments ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </button>
            <div class="space-y-2">
              <!-- Upcoming Segments (at top) -->
              <div v-if="upcomingSegments && upcomingSegments.length > 0">
                <div class="text-xs text-purple-300 font-semibold mb-2 flex items-center gap-2">
                  <span>⏰</span> Upcoming
                </div>
                <div
                  v-for="segment in upcomingSegments.slice(0, 5)"
                  :key="segment._id + '-upcoming'"
                  @click="navigateTo('/segments/' + segment._id)"
                  class="p-2 bg-purple-900/20 rounded border-l-4 border-purple-500 hover:bg-purple-900/30 cursor-pointer transition-colors mb-2"
                >
                  <div class="flex items-start justify-between mb-1">
                    <span class="text-white font-medium text-sm">{{ segment.title }}</span>
                    <span :class="getStatusBadgeClass(segment.status)" class="px-2 py-0.5 text-xs rounded">
                      {{ segment.status }}
                    </span>
                  </div>
                  <p class="text-purple-300 text-xs font-medium mb-2">
                    📍 {{ formatScheduledDate(segment.scheduledDate) }}
                  </p>
                  <!-- VDO.ninja Join Section -->
                  <div v-if="segment.vdoNinja?.sessionCreated && segment.vdoNinja?.enabled" class="flex items-center justify-between gap-2 bg-green-900/30 rounded p-2 border border-green-700/50">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span class="text-green-300 text-xs font-semibold">Video Session Ready</span>
                    </div>
                    <button
                      v-if="getUserVdoJoinUrl(segment)"
                      @click.stop="openVdoJoinUrl(segment)"
                      class="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-semibold transition"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              <!-- Other Segments (below upcoming) -->
              <div v-if="otherSegments && otherSegments.length > 0">
                <div v-if="upcomingSegments && upcomingSegments.length > 0" class="border-t border-gray-700 my-2 pt-2">
                  <div class="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-2">
                    <span>📋</span> Other Segments
                  </div>
                </div>
                <div
                  v-for="segment in otherSegments.slice(0, 5)"
                  :key="segment._id + '-other'"
                  @click="navigateTo('/segments/' + segment._id)"
                  class="p-2 bg-gray-750 rounded border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
                >
                  <div class="flex items-start justify-between mb-1">
                    <span class="text-white font-medium text-sm">{{ segment.title }}</span>
                    <span :class="getStatusBadgeClass(segment.status)" class="px-2 py-0.5 text-xs rounded">
                      {{ segment.status }}
                    </span>
                  </div>
                  <p class="text-gray-400 text-xs mb-2">
                    {{ segment.scheduledDate ? formatDate(segment.scheduledDate) : 'Not scheduled' }}
                  </p>
                  <!-- VDO.ninja Join Section -->
                  <div v-if="segment.vdoNinja?.sessionCreated && segment.vdoNinja?.enabled" class="flex items-center justify-between gap-2 bg-green-900/30 rounded p-2 border border-green-700/50">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span class="text-green-300 text-xs font-semibold">Video Session Ready</span>
                    </div>
                    <button
                      v-if="getUserVdoJoinUrl(segment)"
                      @click.stop="openVdoJoinUrl(segment)"
                      class="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-semibold transition"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </transition>

        <!-- Activity Panel (Collapsible) -->
        <transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 max-h-0 -translate-y-8"
          enter-to-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-active-class="transition-all duration-700 ease-in"
          leave-from-class="opacity-100 max-h-[2000px] translate-y-0"
          leave-to-class="opacity-0 max-h-0 -translate-y-8"
        >
        <div v-show="expandedDashPanels.activity && recentActivity && recentActivity.length > 0" class="overflow-hidden" :style="{ order: getOrderFor('activity') }">
          <div class="bg-gray-800 border border-indigo-500/30 rounded-xl p-3 md:p-4 shadow-lg">
            <button class="w-full flex items-center justify-between text-left mb-2">
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <span>📋</span>
                Recent Activity
              </h3>
              <svg :class="['w-4 h-4 transition-transform duration-700 flex-shrink-0', expandedDashPanels.activity ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div class="space-y-2">
              <div
                v-for="activity in recentActivity.slice(0, 5)"
                :key="activity._id"
                class="flex items-start gap-2"
              >
                <div class="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <div class="flex-1">
                  <p class="text-white text-sm">{{ activity.description }}</p>
                  <p class="text-gray-500 text-xs">{{ formatDate(activity.createdAt) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </transition>

        </div>
        <!-- End Reorderable Panels Container -->

        <!-- Overview + Quick Actions Container (Side-by-Side) - appears BELOW reorderable panels -->
        <div class="grid gap-2 md:gap-3 lg:grid-cols-2 mb-2 md:mb-4">
          <!-- Stats Cards - Compact Overview -->
          <div v-if="Object.keys(stats).length > 0" class="bg-gray-800 border border-blue-500/30 rounded-lg">
            <button
              @click="toggleDashPanel('overview')"
              class="w-full p-2 md:p-2.5 flex items-center justify-between text-left hover:bg-gray-750 rounded-t-lg transition-colors duration-500"
            >
              <h3 class="text-sm md:text-base font-semibold text-white">Overview</h3>
              <svg :class="['w-4 h-4 transition-transform duration-700', expandedDashPanels.overview ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-show="expandedDashPanels.overview" class="p-2 md:p-2.5 border-t border-gray-700">
              <div class="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <div
                  v-for="(value, key) in stats"
                  :key="key"
                  class="bg-gray-750 border border-gray-600 rounded-lg p-1.5 md:p-2"
                >
                  <div class="text-gray-400 text-xs mb-0.5">{{ formatStatName(key) }}</div>
                  <div class="text-white text-lg font-bold">{{ value }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions for Navigation -->
          <div class="bg-gray-800 border border-yellow-500/30 rounded-lg">
            <button
              @click="toggleDashPanel('quickActions')"
              class="w-full p-2 md:p-2.5 flex items-center justify-between text-left hover:bg-gray-750 rounded-t-lg transition-colors duration-500"
            >
              <h3 class="text-sm md:text-base font-semibold text-white">Quick Actions</h3>
              <svg :class="['w-4 h-4 transition-transform duration-700', expandedDashPanels.quickActions ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-show="expandedDashPanels.quickActions" class="p-2 md:p-2.5 border-t border-gray-700">
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/applications')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Guest Applicants"
            >
              <span class="text-lg">👤</span>
              <span class="text-xs text-center">Applicants</span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/segments')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Segment Planner"
            >
              <span class="text-lg">🎬</span>
              <span class="text-xs text-center">Segments</span>
            </button>
            <button
              v-if="hasAnyRole('admin')"
              @click="navigateTo('/users')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Manage Users"
            >
              <span class="text-lg">👥</span>
              <span class="text-xs text-center">Users</span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/flags')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs relative min-h-[56px] md:min-h-[44px]"
              title="Moderation Flags"
            >
              <span class="text-lg">🚩</span>
              <span class="text-xs text-center">Flags</span>
              <span v-if="stats.openFlags > 0" class="absolute -top-1 -right-1 px-1 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                {{ stats.openFlags }}
              </span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/highlights')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Highlights"
            >
              <span class="text-lg">⭐</span>
              <span class="text-xs text-center">Highlights</span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/mail')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Email"
            >
              <span class="text-lg">📧</span>
              <span class="text-xs text-center">Mail</span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/dropbox')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Dropbox"
            >
              <span class="text-lg">📁</span>
              <span class="text-xs text-center">Dropbox</span>
            </button>
            <button
              @click="navigateTo('/notifications')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-gray-750 hover:bg-gray-700 rounded border border-gray-600 hover:border-yellow-500 text-white transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Notifications"
            >
              <span class="text-lg">🔔</span>
              <span class="text-xs text-center">Notifications</span>
            </button>
            <button
              v-if="hasAnyRole('admin', 'moderator')"
              @click="navigateTo('/segments/new')"
              class="flex flex-col items-center justify-center gap-1 px-1 py-2 bg-yellow-600 hover:bg-yellow-500 rounded border border-yellow-500 text-gray-900 font-medium transition-colors text-xs min-h-[56px] md:min-h-[44px]"
              title="Create New Segment"
            >
              <span class="text-lg">➕</span>
              <span class="text-xs text-center">New</span>
            </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Event Modal -->
        <div v-if="showEventModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeEventModal">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">
                {{ editingEvent ? 'Edit Event' : 'New Event' }}
              </h3>
              <button @click="closeEventModal" class="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            <form @submit.prevent="saveEvent" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  v-model="eventForm.title"
                  type="text"
                  required
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Event title"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                  <input
                    v-model="eventForm.startDate"
                    type="date"
                    required
                    class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Time</label>
                  <input
                    v-model="eventForm.startTime"
                    type="time"
                    class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    v-model="eventForm.eventType"
                    class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="recording">Recording</option>
                    <option value="interview">Interview</option>
                    <option value="broadcast">Broadcast</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                  <select
                    v-model="eventForm.priority"
                    class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Location / Link</label>
                <input
                  v-model="eventForm.location"
                  type="text"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Zoom link, address, etc."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  v-model="eventForm.description"
                  rows="2"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:border-yellow-500 focus:outline-none resize-none"
                  placeholder="Optional description"
                ></textarea>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  @click="closeEventModal"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="savingEvent"
                  class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium text-sm rounded transition-colors"
                >
                  {{ savingEvent ? 'Saving...' : (editingEvent ? 'Update' : 'Create') }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Role-Specific Widgets -->
        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Admin/Moderator: Urgent Flags -->
          <div v-if="hasAnyRole('admin', 'moderator') && urgentFlags.length > 0" class="bg-gray-800 border border-red-500/30 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-white">Urgent Flags</h3>
              <button @click="navigateTo('/flags?priority=urgent')" class="text-blue-400 hover:text-blue-300 text-xs">
                View All →
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="flag in urgentFlags.slice(0, 5)"
                :key="flag._id"
                @click="navigateTo('/flags/' + flag._id)"
                class="p-2 bg-gray-750 rounded border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
              >
                <div class="flex items-start justify-between mb-1">
                  <span class="text-white font-medium text-sm">{{ flag.title }}</span>
                  <span class="px-2 py-0.5 bg-red-600 text-white text-xs rounded">URGENT</span>
                </div>
                <p class="text-gray-400 text-xs">{{ flag.flagType.replace(/_/g, ' ') }} • {{ formatDate(flag.createdAt) }}</p>
              </div>
            </div>
          </div>

          <!-- User: My Applications -->
          <div v-if="hasAnyRole('user') && applications && applications.length > 0" class="bg-gray-800 border border-green-500/30 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-white">My Applications</h3>
              <button @click="navigateTo('/my-applications')" class="text-blue-400 hover:text-blue-300 text-xs">
                View All →
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="app in applications"
                :key="app._id"
                @click="navigateTo('/applications/' + app._id)"
                class="p-2 bg-gray-750 rounded border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
              >
                <div class="flex items-start justify-between mb-1">
                  <span class="text-white font-medium text-sm">{{ app.title }}</span>
                  <span :class="getStatusBadgeClass(app.status)" class="px-2 py-0.5 text-xs rounded">
                    {{ app.status }}
                  </span>
                </div>
                <p class="text-gray-400 text-xs">{{ app.category }} • {{ formatDate(app.createdAt) }}</p>
              </div>
            </div>
          </div>

        <!-- Edit Todo Modal -->
        <div v-if="showEditTodoModal" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4">
              <div class="flex items-center justify-between">
                <h2 class="text-lg md:text-xl font-bold text-white">Edit Task</h2>
                <button
                  @click="showEditTodoModal = false"
                  class="text-gray-400 hover:text-white transition"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <p v-if="editingTodo && editingTodo.createdBy" class="text-xs text-gray-400 mt-1">
                Created by {{ editingTodo.createdBy.firstName }} {{ editingTodo.createdBy.lastName }} on {{ formatDate(editingTodo.createdAt) }}
              </p>
            </div>

            <!-- Form Content -->
            <form @submit.prevent="updateTodo" class="p-3 md:p-4 space-y-3 md:space-y-4">
              <!-- Status -->
              <div>
                <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">Status *</label>
                <select
                  v-model="editTodoForm.status"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:border-yellow-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <!-- Title -->
              <div>
                <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                <input
                  v-model="editTodoForm.title"
                  type="text"
                  required
                  placeholder="Enter task title..."
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  v-model="editTodoForm.description"
                  rows="3"
                  placeholder="Add task description..."
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:border-yellow-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <!-- Priority & Due Date -->
              <div class="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    v-model="editTodoForm.priority"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">Due Date</label>
                  <input
                    v-model="editTodoForm.dueDate"
                    type="date"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 pt-2 md:pt-4 border-t border-gray-700">
                <button
                  type="button"
                  @click="showEditTodoModal = false"
                  class="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition text-sm min-h-[40px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 px-3 md:px-4 py-2 md:py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-md transition text-sm min-h-[40px] flex items-center justify-center"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        </div>
      </div>
    </div>
  `,

  data() {
    return {
      loading: true,
      stats: {},
      callToActions: [],
      notifications: { unread: 0, recent: [] },
      urgentFlags: [],
      applications: [],
      segments: [],
      recentActivity: [],
      user: (() => {
        const userData = JSON.parse(localStorage.getItem('vs_user_data') || localStorage.getItem('user') || '{}');
        // Normalize roles to array format
        if (userData.email && !Array.isArray(userData.roles)) {
          userData.roles = userData.role ? [userData.role] : ['user'];
        }
        return userData;
      })(),

      // Todo List
      todos: [],
      todosLoading: false,
      todoFilter: 'pending',
      newTodoTitle: '',

      // Calendar
      currentDate: new Date(),
      selectedDate: null,
      calendarEvents: [],
      calendarPriorityFilter: 'all',

      // Event Modal
      showEventModal: false,
      editingEvent: null,
      savingEvent: false,
      eventForm: {
        title: '',
        startDate: '',
        startTime: '',
        eventType: 'other',
        priority: 'medium',
        location: '',
        description: ''
      },

      // Todo Comments - Inline Expanding View
      expandedTodoId: null,
      todoComments: [],
      todoCommentsLoading: false,
      newTodoComment: '',
      addingComment: false,
      editingComment: null,
      editCommentContent: '',

      // Todo Editing
      showEditTodoModal: false,
      editingTodo: null,
      editTodoForm: {
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      },

      // Dashboard panel expansion states
      expandedDashPanels: {
        todos: false,
        calendar: false,
        notifications: false,
        activity: false,
        mySegments: false,
        segments: false,
        overview: true,
        quickActions: true
      },

      // Panel ordering - most recently toggled appears first
      // Default order (for collapsed/new sessions)
      panelOrder: ['todos', 'calendar', 'notifications', 'activity', 'mySegments']
    };
  },

  computed: {
    currentYear() {
      return this.currentDate.getFullYear();
    },
    currentMonth() {
      return this.currentDate.getMonth();
    },
    currentMonthName() {
      return this.currentDate.toLocaleString('en-US', { month: 'long' });
    },
    calendarDays() {
      const days = [];
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Add empty slots for days before the first day of month
      for (let i = 0; i < firstDay.getDay(); i++) {
        days.push({ date: null });
      }

      // Add days of the month
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(this.currentYear, this.currentMonth, d);
        const dayEvents = this.getEventsForDate(date);
        days.push({
          date,
          isToday: date.getTime() === today.getTime(),
          isSelected: this.selectedDate && date.getTime() === this.selectedDate.getTime(),
          hasEvents: dayEvents.length > 0,
          eventColors: dayEvents.map(e => this.getPriorityDotColor(e.priority))
        });
      }

      return days;
    },
    filteredCalendarEvents() {
      let events = [...this.calendarEvents];

      // Filter by selected date or show upcoming
      if (this.selectedDate) {
        events = events.filter(e => {
          const eventDate = new Date(e.date);
          return eventDate.toDateString() === this.selectedDate.toDateString();
        });
      } else {
        // Show upcoming events (from today onwards, next 60 days)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        events = events.filter(e => {
          const eventDate = new Date(e.date);
          return eventDate >= now && eventDate <= futureDate;
        });
      }

      // Filter by priority
      if (this.calendarPriorityFilter !== 'all') {
        events = events.filter(e => e.priority === this.calendarPriorityFilter);
      }

      // Sort by date (soonest first)
      return events.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    upcomingSegments() {
      if (!this.segments || this.segments.length === 0) return [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return this.segments.filter(s => {
        if (!s.scheduledDate) return false;
        const scheduledDate = new Date(s.scheduledDate);
        return scheduledDate >= now;
      }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    },
    otherSegments() {
      if (!this.segments || this.segments.length === 0) return [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return this.segments.filter(s => {
        if (!s.scheduledDate) return true;
        const scheduledDate = new Date(s.scheduledDate);
        return scheduledDate < now;
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // Get panels in order, filtering for expanded ones
    orderedPanels() {
      return this.panelOrder.filter(panelName => this.expandedDashPanels[panelName]);
    }
  },

  async mounted() {
    // Redirect temporary users to guest dashboard
    if (this.$root.authStore?.user?.value?.isTemporary) {
      await this.$router.push('/guest-dashboard');
      return;
    }

    await this.loadDashboard();
    if (this.hasAnyRole('admin', 'moderator')) {
      await Promise.all([
        this.loadTodos(),
        this.loadCalendarEvents()
      ]);
    }
  },

  methods: {
    normalizeUser(user) {
      if (!user || !user.email) return user; // User not logged in yet

      // Ensure roles is always an array
      if (!Array.isArray(user.roles)) {
        if (user.role) {
          user.roles = [user.role];
        } else {
          user.roles = ['user'];
        }
      }
      return user;
    },

    toggleDashPanel(panelName) {
      this.expandedDashPanels[panelName] = !this.expandedDashPanels[panelName];

      // If opening (expanding) a panel, move it to the top of the order
      if (this.expandedDashPanels[panelName]) {
        // Remove panel from current position if it exists
        const index = this.panelOrder.indexOf(panelName);
        if (index > -1) {
          this.panelOrder.splice(index, 1);
        }
        // Add to front
        this.panelOrder.unshift(panelName);
      }
    },

    // Get CSS order value for a panel (for flexbox reordering)
    // Lower numbers appear first
    getOrderFor(panelName) {
      const index = this.panelOrder.indexOf(panelName);
      return index >= 0 ? index : 999; // Default to 999 if not in order list
    },

    hasAnyRole(...roles) {
      if (!this.user) return false;
      const userRoles = Array.isArray(this.user.roles) ? this.user.roles : [this.user.role];
      return roles.some(role => userRoles.includes(role));
    },

    async loadDashboard() {
      this.loading = true;
      try {
        const response = await window.api.getDashboard();
        if (response.success) {
          const data = response.data;
          this.stats = data.stats || {};
          this.callToActions = data.callToActions || [];
          this.notifications = data.notifications || { unread: 0, recent: [] };
          this.recentActivity = data.recentActivity || [];

          // Role-specific data
          if (data.flags) {
            this.urgentFlags = data.flags.urgent || [];
          }
          if (data.applications) {
            this.applications = data.applications;
          }
          if (data.segments) {
            this.segments = data.segments;
          }
        }
      } catch (err) {
        console.error('Load dashboard error:', err);
        this.$root.showToast?.('Failed to load dashboard', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadTodos() {
      this.todosLoading = true;
      try {
        const params = {};
        if (this.todoFilter === 'all') {
          params.status = 'pending,in-progress';
        } else if (this.todoFilter !== 'completed') {
          params.status = this.todoFilter;
        } else {
          params.status = 'completed';
        }
        const response = await window.api.getTodos(params);
        console.log('Load todos response:', response);
        if (response && response.success) {
          this.todos = response.data?.todos || [];
        }
      } catch (err) {
        console.error('Load todos error:', err);
      } finally {
        this.todosLoading = false;
      }
    },

    async createTodo() {
      if (!this.newTodoTitle.trim()) return;
      const titleToAdd = this.newTodoTitle.trim();
      this.newTodoTitle = ''; // Clear immediately for better UX

      try {
        const response = await window.api.createTodo({
          title: titleToAdd,
          priority: 'medium'
        });
        console.log('Create todo response:', response);

        if (response && response.success && response.data && response.data.todo) {
          const newTodo = {
            ...response.data.todo,
            commentCount: response.data.todo.commentCount || 0
          };
          // Add new todo to the beginning of the list if filter matches
          if (this.todoFilter === 'pending' || this.todoFilter === 'all') {
            this.todos = [newTodo, ...this.todos];
          }
          this.$root.showToast?.('Task added', 'success');
        } else {
          // Restore the title if failed
          this.newTodoTitle = titleToAdd;
          console.error('Unexpected response format:', response);
          this.$root.showToast?.('Failed to add task', 'error');
        }
      } catch (err) {
        console.error('Create todo error:', err);
        this.newTodoTitle = titleToAdd; // Restore title on error
        this.$root.showToast?.('Failed to add task', 'error');
      }
    },

    async toggleTodo(todo) {
      const todoId = todo._id;
      const originalStatus = todo.status;
      const newStatus = originalStatus === 'completed' ? 'pending' : 'completed';
      const index = this.todos.findIndex(t => t._id === todoId);

      // Optimistic update
      if (index !== -1) {
        const updatedTodos = [...this.todos];
        updatedTodos[index] = { ...updatedTodos[index], status: newStatus };
        this.todos = updatedTodos;
      }

      try {
        const response = await window.api.toggleTodo(todoId);
        console.log('Toggle todo response:', response);

        if (response && response.success && response.data && response.data.todo) {
          const serverTodo = response.data.todo;
          const currentIndex = this.todos.findIndex(t => t._id === todoId);

          if (currentIndex !== -1) {
            // Check if we need to remove based on filter
            if (this.todoFilter === 'pending' && serverTodo.status === 'completed') {
              this.todos = this.todos.filter(t => t._id !== todoId);
            } else if (this.todoFilter === 'completed' && serverTodo.status !== 'completed') {
              this.todos = this.todos.filter(t => t._id !== todoId);
            } else {
              // Update with server data
              const updatedTodos = [...this.todos];
              updatedTodos[currentIndex] = {
                ...serverTodo,
                commentCount: serverTodo.commentCount ?? todo.commentCount ?? 0
              };
              this.todos = updatedTodos;
            }
          }
          this.$root.showToast?.(serverTodo.status === 'completed' ? 'Task completed' : 'Task reopened', 'success');
        } else {
          // Revert on unexpected response
          if (index !== -1) {
            const revertedTodos = [...this.todos];
            revertedTodos[index] = { ...revertedTodos[index], status: originalStatus };
            this.todos = revertedTodos;
          }
        }
      } catch (err) {
        console.error('Toggle todo error:', err);
        // Revert on error
        if (index !== -1) {
          const revertedTodos = [...this.todos];
          const revertIndex = revertedTodos.findIndex(t => t._id === todoId);
          if (revertIndex !== -1) {
            revertedTodos[revertIndex] = { ...revertedTodos[revertIndex], status: originalStatus };
            this.todos = revertedTodos;
          }
        }
        this.$root.showToast?.('Failed to update task', 'error');
      }
    },

    async deleteTodo(todo) {
      if (!confirm('Delete this task?')) return;

      const todoId = todo._id;
      const previousTodos = [...this.todos];

      // Optimistic update - remove immediately
      this.todos = this.todos.filter(t => t._id !== todoId);

      try {
        const response = await window.api.deleteTodo(todoId);
        console.log('Delete todo response:', response);

        if (response && response.success) {
          this.$root.showToast?.('Task deleted', 'success');
        } else {
          // Revert on failure
          this.todos = previousTodos;
          this.$root.showToast?.('Failed to delete task', 'error');
        }
      } catch (err) {
        console.error('Delete todo error:', err);
        // Revert on error
        this.todos = previousTodos;
        this.$root.showToast?.('Failed to delete task', 'error');
      }
    },

    openEditTodoModal(todo) {
      this.editingTodo = todo;
      this.editTodoForm = {
        title: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''
      };
      this.showEditTodoModal = true;
    },

    async updateTodo() {
      if (!this.editTodoForm.title.trim()) {
        this.$root.showToast?.('Task title cannot be empty', 'error');
        return;
      }

      const todoId = this.editingTodo._id;
      const originalTodo = { ...this.editingTodo };
      const todoIndex = this.todos.findIndex(t => t._id === todoId);

      // Parse due date to avoid timezone issues (similar to segments and events)
      let dueDateISO = null;
      if (this.editTodoForm.dueDate) {
        const [year, month, day] = this.editTodoForm.dueDate.split('-').map(Number);
        // Create date at noon local time to avoid day boundary issues
        const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        dueDateISO = localDate.toISOString();
      }

      // Optimistic update
      const updatedTodo = {
        ...this.editingTodo,
        title: this.editTodoForm.title,
        description: this.editTodoForm.description,
        status: this.editTodoForm.status,
        priority: this.editTodoForm.priority,
        dueDate: dueDateISO
      };
      this.todos[todoIndex] = updatedTodo;
      this.showEditTodoModal = false;

      try {
        const response = await window.api.updateTodo(todoId, {
          title: this.editTodoForm.title,
          description: this.editTodoForm.description,
          status: this.editTodoForm.status,
          priority: this.editTodoForm.priority,
          dueDate: dueDateISO
        });
        console.log('Update todo response:', response);

        if (response && response.success && response.data && response.data.todo) {
          this.$root.showToast?.('Task updated', 'success');
          // Update the todo with the response data
          const updatedData = response.data.todo;
          this.todos[todoIndex] = {
            ...updatedData,
            commentCount: updatedData.commentCount || 0
          };
        } else {
          // Revert on failure
          this.todos[todoIndex] = originalTodo;
          this.$root.showToast?.('Failed to update task', 'error');
        }
      } catch (err) {
        console.error('Update todo error:', err);
        // Revert on error
        this.todos[todoIndex] = originalTodo;
        this.$root.showToast?.('Failed to update task', 'error');
      }
    },

    async loadCalendarEvents() {
      try {
        const response = await window.api.getCalendarEvents({
          month: this.currentMonth + 1,
          year: this.currentYear
        });
        console.log('Load calendar events response:', response);
        if (response && response.success) {
          this.calendarEvents = response.data?.events || [];
        }
      } catch (err) {
        console.error('Load calendar events error:', err);
      }
    },

    changeMonth(delta) {
      this.currentDate = new Date(this.currentYear, this.currentMonth + delta, 1);
      this.selectedDate = null;
      this.loadCalendarEvents();
    },

    selectDate(date) {
      if (this.selectedDate && this.selectedDate.getTime() === date.getTime()) {
        this.selectedDate = null;
      } else {
        this.selectedDate = date;
      }
    },

    getEventsForDate(date) {
      return this.calendarEvents.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate.toDateString() === date.toDateString();
      });
    },

    navigateTo(path) {
      if (this.$router) {
        this.$router.push(path);
      } else {
        window.location.href = path;
      }
    },

    async handleNotificationClick(notification) {
      if (!notification.read) {
        try {
          await window.api.markNotificationAsRead(notification._id);
          notification.read = true;
          this.notifications.unread = Math.max(0, this.notifications.unread - 1);
        } catch (err) {
          console.error('Mark notification as read error:', err);
        }
      }

      if (notification.actionUrl) {
        this.navigateTo(notification.actionUrl);
      }
    },

    formatStatName(key) {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    },

    getStatusBadgeClass(status) {
      const classes = {
        pending: 'bg-yellow-900 text-yellow-300',
        approved: 'bg-green-900 text-green-300',
        rejected: 'bg-red-900 text-red-300',
        draft: 'bg-gray-600 text-gray-300',
        review: 'bg-blue-900 text-blue-300',
        scheduled: 'bg-purple-900 text-purple-300',
        completed: 'bg-green-900 text-green-300'
      };
      return classes[status] || 'bg-gray-600 text-gray-300';
    },

    getPriorityBadgeClass(priority) {
      const classes = {
        urgent: 'bg-red-900 text-red-300',
        high: 'bg-orange-900 text-orange-300',
        medium: 'bg-yellow-900 text-yellow-300',
        low: 'bg-gray-600 text-gray-300'
      };
      return classes[priority] || 'bg-gray-600 text-gray-300';
    },

    getPriorityBorderClass(priority) {
      const classes = {
        urgent: 'bg-gray-750 border-red-600 hover:border-red-500',
        high: 'bg-gray-750 border-orange-600 hover:border-orange-500',
        medium: 'bg-gray-750 border-yellow-600 hover:border-yellow-500',
        low: 'bg-gray-750 border-gray-600 hover:border-gray-500'
      };
      return classes[priority] || 'bg-gray-750 border-gray-600 hover:border-gray-500';
    },

    getPriorityDotColor(priority) {
      const colors = {
        urgent: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-gray-500'
      };
      return colors[priority] || 'bg-blue-500';
    },

    isOverdue(todo) {
      if (!todo.dueDate || todo.status === 'completed') return false;
      return new Date() > new Date(todo.dueDate);
    },

    formatDueDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date < today) return 'Overdue';
      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    formatSelectedDate(date) {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    formatEventDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    },

    formatScheduledDate(dateString) {
      if (!dateString) return 'Not scheduled';
      const date = new Date(dateString);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((scheduledDate - now) / 86400000);

      if (diffDays === 0) return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (diffDays === 1) return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    },

    // VDO.ninja Methods
    getUserVdoJoinUrl(segment) {
      if (!segment.vdoNinja?.participants) return null;

      const userId = this.user._id;
      const linkedApplicationId = this.user.linkedApplication;

      // Find participant that matches current user (regular or anonymous)
      const participant = segment.vdoNinja.participants.find(p => {
        // Check if regular user
        if (p.user) {
          if (p.user._id === userId) return true;
          if (typeof p.user === 'string' && p.user === userId) return true;
        }
        // Check if anonymous applicant
        if (p.applicant && linkedApplicationId) {
          if (p.applicant._id === linkedApplicationId) return true;
          if (typeof p.applicant === 'string' && p.applicant === linkedApplicationId) return true;
        }
        return false;
      });

      return participant?.joinUrl || null;
    },

    openVdoJoinUrl(segment) {
      const joinUrl = this.getUserVdoJoinUrl(segment);
      if (joinUrl) {
        window.open(joinUrl, '_blank');
      }
    },

    // Event Modal Methods
    openEventModal(event = null) {
      this.editingEvent = event;
      if (event && event.isEvent) {
        // Editing existing event
        const eventDate = new Date(event.date);
        this.eventForm = {
          title: event.title || '',
          startDate: eventDate.toISOString().split('T')[0],
          startTime: eventDate.toTimeString().slice(0, 5),
          eventType: event.type?.toLowerCase() || 'other',
          priority: event.priority || 'medium',
          location: event.location || '',
          description: event.description || ''
        };
      } else {
        // New event - prefill with selected date if available
        const prefillDate = this.selectedDate || new Date();
        this.eventForm = {
          title: '',
          startDate: prefillDate.toISOString().split('T')[0],
          startTime: '09:00',
          eventType: 'other',
          priority: 'medium',
          location: '',
          description: ''
        };
      }
      this.showEventModal = true;
    },

    closeEventModal() {
      this.showEventModal = false;
      this.editingEvent = null;
      this.eventForm = {
        title: '',
        startDate: '',
        startTime: '',
        eventType: 'other',
        priority: 'medium',
        location: '',
        description: ''
      };
    },

    async saveEvent() {
      if (!this.eventForm.title.trim() || !this.eventForm.startDate) {
        this.$root.showToast?.('Title and date are required', 'error');
        return;
      }

      this.savingEvent = true;
      const isEditing = this.editingEvent && this.editingEvent._id && !this.editingEvent._id.includes('-');
      const previousEvents = [...this.calendarEvents];

      try {
        // Combine date and time - parse date parts explicitly to avoid timezone issues
        const [year, month, day] = this.eventForm.startDate.split('-').map(Number);
        let hours = 9, minutes = 0; // Default to 9:00 AM if no time specified
        if (this.eventForm.startTime) {
          [hours, minutes] = this.eventForm.startTime.split(':').map(Number);
        }
        // Create date in local timezone
        const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

        const eventData = {
          title: this.eventForm.title.trim(),
          startDate: startDateTime.toISOString(),
          eventType: this.eventForm.eventType,
          priority: this.eventForm.priority,
          location: this.eventForm.location || undefined,
          description: this.eventForm.description || undefined
        };

        // Optimistic update for editing
        if (isEditing) {
          const index = this.calendarEvents.findIndex(e => e._id === this.editingEvent._id);
          if (index !== -1) {
            this.calendarEvents[index] = {
              ...this.calendarEvents[index],
              title: eventData.title,
              date: startDateTime,
              type: eventData.eventType,
              priority: eventData.priority
            };
          }
        }

        let response;
        if (isEditing) {
          response = await window.api.updateEvent(this.editingEvent._id, eventData);
        } else {
          response = await window.api.createEvent(eventData);
        }
        console.log('Save event response:', response);

        if (response && response.success) {
          this.$root.showToast?.(isEditing ? 'Event updated' : 'Event created', 'success');
          this.closeEventModal();

          // For new events, add to list immediately
          if (!isEditing && response.data && response.data.event) {
            const newEvent = {
              _id: response.data.event._id,
              title: response.data.event.title,
              date: response.data.event.startDate,
              type: response.data.event.eventType || 'Event',
              priority: response.data.event.priority || 'medium',
              isEvent: true,
              link: '#'
            };
            this.calendarEvents = [...this.calendarEvents, newEvent];
          }

          // Reload to get accurate server data
          await this.loadCalendarEvents();
        } else {
          // Revert on failure
          this.calendarEvents = previousEvents;
          this.$root.showToast?.('Failed to save event', 'error');
        }
      } catch (err) {
        console.error('Save event error:', err);
        // Revert on error
        this.calendarEvents = previousEvents;
        this.$root.showToast?.('Failed to save event', 'error');
      } finally {
        this.savingEvent = false;
      }
    },

    async deleteCalendarEvent(event) {
      if (!event.isEvent || !event._id) return;

      if (!confirm('Are you sure you want to delete this event?')) return;

      // Optimistic UI update - remove immediately from the list
      const eventId = event._id;
      const previousEvents = [...this.calendarEvents];
      this.calendarEvents = this.calendarEvents.filter(e => e._id !== eventId);

      try {
        const response = await window.api.deleteEvent(eventId);
        console.log('Delete event response:', response);

        if (response && response.success) {
          this.$root.showToast?.('Event deleted', 'success');
        } else {
          // Revert on failure
          this.calendarEvents = previousEvents;
          this.$root.showToast?.('Failed to delete event', 'error');
        }
      } catch (err) {
        console.error('Delete event error:', err);
        // Revert on error
        this.calendarEvents = previousEvents;
        this.$root.showToast?.('Failed to delete event', 'error');
      }
    },

    // Todo Comments Methods - Inline Expanding View
    async toggleTodoComments(todo) {
      if (this.expandedTodoId === todo._id) {
        // Collapse if already expanded
        this.expandedTodoId = null;
        this.todoComments = [];
        this.newTodoComment = '';
        this.editingComment = null;
        this.editCommentContent = '';
      } else {
        // Expand and load comments
        this.expandedTodoId = todo._id;
        this.todoComments = [];
        this.newTodoComment = '';
        this.editingComment = null;
        this.editCommentContent = '';
        await this.loadTodoComments(todo._id);
      }
    },

    async loadTodoComments(todoId) {
      this.todoCommentsLoading = true;
      console.log('Loading comments for todoId:', todoId);

      try {
        const response = await window.api.getTodoComments(todoId);
        console.log('Comments response:', response);

        if (response && response.success && response.data) {
          // response.data is the array of comments from the API
          const commentsArray = Array.isArray(response.data) ? response.data : [];
          console.log('Setting comments:', commentsArray.length, 'items');

          // Use spread operator to ensure Vue detects the change
          this.todoComments = [...commentsArray];
          console.log('Comments set. todoComments.length:', this.todoComments.length);
        } else {
          console.log('No comments data, setting empty array');
          this.todoComments = [];
        }
      } catch (err) {
        console.error('Error loading comments:', err);
        this.todoComments = [];
      } finally {
        this.todoCommentsLoading = false;
        console.log('loadTodoComments complete. todoCommentsLoading:', this.todoCommentsLoading, 'todoComments.length:', this.todoComments.length);
      }
    },

    async addTodoComment(todo) {
      if (!this.newTodoComment.trim() || !todo) return;

      const commentText = this.newTodoComment.trim();
      this.newTodoComment = ''; // Clear immediately for better UX
      this.addingComment = true;

      try {
        const response = await window.api.createTodoComment(todo._id, commentText);

        if (response && response.success && response.data) {
          // Add comment directly to the list from response data
          const newComments = [response.data, ...this.todoComments];
          this.todoComments = newComments;

          // Update comment count on the todo
          const todoIndex = this.todos.findIndex(t => t._id === todo._id);
          if (todoIndex !== -1) {
            const updatedTodos = [...this.todos];
            updatedTodos[todoIndex] = {
              ...updatedTodos[todoIndex],
              commentCount: this.todoComments.length
            };
            this.todos = updatedTodos;
          }

          this.$root.showToast?.('Comment added', 'success');
        } else {
          this.newTodoComment = commentText;
          this.$root.showToast?.('Failed to add comment', 'error');
        }
      } catch (err) {
        this.newTodoComment = commentText;
        console.error('Error adding comment:', err);
        this.$root.showToast?.('Failed to add comment', 'error');
      } finally {
        this.addingComment = false;
      }
    },

    canEditComment(comment) {
      return comment.author?._id === this.user._id || this.hasAnyRole('admin');
    },

    canDeleteComment(comment) {
      return comment.author?._id === this.user._id || ['admin', 'moderator'].includes(this.user.role);
    },

    startEditComment(comment) {
      this.editingComment = comment;
      this.editCommentContent = comment.content;
    },

    cancelEditComment() {
      this.editingComment = null;
      this.editCommentContent = '';
    },

    async saveEditComment() {
      if (!this.editCommentContent.trim() || !this.editingComment) return;

      const newContent = this.editCommentContent.trim();

      try {
        const response = await window.api.updateTodoComment(
          this.editingComment._id,
          newContent
        );
        console.log('Update comment response:', response);

        if (response.success && response.data) {
          // Reactive update - replace the comment in the array
          this.todoComments = this.todoComments.map(c =>
            c._id === this.editingComment._id ? { ...response.data } : c
          );
          this.$root.showToast?.('Comment updated', 'success');
        } else {
          this.$root.showToast?.('Failed to update comment', 'error');
        }
      } catch (err) {
        console.error('Update comment error:', err);
        this.$root.showToast?.('Failed to update comment', 'error');
      } finally {
        this.cancelEditComment();
      }
    },

    async deleteComment(comment, todo) {
      if (!confirm('Delete this comment?')) return;

      const previousComments = [...this.todoComments];

      // Optimistic update - remove immediately
      this.todoComments = this.todoComments.filter(c => c._id !== comment._id);

      try {
        const response = await window.api.deleteTodoComment(comment._id);
        console.log('Delete comment response:', response);

        if (response.success) {
          // Update comment count on the todo (reactive update)
          if (todo) {
            const todoIndex = this.todos.findIndex(t => t._id === todo._id);
            if (todoIndex !== -1 && this.todos[todoIndex].commentCount > 0) {
              const updatedTodos = [...this.todos];
              updatedTodos[todoIndex] = {
                ...updatedTodos[todoIndex],
                commentCount: updatedTodos[todoIndex].commentCount - 1
              };
              this.todos = updatedTodos;
            }
          }
          this.$root.showToast?.('Comment deleted', 'success');
        } else {
          // Revert on failure
          this.todoComments = previousComments;
          this.$root.showToast?.('Failed to delete comment', 'error');
        }
      } catch (err) {
        console.error('Delete comment error:', err);
        // Revert on error
        this.todoComments = previousComments;
        this.$root.showToast?.('Failed to delete comment', 'error');
      }
    },

    getInitials(author) {
      if (!author) return '?';
      const first = author.firstName?.charAt(0) || '';
      const last = author.lastName?.charAt(0) || '';
      return (first + last).toUpperCase() || '?';
    }
  }
};
