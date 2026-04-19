import { API_CONFIG, APP_CONFIG } from '../config.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem(APP_CONFIG.TOKEN_KEY);
  }

  // Set auth token
  setToken(token) {
    localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
  }

  // Remove auth token
  removeToken() {
    localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    localStorage.removeItem(APP_CONFIG.USER_KEY);
  }

  // Get headers with auth token
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.auth !== false)
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error('API Response Error:', { status: response.status, data });
        const error = new Error(data.message || data.error || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // PATCH request
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  // Auth methods
  async login(email, password) {
    const response = await this.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password }, { auth: false });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(response.data.user));
    }
    return response;
  }

  async loginWithCode(email, code) {
    const response = await this.post('/auth/login-with-code', { email, code }, { auth: false });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(response.data.user));
    }
    return response;
  }

  async loginAnonymous(handle, passcode) {
    const response = await this.post('/auth/login-anonymous', { handle, passcode }, { auth: false });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
      localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(response.data.user));
    }
    return response;
  }

  async getProfile() {
    return this.get(API_CONFIG.ENDPOINTS.PROFILE);
  }

  async updateProfile(data) {
    return this.put(API_CONFIG.ENDPOINTS.PROFILE, data);
  }

  async updateExtendedProfile(data) {
    return this.put('/auth/profile/extended', data);
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/auth/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to upload avatar');
    }

    return response.json();
  }

  getAvatarUrl(userId) {
    return `${this.baseURL}/auth/avatar/${userId}`;
  }

  async removeAvatar() {
    return this.put('/auth/profile/extended', { avatarUrl: '' });
  }

  async changePassword(data) {
    return this.post(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, data);
  }

  logout() {
    this.removeToken();
  }

  // User methods
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`${API_CONFIG.ENDPOINTS.USERS}${queryString ? '?' + queryString : ''}`);
  }

  async getUserById(id) {
    return this.get(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
  }

  async createUser(userData) {
    return this.post(API_CONFIG.ENDPOINTS.USERS, userData);
  }

  async updateUser(id, userData) {
    return this.put(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, userData);
  }

  async deleteUser(id) {
    return this.delete(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
  }

  // Application methods
  async submitApplication(applicationData) {
    return this.post(API_CONFIG.ENDPOINTS.APPLICATIONS_SUBMIT, applicationData, { auth: false });
  }

  async getApplications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`${API_CONFIG.ENDPOINTS.APPLICATIONS}${queryString ? '?' + queryString : ''}`);
  }

  async getApplicationById(id) {
    return this.get(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}`);
  }

  async updateApplicationStatus(id, status) {
    return this.patch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/status`, { status });
  }

  async assignApplication(id, assignedTo) {
    return this.patch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/assign`, { assignedTo });
  }

  async scheduleApplication(id, scheduledDate) {
    return this.patch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/schedule`, { scheduledDate });
  }

  async updateApplicationPriority(id, priority) {
    return this.patch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/priority`, { priority });
  }

  async updateApplicationCategory(id, category) {
    return this.patch(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/category`, { category });
  }

  async addNote(id, content, isInternal = true) {
    return this.post(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}/notes`, { content, isInternal });
  }

  async getDashboardStats() {
    return this.get(API_CONFIG.ENDPOINTS.APPLICATION_STATS);
  }

  async deleteApplication(id) {
    return this.delete(`${API_CONFIG.ENDPOINTS.APPLICATIONS}/${id}`);
  }

  // ===== Segments API =====
  async getSegments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/segments${queryString ? '?' + queryString : ''}`);
  }

  async getSegmentById(id) {
    return this.get(`/segments/${id}`);
  }

  async createSegment(data) {
    return this.post('/segments', data);
  }

  async updateSegment(id, data) {
    return this.put(`/segments/${id}`, data);
  }

  async deleteSegment(id) {
    return this.delete(`/segments/${id}`);
  }

  async toggleSegmentUpvote(id) {
    return this.post(`/segments/${id}/upvote`);
  }

  async createSegmentVariation(id, data) {
    return this.post(`/segments/${id}/variations`, data);
  }

  async getSegmentStats() {
    return this.get('/segments/stats');
  }

  async assignUserToSegment(segmentId, userId, role) {
    return this.post(`/segments/${segmentId}/users`, { userId, role });
  }

  async removeUserFromSegment(segmentId, userId) {
    return this.delete(`/segments/${segmentId}/users/${userId}`);
  }

  // ===== VDO.ninja API =====
  async toggleVdoNinja(segmentId) {
    return this.post(`/segments/${segmentId}/vdo/toggle`);
  }

  async createVdoSession(segmentId) {
    return this.post(`/segments/${segmentId}/vdo/session`);
  }

  async deleteVdoSession(segmentId) {
    return this.delete(`/segments/${segmentId}/vdo/session`);
  }

  async addVdoParticipant(segmentId, data) {
    return this.post(`/segments/${segmentId}/vdo/participants`, data);
  }

  async updateVdoParticipant(segmentId, participantId, data) {
    return this.put(`/segments/${segmentId}/vdo/participants/${participantId}`, data);
  }

  async removeVdoParticipant(segmentId, participantId) {
    return this.delete(`/segments/${segmentId}/vdo/participants/${participantId}`);
  }

  async autoAssignVdoSeats(segmentId) {
    return this.post(`/segments/${segmentId}/vdo/participants/auto-assign-seats`);
  }

  async sendVdoEmail(segmentId, participantId) {
    return this.post(`/segments/${segmentId}/vdo/email/${participantId}`);
  }

  async sendVdoEmailToAll(segmentId) {
    return this.post(`/segments/${segmentId}/vdo/email-all`);
  }

  // ===== Export & Backup API =====
  async exportSegment(segmentId, encrypt = false, passkey = null) {
    const queryParams = new URLSearchParams();
    if (encrypt) {
      queryParams.append('encrypt', 'true');
    }
    const endpoint = `/segments/${segmentId}/export${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await this.request(endpoint, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ passkey })
    });

    // Convert response to Blob for download
    return new Blob([JSON.stringify(response)], { type: 'application/json' });
  }

  async exportSegmentsBulk(filters, encrypt = false, passkey = null) {
    const response = await this.post('/segments/export/bulk', {
      filters,
      encrypt,
      passkey
    });

    // Convert response to Blob for download
    return new Blob([JSON.stringify(response)], { type: 'application/json' });
  }

  async getSegmentDeletePreview(segmentId) {
    return this.get(`/segments/${segmentId}/delete-preview`);
  }

  // ===== Comments API =====
  async getSegmentComments(segmentId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/segments/${segmentId}/comments${queryString ? '?' + queryString : ''}`);
  }

  async createComment(segmentId, data) {
    return this.post(`/segments/${segmentId}/comments`, data);
  }

  async updateComment(commentId, data) {
    return this.put(`/comments/${commentId}`, data);
  }

  async deleteComment(commentId) {
    return this.delete(`/comments/${commentId}`);
  }

  async toggleCommentReaction(commentId, emoji) {
    return this.post(`/comments/${commentId}/reactions`, { emoji });
  }

  async toggleCommentPin(commentId) {
    return this.post(`/comments/${commentId}/pin`);
  }

  async getCommentThread(commentId) {
    return this.get(`/comments/${commentId}/thread`);
  }

  // ===== Notifications API =====
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/notifications${queryString ? '?' + queryString : ''}`);
  }

  async getUnreadNotificationCount() {
    return this.get('/notifications/unread/count');
  }

  async markNotificationAsRead(notificationId) {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async markManyNotificationsAsRead(notificationIds) {
    return this.post('/notifications/read', { notificationIds });
  }

  async markAllNotificationsAsRead() {
    return this.post('/notifications/read-all');
  }

  async deleteNotification(notificationId) {
    return this.delete(`/notifications/${notificationId}`);
  }

  async getNotificationPreferences() {
    return this.get('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.put('/notifications/preferences', { preferences });
  }

  // ===== Dashboard API =====
  async getDashboard() {
    return this.get('/dashboard');
  }

  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  async getCallToActions() {
    return this.get('/dashboard/actions');
  }

  // ===== Flags API =====
  async getFlags(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/flags${queryString ? '?' + queryString : ''}`);
  }

  async getFlagById(flagId) {
    return this.get(`/flags/${flagId}`);
  }

  async createFlag(data) {
    return this.post('/flags', data);
  }

  async updateFlag(flagId, data) {
    return this.put(`/flags/${flagId}`, data);
  }

  async resolveFlag(flagId, notes) {
    return this.post(`/flags/${flagId}/resolve`, { notes });
  }

  async dismissFlag(flagId, notes) {
    return this.post(`/flags/${flagId}/dismiss`, { notes });
  }

  async escalateFlag(flagId, notes, assignedTo) {
    return this.post(`/flags/${flagId}/escalate`, { notes, assignedTo });
  }

  async addFlagResponse(flagId, notes) {
    return this.post(`/flags/${flagId}/responses`, { notes });
  }

  async deleteFlag(flagId) {
    return this.delete(`/flags/${flagId}`);
  }

  async getResourceFlags(resourceType, resourceId) {
    return this.get(`/flags/${resourceType}/${resourceId}`);
  }

  async getFlagComments(flagId) {
    return this.get(`/flags/${flagId}/comments`);
  }

  async addFlagComment(flagId, content) {
    return this.post(`/flags/${flagId}/comments`, { content });
  }

  async updateFlagComment(flagId, commentId, content) {
    return this.put(`/flags/${flagId}/comments/${commentId}`, { content });
  }

  async deleteFlagComment(flagId, commentId) {
    return this.delete(`/flags/${flagId}/comments/${commentId}`);
  }

  // ===== Activity Log API =====
  async getSegmentActivityLogs(segmentId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/segments/${segmentId}/activity-logs${queryString ? '?' + queryString : ''}`);
  }

  async getApplicationActivityLogs(applicationId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/applications/${applicationId}/activity-logs${queryString ? '?' + queryString : ''}`);
  }

  async getUserActivityLogs(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/users/${userId}/activity-logs${queryString ? '?' + queryString : ''}`);
  }

  async getAllActivityLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/activity-logs${queryString ? '?' + queryString : ''}`);
  }

  // ===== Todos API =====
  async getTodos(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/todos${queryString ? '?' + queryString : ''}`);
  }

  async getTodoById(id) {
    return this.get(`/todos/${id}`);
  }

  async createTodo(data) {
    return this.post('/todos', data);
  }

  async updateTodo(id, data) {
    return this.put(`/todos/${id}`, data);
  }

  async toggleTodo(id) {
    return this.patch(`/todos/${id}/toggle`);
  }

  async deleteTodo(id) {
    return this.delete(`/todos/${id}`);
  }

  // ===== Todo Comments API =====
  async getTodoComments(todoId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/todos/${todoId}/comments${queryString ? '?' + queryString : ''}`);
  }

  async createTodoComment(todoId, content) {
    return this.post(`/todos/${todoId}/comments`, { content });
  }

  async updateTodoComment(commentId, content) {
    return this.put(`/todos/comments/${commentId}`, { content });
  }

  async deleteTodoComment(commentId) {
    return this.delete(`/todos/comments/${commentId}`);
  }

  async getTodoCommentCount(todoId) {
    return this.get(`/todos/${todoId}/comments/count`);
  }

  // ===== Calendar Events API =====
  async getCalendarEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/dashboard/calendar${queryString ? '?' + queryString : ''}`);
  }

  // ===== Events API (CRUD) =====
  async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/events${queryString ? '?' + queryString : ''}`);
  }

  async getEventById(id) {
    return this.get(`/events/${id}`);
  }

  async createEvent(data) {
    return this.post('/events', data);
  }

  async updateEvent(id, data) {
    return this.put(`/events/${id}`, data);
  }

  async deleteEvent(id) {
    return this.delete(`/events/${id}`);
  }

  // ===== Email Templates API =====
  async getEmailTemplates(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/email/templates${queryString ? '?' + queryString : ''}`);
  }

  async getEmailTemplateById(id) {
    return this.get(`/email/templates/${id}`);
  }

  async createEmailTemplate(data) {
    return this.post('/email/templates', data);
  }

  async updateEmailTemplate(id, data) {
    return this.put(`/email/templates/${id}`, data);
  }

  async deleteEmailTemplate(id) {
    return this.delete(`/email/templates/${id}`);
  }

  // ===== Mailing Lists API =====
  async getMailingLists(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/email/lists${queryString ? '?' + queryString : ''}`);
  }

  async getMailingListById(id) {
    return this.get(`/email/lists/${id}`);
  }

  async createMailingList(data) {
    return this.post('/email/lists', data);
  }

  async updateMailingList(id, data) {
    return this.put(`/email/lists/${id}`, data);
  }

  async deleteMailingList(id) {
    return this.delete(`/email/lists/${id}`);
  }

  async addRecipientsToList(id, userIds) {
    return this.post(`/email/lists/${id}/recipients/add`, { userIds });
  }

  async removeRecipientsFromList(id, userIds) {
    return this.post(`/email/lists/${id}/recipients/remove`, { userIds });
  }

  // ===== Enhanced Email API =====
  async sendEnhancedEmail(data, files = []) {
    const formData = new FormData();

    // Add all data fields
    Object.keys(data).forEach(key => {
      // Skip null/undefined values
      if (data[key] === null || data[key] === undefined) {
        return;
      }

      if (Array.isArray(data[key])) {
        data[key].forEach((item, index) => {
          formData.append(`${key}[${index}]`, typeof item === 'object' ? JSON.stringify(item) : item);
        });
      } else {
        formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
      }
    });

    // Add files
    files.forEach((file) => {
      formData.append('attachments', file);
    });

    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/email/send-enhanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to send email');
    }

    return response.json();
  }

  async getEmailLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/email/logs${queryString ? '?' + queryString : ''}`);
  }

  async getEmailLogById(id) {
    return this.get(`/email/logs/${id}`);
  }

  async archiveEmailLog(id) {
    return this.put(`/email/logs/${id}/archive`, {});
  }

  async deleteEmailLog(id) {
    return this.delete(`/email/logs/${id}`);
  }

  async searchUsersForEmail(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/email/users/search${queryString ? '?' + queryString : ''}`);
  }

  // ===== Dropbox API =====
  async getDropboxSettings() {
    return this.get('/dropbox/settings');
  }

  async updateDropboxSettings(data) {
    return this.put('/dropbox/settings', data);
  }

  async getDropboxStats() {
    return this.get('/dropbox/stats');
  }

  async browseDropboxFiles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/dropbox/files${queryString ? '?' + queryString : ''}`);
  }

  async getSegmentFiles(segmentId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/dropbox/segments/${segmentId}/files${queryString ? '?' + queryString : ''}`);
  }

  async uploadSegmentFile(segmentId, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid server response'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseURL}/dropbox/segments/${segmentId}/files`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async getDropboxFile(fileId) {
    return this.get(`/dropbox/files/${fileId}`);
  }

  async downloadDropboxFile(fileId, filename) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/dropbox/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async updateDropboxFile(fileId, data) {
    return this.put(`/dropbox/files/${fileId}`, data);
  }

  async deleteDropboxFile(fileId) {
    return this.delete(`/dropbox/files/${fileId}`);
  }

  async grantDropboxFileAccess(fileId, userId) {
    return this.post(`/dropbox/files/${fileId}/access`, { userId });
  }

  async revokeDropboxFileAccess(fileId, userId) {
    return this.delete(`/dropbox/files/${fileId}/access/${userId}`);
  }

  async triggerDropboxCleanup(options = {}) {
    return this.post('/dropbox/cleanup', options);
  }

  async getDropboxCleanupStatus() {
    return this.get('/dropbox/cleanup/status');
  }

  async testFtpConnection(config) {
    return this.post('/storage/test-ftp', config);
  }

  // Highlights API methods
  async getHighlights(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/highlights${queryString ? '?' + queryString : ''}`);
  }

  async getHighlightById(id) {
    return this.get(`/highlights/${id}`);
  }

  async createHighlight(data) {
    return this.post('/highlights', data);
  }

  async updateHighlight(id, data) {
    return this.put(`/highlights/${id}`, data);
  }

  async deleteHighlight(id) {
    return this.delete(`/highlights/${id}`);
  }

  async triggerHighlightAiFetch(id, data = {}) {
    return this.post(`/highlights/${id}/ai-fetch`, data);
  }

  async assignHighlightTemplate(id, templateId) {
    return this.post(`/highlights/${id}/template`, { templateId });
  }

  async getHighlightStats() {
    return this.get('/highlights/stats/dashboard');
  }

  async getRandomHighlight() {
    return this.get('/highlights/random/select', { auth: false });
  }

  // Prompt Template methods
  async getPromptTemplates(params = {}) {
    return this.get('/prompt-templates', { params });
  }

  async getPromptTemplateById(id) {
    return this.get(`/prompt-templates/${id}`);
  }

  async getDefaultPromptTemplate(category = 'museum-detailed') {
    return this.get('/prompt-templates/default', { params: { category } });
  }

  async createPromptTemplate(data) {
    return this.post('/prompt-templates', data);
  }

  async updatePromptTemplate(id, data) {
    return this.put(`/prompt-templates/${id}`, data);
  }

  async deletePromptTemplate(id) {
    return this.delete(`/prompt-templates/${id}`);
  }

  async testPromptTemplate(id, testData) {
    return this.post(`/prompt-templates/${id}/test`, { testData });
  }

  async setPromptTemplateAsDefault(id) {
    return this.post(`/prompt-templates/${id}/set-default`, {});
  }

  // ===== Help Topics API =====
  async getHelpTopics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/help-topics${queryString ? '?' + queryString : ''}`);
  }

  async getHelpTopic(slugOrId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/help-topics/${slugOrId}${queryString ? '?' + queryString : ''}`);
  }

  async createHelpTopic(data) {
    return this.post('/help-topics', data);
  }

  async updateHelpTopic(id, data) {
    return this.put(`/help-topics/${id}`, data);
  }

  async deleteHelpTopic(id) {
    return this.delete(`/help-topics/${id}`);
  }

  async getHelpTopicStats() {
    return this.get('/help-topics/stats/analytics');
  }

  // ===== Highlight Media API =====
  async uploadHighlightProfileImage(highlightId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('image', file);
    if (metadata.altText) formData.append('altText', metadata.altText);
    if (metadata.source) formData.append('source', metadata.source);

    const url = `${this.baseURL}/highlights/${highlightId}/media/profile`;
    const token = this.getToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload profile image');
    }
    return data;
  }

  async uploadHighlightGalleryImages(highlightId, files, metadata = []) {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('metadata', JSON.stringify(metadata));

    const url = `${this.baseURL}/highlights/${highlightId}/media/gallery`;
    const token = this.getToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload gallery images');
    }
    return data;
  }

  async addHighlightExternalImage(highlightId, imageData) {
    return this.post(`/highlights/${highlightId}/media/external`, imageData);
  }

  async updateHighlightImageMetadata(highlightId, type, index, metadata) {
    const url = type === 'profile'
      ? `/highlights/${highlightId}/media/profile`
      : `/highlights/${highlightId}/media/gallery/${index}`;
    return this.patch(url, metadata);
  }

  async deleteHighlightImage(highlightId, type, index = null) {
    const url = type === 'profile'
      ? `/highlights/${highlightId}/media/profile`
      : `/highlights/${highlightId}/media/gallery/${index}`;
    return this.delete(url);
  }

  async reorderHighlightGallery(highlightId, imageOrder) {
    return this.put(`/highlights/${highlightId}/media/gallery/reorder`, { imageOrder });
  }

  // Segment methods - participant access
  async getMySegments() {
    return this.get('/segments/mine');
  }

  // User dashboard methods
  async getDashboardData() {
    return this.get('/users/me/dashboard');
  }

  // ========== RECORDING METHODS ==========

  // Recording Session Management
  async grantRecordingAccess(data) {
    return this.post('/recordings/sessions/grant', data);
  }

  async getAllSessions(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.get(`/recordings/sessions/all${queryString ? '?' + queryString : ''}`);
  }

  async getMySessions() {
    return this.get('/recordings/sessions/my-sessions');
  }

  async getSession(sessionId) {
    return this.get(`/recordings/sessions/${sessionId}`);
  }

  async canRecord(sessionId) {
    return this.get(`/recordings/sessions/${sessionId}/can-record`);
  }

  async startRecording(sessionId) {
    return this.post(`/recordings/sessions/${sessionId}/start`);
  }

  async revokeRecordingAccess(sessionId) {
    return this.post(`/recordings/sessions/${sessionId}/revoke`);
  }

  // Recording Upload - Simple and Chunked
  async uploadRecording(sessionId, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    return this.uploadFile(`/recordings/sessions/${sessionId}/upload`, formData, onProgress);
  }

  async initializeChunkedUpload(sessionId, fileInfo) {
    return this.post(`/recordings/sessions/${sessionId}/upload/init`, fileInfo);
  }

  async uploadChunk(sessionId, chunkData, chunkNumber, totalChunks, onProgress = null) {
    const formData = new FormData();
    formData.append('chunk', chunkData);
    formData.append('chunkNumber', chunkNumber);
    formData.append('totalChunks', totalChunks);

    return this.uploadFile(`/recordings/sessions/${sessionId}/upload/chunk`, formData, onProgress);
  }

  async completeChunkedUpload(sessionId, uploadData) {
    return this.post(`/recordings/sessions/${sessionId}/upload/complete`, uploadData);
  }

  // Streaming and File Management
  async getStreamingUrl(fileId, expiresIn = 3600) {
    return this.get(`/recordings/files/${fileId}/stream?expiresIn=${expiresIn}`);
  }

  async getSegmentRecordings(segmentId) {
    return this.get(`/recordings/segments/${segmentId}/files`);
  }

  // List all recordings (admin/moderator)
  async listRecordings(sortBy = 'createdAt', order = 'desc', limit = 50, skip = 0) {
    const queryString = new URLSearchParams({
      sortBy,
      order,
      limit,
      skip
    }).toString();
    return this.get(`/recordings/list?${queryString}`);
  }

  // Get signed URL for viewing/downloading a recording
  async getRecordingSignedUrl(recordingId, forDownload = false, expiresIn = 3600) {
    const queryString = new URLSearchParams({
      forDownload,
      expiresIn
    }).toString();
    return this.get(`/recordings/${recordingId}/signed-url?${queryString}`);
  }

  // Download a recording (local storage only)
  async downloadRecording(recordingId) {
    return this.get(`/recordings/${recordingId}/download`);
  }

  // Delete a recording
  async deleteRecording(recordingId) {
    return this.delete(`/recordings/${recordingId}`);
  }

  // Helper method for file uploads with progress tracking
  async uploadFile(endpoint, formData, onProgress = null) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.message || `Upload failed with status ${xhr.status}`));
          } catch (error) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', url);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  // ===== Invitation API =====
  async sendInvitations(data) {
    return this.post('/invitations', data);
  }

  async redeemInvitation(token) {
    return this.post('/invitations/redeem', { token }, { auth: false });
  }

  async completeRegistration(data) {
    return this.post('/invitations/complete-registration', data);
  }

  async listInvitations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/invitations${queryString ? '?' + queryString : ''}`);
  }

  async revokeInvitation(id) {
    return this.patch(`/invitations/${id}/revoke`, {});
  }

  async resendInvitation(id) {
    return this.post(`/invitations/${id}/resend`, {});
  }

  // ===== Recording Server (bb9e) API =====

  async getRecordingServerStatus(segmentId) {
    const query = segmentId ? `?segmentId=${segmentId}` : '';
    return this.get(`/recording-server/status${query}`);
  }

  async startServerRecording(data) {
    return this.post('/recording-server/start', data);
  }

  async stopServerRecording(recordingId, { force = false } = {}) {
    return this.post(`/recording-server/stop/${recordingId}`, force ? { force: true } : {});
  }

  async startRecordingSession(data) {
    return this.post('/recording-server/start-session', data);
  }

  async stopRecordingSession(sessionId, { force = false } = {}) {
    return this.post(`/recording-server/stop-session/${sessionId}`, force ? { force: true } : {});
  }

  async getServerRecording(recordingId) {
    return this.get(`/recording-server/recording/${recordingId}`);
  }

  async getServerRecordings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/recording-server/recordings${queryString ? '?' + queryString : ''}`);
  }

  async uploadServerRecordingToS3(recordingId) {
    return this.post(`/recording-server/upload-s3/${recordingId}`);
  }

  async deleteServerRecording(recordingId) {
    return this.delete(`/recording-server/recording/${recordingId}`);
  }

  async getServerRecordingPreview(recordingId) {
    return this.get(`/recording-server/preview/${recordingId}`);
  }

  async wakeRecordingServer() {
    return this.post('/recording-server/wol');
  }

  // ===== Follows API =====

  async toggleFollow(resourceType, resourceId) {
    return this.post(`/follows/${resourceType}/${resourceId}/toggle`);
  }

  async toggleFollowEmail(resourceType, resourceId) {
    return this.put(`/follows/${resourceType}/${resourceId}/email`);
  }

  async getFollowStatus(resourceType, resourceId) {
    return this.get(`/follows/${resourceType}/${resourceId}/status`);
  }

  async getMyFollows(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/follows${query ? '?' + query : ''}`);
  }

  async getFollowers(resourceType, resourceId) {
    return this.get(`/follows/${resourceType}/${resourceId}/followers`);
  }

  // ===== Storage Disk Management API =====

  async getRecordingDiskStatus() {
    return this.get('/storage/recording-status');
  }

  async getFullDiskStatus() {
    return this.get('/storage/status');
  }

  async getDiskStatusById(diskId) {
    return this.get(`/storage/disks/${diskId}/status`);
  }

  async getStorageDiskConfig() {
    return this.get('/storage/disks');
  }

  async updateStorageDiskConfig(data) {
    return this.put('/storage/disks', data);
  }

  async addStorageDisk(diskData) {
    return this.post('/storage/disks', diskData);
  }

  async removeStorageDisk(diskId) {
    return this.delete(`/storage/disks/${diskId}`);
  }

  async testStorageDisk(diskId) {
    return this.post(`/storage/disks/${diskId}/test`);
  }

  async reorderStorageDisks(order) {
    return this.put('/storage/disks/reorder', { order });
  }

  async getAvailableDisks() {
    return this.get('/storage/available-disks');
  }

  // ===== Notification Preferences API =====

  async getNotificationPreferences() {
    return this.get('/notifications/preferences');
  }

  async updateNotificationPreferences(prefs) {
    return this.put('/notifications/preferences', prefs);
  }

  // ===== S3 Browser API =====

  async browseS3(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/storage/s3/browse${queryString ? '?' + queryString : ''}`);
  }

  async getS3Stats() {
    return this.get('/storage/s3/stats');
  }

  async deleteS3Object(key) {
    return this.request('/storage/s3/object', {
      method: 'DELETE',
      body: JSON.stringify({ key })
    });
  }

  async getS3PresignedUrl(key) {
    return this.get(`/storage/s3/presign?key=${encodeURIComponent(key)}`);
  }

  async backfillS3Recordings() {
    return this.post('/storage/s3/backfill', {});
  }

  async getRecordingServerDisks() {
    return this.get('/recording-server/disks');
  }

  // Get the Recording Agent's attached drives — legacy single-agent (bb9e)
  // Supports optional { host, port, secret, useSSL } to probe a specific agent
  async getAgentDisks(opts = {}) {
    const params = new URLSearchParams();
    if (opts.host) params.set('host', opts.host);
    if (opts.port) params.set('port', opts.port);
    if (opts.secret) params.set('secret', opts.secret);
    if (opts.useSSL) params.set('useSSL', 'true');
    const qs = params.toString();
    return this.get(`/recording-server/agent-disks${qs ? '?' + qs : ''}`);
  }

  // List all registered agents (agents that have phoned home)
  async getRegisteredAgents() {
    return this.get('/recording-server/agents');
  }

  // Get drives reported by a specific registered agent
  async getAgentDrives(agentId) {
    return this.get(`/recording-server/agents/${encodeURIComponent(agentId)}/disks`);
  }

  // Remove a registered agent from the registry
  async deleteRegisteredAgent(agentId) {
    return this.delete(`/recording-server/agents/${encodeURIComponent(agentId)}`);
  }

  // Send Wake-on-LAN packet to power on an offline agent
  async wakeAgent(agentId) {
    return this.post(`/recording-server/agents/${encodeURIComponent(agentId)}/wake`);
  }

  // Manually register an agent from the admin UI
  async registerAgent(data) {
    return this.post('/recording-server/agents', data);
  }

  // Get all block devices (including unmounted) from an agent
  async getAgentBlockDevices(agentId) {
    return this.get(`/recording-server/agents/${encodeURIComponent(agentId)}/block-devices`);
  }

  // Mount a block device on an agent
  async mountAgentDevice(agentId, device, mountPoint = null) {
    return this.post(`/recording-server/agents/${encodeURIComponent(agentId)}/mount`, { device, mountPoint });
  }

  // Get allowed browse roots for an agent
  async getAgentBrowseRoots(agentId) {
    return this.get(`/recording-server/agents/${encodeURIComponent(agentId)}/browse-roots`);
  }

  // Browse a directory on an agent (sandboxed)
  async browseAgentPath(agentId, dirPath) {
    return this.get(`/recording-server/agents/${encodeURIComponent(agentId)}/browse?path=${encodeURIComponent(dirPath)}`);
  }

  // Get local drives on the main server
  async getLocalDrives() {
    return this.get('/storage/local-drives');
  }

  // Transfer a VDO.ninja recording from the agent to a configured storage disk
  async transferServerRecording(recordingId, diskId) {
    return this.post(`/recording-server/transfer/${recordingId}`, { diskId });
  }

  // ==========================================
  // Recording Slots
  // ==========================================
  async getRecordingSlots(status) {
    const qs = status ? `?status=${status}` : '';
    return this.get(`/recording-slots${qs}`);
  }
  async getRecordingSlot(id) {
    return this.get(`/recording-slots/${id}`);
  }
  async getSlotForSegment(segmentId) {
    return this.get(`/recording-slots/for-segment/${segmentId}`);
  }
  async createRecordingSlot(data) {
    return this.post('/recording-slots', data);
  }
  async updateRecordingSlot(id, data) {
    return this.put(`/recording-slots/${id}`, data);
  }
  async deleteRecordingSlot(id) {
    return this.delete(`/recording-slots/${id}`);
  }
  async assignSlotSegment(slotId, segmentId) {
    return this.post(`/recording-slots/${slotId}/assign`, { segmentId });
  }
  async releaseSlot(slotId) {
    return this.post(`/recording-slots/${slotId}/release`);
  }
  async assignSlotSeat(slotId, seatNumber, data) {
    return this.post(`/recording-slots/${slotId}/seats/${seatNumber}/assign`, data);
  }
  async clearSlotSeat(slotId, seatNumber) {
    return this.post(`/recording-slots/${slotId}/seats/${seatNumber}/clear`);
  }
  async addSlotSeats(slotId, count) {
    return this.post(`/recording-slots/${slotId}/seats/add`, { count });
  }
  async regenerateSlotRoom(slotId) {
    return this.post(`/recording-slots/${slotId}/regenerate`);
  }

  // ===== Guest Readiness Check Assessments =====
  async listGuestAssessments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/guest-assessments${qs ? '?' + qs : ''}`);
  }

  async getGuestAssessment(id) {
    return this.get(`/guest-assessments/${id}`);
  }

  async linkGuestAssessment(id, applicationId) {
    return this.patch(`/guest-assessments/${id}/link`, { applicationId });
  }
}

export default new ApiService();
