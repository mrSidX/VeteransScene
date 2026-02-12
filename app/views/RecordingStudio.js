import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'RecordingStudio',
  setup() {
    const route = useRoute();

    // State
    const sessionId = ref(null);
    const session = ref(null);
    const loading = ref(true);
    const sessionInvalid = ref(false);
    const error = ref(null);
    const activeTab = ref('device');
    const recordingTime = ref('0:00');
    const recordingDuration = ref('0:00');
    const recordingInProgress = ref(false);
    const recordedBlob = ref(null);
    const recordedBlobUrl = ref(null);
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const uploadingStatus = ref('');
    const uploadError = ref(null);
    const uploadedFile = ref(null);
    const mediaStream = ref(null);
    const mediaRecorder = ref(null);
    const recordingChunks = ref([]);
    const recordingStartTime = ref(null);
    const recordingTimerInterval = ref(null);
    const cameraDevices = ref([]);
    const microphoneDevices = ref([]);
    const selectedCamera = ref('');
    const selectedMicrophone = ref('');
    const deviceStatus = ref({ camera: false, microphone: false });

    // Audio volume meter
    const audioContext = ref(null);
    const analyser = ref(null);
    const volumeLevel = ref(0);
    const volumeMeterInterval = ref(null);

    // Computed
    const sessionStatus = computed(() => {
      if (!session.value) return 'Loading...';
      if (session.value.isExpired) return 'Expired';
      if (session.value.status === 'revoked') return 'Revoked';
      if (session.value.status === 'recording') return 'Recording...';
      if (session.value.status === 'completed') return 'Completed';
      return 'Active';
    });

    // Methods
    const loadSession = async () => {
      try {
        loading.value = true;
        console.log(`Loading session: ${sessionId.value}`);
        const response = await window.api.getSession(sessionId.value);
        console.log('Session response:', response);

        if (!response || !response.success) {
          error.value = response?.message || 'Failed to load session';
          sessionInvalid.value = true;
          return;
        }

        if (!response.data || !response.data.session) {
          error.value = 'Session data not found';
          sessionInvalid.value = true;
          return;
        }

        session.value = response.data.session;

        // Check if can record
        const canRecordResponse = await window.api.canRecord(sessionId.value);
        console.log('Can record response:', canRecordResponse);

        if (!canRecordResponse || !canRecordResponse.success || !canRecordResponse.data.canRecord) {
          error.value = 'You do not have permission to record in this session';
          sessionInvalid.value = true;
          return;
        }

        sessionInvalid.value = false;
      } catch (err) {
        console.error('Failed to load session:', err);
        error.value = err.message || 'Failed to load session';
        sessionInvalid.value = true;
      } finally {
        loading.value = false;
      }
    };

    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraDevices.value = devices.filter(d => d.kind === 'videoinput');
        microphoneDevices.value = devices.filter(d => d.kind === 'audioinput');

        console.log('[RecordingStudio] Enumerated devices:', {
          cameras: cameraDevices.value.length,
          microphones: microphoneDevices.value.length,
          selectedCamera: selectedCamera.value,
          selectedMicrophone: selectedMicrophone.value
        });

        // Only set default if nothing is selected
        if (!selectedCamera.value && cameraDevices.value.length > 0) {
          selectedCamera.value = cameraDevices.value[0].deviceId;
          console.log('[RecordingStudio] Set default camera:', selectedCamera.value);
        }
        if (!selectedMicrophone.value && microphoneDevices.value.length > 0) {
          selectedMicrophone.value = microphoneDevices.value[0].deviceId;
          console.log('[RecordingStudio] Set default microphone:', selectedMicrophone.value);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
        error.value = 'Unable to access media devices';
      }
    };

    const startMediaStream = async () => {
      try {
        // First, request generic access to trigger permission prompts
        // This is necessary to show browser permission dialogs
        const genericConstraints = {
          video: true,
          audio: true
        };

        console.log('[RecordingStudio] Requesting media access with generic constraints...');
        const stream = await navigator.mediaDevices.getUserMedia(genericConstraints);

        // Stop this temporary stream
        stream.getTracks().forEach(track => track.stop());

        // Now enumerate devices and try with specific device IDs if available
        await enumerateDevices();

        // Now get the stream with specific devices (if selected)
        const constraints = {
          video: selectedCamera.value ? { deviceId: { exact: selectedCamera.value } } : true,
          audio: selectedMicrophone.value ? { deviceId: { exact: selectedMicrophone.value } } : true
        };

        console.log('[RecordingStudio] Requesting media stream with constraints:', constraints);
        mediaStream.value = await navigator.mediaDevices.getUserMedia(constraints);

        const videoTracks = mediaStream.value.getVideoTracks();
        const audioTracks = mediaStream.value.getAudioTracks();

        deviceStatus.value = {
          camera: videoTracks.length > 0,
          microphone: audioTracks.length > 0
        };

        console.log('[RecordingStudio] Media stream acquired. Camera:', deviceStatus.value.camera, 'Microphone:', deviceStatus.value.microphone);

        // Attach stream to preview video element
        setTimeout(() => {
          const videoElement = document.querySelector('video[autoplay]');
          if (videoElement) {
            videoElement.srcObject = mediaStream.value;
            console.log('[RecordingStudio] Preview video attached to stream');
          } else {
            console.warn('[RecordingStudio] Preview video element not found');
          }
        }, 100);

        // Setup audio analyser for volume meter (show before recording)
        try {
          audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.value.createMediaStreamSource(mediaStream.value);
          analyser.value = audioContext.value.createAnalyser();
          analyser.value.fftSize = 2048;
          source.connect(analyser.value);

          // Start monitoring volume
          const updateVolume = () => {
            if (!analyser.value) return;
            const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
            analyser.value.getByteFrequencyData(dataArray);

            // Calculate average frequency magnitude
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            volumeLevel.value = Math.min(100, (average / 255) * 150);
          };

          volumeMeterInterval.value = setInterval(updateVolume, 50);
          console.log('[RecordingStudio] Audio analyser started');
        } catch (analyserErr) {
          console.warn('[RecordingStudio] Could not start audio analyser:', analyserErr);
        }
      } catch (err) {
        console.error('[RecordingStudio] Error accessing media devices:', err);
        error.value = `Camera/Microphone Error: ${err.name} - ${err.message}. Please check permissions in your browser settings.`;
      }
    };

    const switchCamera = async () => {
      if (selectedCamera.value && mediaStream.value) {
        console.log('[RecordingStudio] Switching camera to:', selectedCamera.value);
        mediaStream.value.getTracks().forEach(t => t.stop());
        // Cleanup audio analyser before switching
        if (volumeMeterInterval.value) {
          clearInterval(volumeMeterInterval.value);
          volumeMeterInterval.value = null;
        }
        if (audioContext.value && audioContext.value.state !== 'closed') {
          audioContext.value.close().catch(() => {});
          audioContext.value = null;
          analyser.value = null;
        }
        const previousSelection = selectedCamera.value;
        await startMediaStream();
        // Restore the user's selection if it was changed
        if (selectedCamera.value !== previousSelection) {
          selectedCamera.value = previousSelection;
        }
      }
    };

    const switchMicrophone = async () => {
      if (selectedMicrophone.value && mediaStream.value) {
        console.log('[RecordingStudio] Switching microphone to:', selectedMicrophone.value);
        mediaStream.value.getTracks().forEach(t => t.stop());
        // Cleanup audio analyser before switching
        if (volumeMeterInterval.value) {
          clearInterval(volumeMeterInterval.value);
          volumeMeterInterval.value = null;
        }
        if (audioContext.value && audioContext.value.state !== 'closed') {
          audioContext.value.close().catch(() => {});
          audioContext.value = null;
          analyser.value = null;
        }
        const previousSelection = selectedMicrophone.value;
        await startMediaStream();
        // Restore the user's selection if it was changed
        if (selectedMicrophone.value !== previousSelection) {
          selectedMicrophone.value = previousSelection;
        }
      }
    };

    const switchTab = (tab) => {
      activeTab.value = tab;
    };

    const startRecording = () => {
      if (!mediaStream.value) {
        error.value = 'Media stream not initialized';
        return;
      }

      try {
        console.log('[RecordingStudio] Starting recording...');
        console.log('[RecordingStudio] Media stream tracks:', {
          video: mediaStream.value.getVideoTracks().length,
          audio: mediaStream.value.getAudioTracks().length
        });

        recordingChunks.value = [];
        recordingStartTime.value = Date.now();
        recordingInProgress.value = true;

        // Try multiple MIME types in order of preference
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264,opus',
          'video/webm',
          'video/mp4',
          ''
        ];

        let selectedMimeType = '';
        for (const mime of mimeTypes) {
          if (mime === '' || MediaRecorder.isTypeSupported(mime)) {
            selectedMimeType = mime;
            break;
          }
        }

        console.log('[RecordingStudio] Using MIME type:', selectedMimeType || 'default');

        const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
        mediaRecorder.value = new MediaRecorder(mediaStream.value, options);

        mediaRecorder.value.ondataavailable = (event) => {
          console.log('[RecordingStudio] Data available:', event.data.size, 'bytes');
          if (event.data.size > 0) {
            recordingChunks.value.push(event.data);
          }
        };

        mediaRecorder.value.onstop = () => {
          console.log('[RecordingStudio] Recording stopped. Total chunks:', recordingChunks.value.length);
          console.log('[RecordingStudio] Total data size:', recordingChunks.value.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');

          if (recordingChunks.value.length === 0) {
            error.value = 'No video data was recorded. Please check your camera permissions.';
            return;
          }

          const mimeType = selectedMimeType || 'video/webm';
          recordedBlob.value = new Blob(recordingChunks.value, { type: mimeType });
          recordedBlobUrl.value = URL.createObjectURL(recordedBlob.value);
          recordingInProgress.value = false;

          console.log('[RecordingStudio] Blob created:', {
            size: recordedBlob.value.size,
            type: recordedBlob.value.type,
            url: recordedBlobUrl.value
          });
        };

        mediaRecorder.value.start();
        console.log('[RecordingStudio] MediaRecorder started');

        recordingTimerInterval.value = setInterval(() => {
          const elapsed = Date.now() - recordingStartTime.value;
          const seconds = Math.floor(elapsed / 1000);
          const minutes = Math.floor(seconds / 60);
          recordingTime.value = `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }, 100);
      } catch (err) {
        console.error('[RecordingStudio] Error starting recording:', err);
        error.value = 'Failed to start recording: ' + err.message;
        recordingInProgress.value = false;
      }
    };

    const stopRecording = () => {
      if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop();
        if (recordingTimerInterval.value) {
          clearInterval(recordingTimerInterval.value);
        }
        // Note: Audio analyser continues running so volume meter stays visible
      }
    };

    const resetRecording = () => {
      recordedBlob.value = null;
      recordedBlobUrl.value = null;
      recordingTime.value = '0:00';
      recordingInProgress.value = false;
    };

    const uploadRecording = async () => {
      if (!recordedBlob.value) {
        error.value = 'No recording available';
        return;
      }

      uploading.value = true;
      uploadProgress.value = 0;
      uploadError.value = null;

      try {
        console.log('[RecordingStudio] Starting upload. File size:', recordedBlob.value.size, 'bytes');

        uploadingStatus.value = 'Uploading recording...';
        const formData = new FormData();
        formData.append('file', recordedBlob.value, `recording-${Date.now()}.webm`);

        // Use correct endpoint with sessionId
        const endpoint = `/recordings/sessions/${sessionId.value}/upload`;
        const url = `${window.api.baseURL}${endpoint}`;
        console.log('[RecordingStudio] Uploading to:', url);

        // Get auth token
        const token = localStorage.getItem('vs_auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Use fetch directly for FormData (API service's post() method JSON.stringifies)
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        console.log('[RecordingStudio] Upload response status:', response.status);

        const responseData = await response.json();
        console.log('[RecordingStudio] Upload response:', responseData);
        console.log('[RecordingStudio] Response details:', {
          status: response.status,
          statusText: response.statusText,
          success: responseData.success,
          message: responseData.message,
          error: responseData.error,
          data: responseData.data,
          fullResponse: JSON.stringify(responseData, null, 2)
        });

        if (!response.ok) {
          const errorMsg = responseData.message || responseData.error || `Upload failed with status ${response.status}`;
          console.error('[RecordingStudio] Backend error:', errorMsg);
          throw new Error(errorMsg);
        }

        if (responseData.success) {
          uploadedFile.value = responseData.data.file;
          uploadProgress.value = 100;
          uploadingStatus.value = '✅ Upload complete! Thank you for your submission.';
          console.log('[RecordingStudio] Upload successful');
        } else {
          throw new Error(responseData.message || 'Upload failed');
        }
      } catch (err) {
        console.error('[RecordingStudio] Upload error:', err);
        uploadError.value = err.message || 'Failed to upload recording';
        uploading.value = false;
        uploadingStatus.value = '';
        error.value = `Upload Error: ${err.message}`;
      }
    };

    // Lifecycle
    onMounted(async () => {
      try {
        sessionId.value = route.params.sessionId;
        console.log(`Component mounted with sessionId: ${sessionId.value}`);

        if (!sessionId.value) {
          error.value = 'No recording session found';
          sessionInvalid.value = true;
          loading.value = false;
          return;
        }

        await loadSession();

        if (!sessionInvalid.value) {
          // startMediaStream() will request permission and enumerate devices
          await startMediaStream();
        }
      } catch (err) {
        console.error('Mount error:', err);
        error.value = err.message;
        sessionInvalid.value = true;
      }
    });

    onBeforeUnmount(() => {
      if (mediaStream.value) {
        mediaStream.value.getTracks().forEach(t => t.stop());
      }
      if (recordingTimerInterval.value) {
        clearInterval(recordingTimerInterval.value);
      }
      if (volumeMeterInterval.value) {
        clearInterval(volumeMeterInterval.value);
      }
      if (recordedBlobUrl.value) {
        URL.revokeObjectURL(recordedBlobUrl.value);
      }
      if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop();
      }
      if (audioContext.value && audioContext.value.state !== 'closed') {
        audioContext.value.close().catch(() => {});
      }
    });

    return {
      sessionId,
      session,
      loading,
      sessionInvalid,
      error,
      activeTab,
      sessionStatus,
      recordingTime,
      recordingDuration,
      recordingInProgress,
      recordedBlob,
      recordedBlobUrl,
      uploading,
      uploadProgress,
      uploadingStatus,
      uploadError,
      uploadedFile,
      cameraDevices,
      microphoneDevices,
      selectedCamera,
      selectedMicrophone,
      deviceStatus,
      volumeLevel,
      loadSession,
      enumerateDevices,
      startMediaStream,
      switchCamera,
      switchMicrophone,
      switchTab,
      startRecording,
      stopRecording,
      resetRecording,
      uploadRecording
    };
  },
  template: `
    <div class="recording-studio min-h-screen bg-gray-900 p-4 md:p-6">
      <!-- Error Container -->
      <div v-if="error" class="fixed top-20 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md z-50 border-l-4 border-red-400">
        <div class="flex items-center gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <h4 class="font-bold">Error</h4>
            <p class="text-sm">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-white text-lg font-semibold">Loading recording session...</p>
        </div>
      </div>

      <!-- Session Invalid -->
      <div v-if="sessionInvalid && !loading" class="max-w-2xl mx-auto mt-20">
        <div class="bg-gray-800 border-l-4 border-red-500 rounded-lg p-8 text-center">
          <h2 class="text-3xl font-bold text-yellow-400 mb-4">🔒 Session Expired or Invalid</h2>
          <p class="text-gray-300 text-lg mb-6">This recording session is no longer valid.</p>
          <p class="text-gray-400 mb-6">{{ error || 'Please contact the moderators for a new recording session.' }}</p>
          <a href="/#/dashboard" class="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-8 rounded-lg inline-block transition">
            ← Return to Dashboard
          </a>
        </div>
      </div>

      <!-- Main Recording Interface -->
      <div v-if="!loading && !sessionInvalid" class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-4xl font-bold text-yellow-400 mb-2">🎬 Recording Studio</h1>
          <p class="text-gray-300 text-lg">{{ session?.purpose || 'Record your message' }}</p>
        </div>

        <!-- Main Content Area -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Left: Video Preview (spans 2 columns) -->
          <div class="lg:col-span-2">
            <div class="bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
              <video
                ref="previewVideo"
                autoplay
                playsinline
                muted
                class="w-full bg-black"
                style="min-height: 400px; object-fit: cover;">
              </video>
            </div>
            <p class="text-gray-400 text-sm mt-3">👤 Live Preview - You should see yourself here</p>
          </div>

          <!-- Right: Controls Panel -->
          <div class="space-y-4">
            <!-- Status Card -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div class="text-center mb-4">
                <div class="text-gray-400 text-xs uppercase tracking-wide mb-1">Status</div>
                <div class="text-2xl font-bold text-yellow-400">{{ sessionStatus }}</div>
              </div>
              <div class="border-t border-gray-700 pt-4 text-center">
                <div class="text-gray-400 text-xs uppercase tracking-wide mb-1">Recording Time</div>
                <div class="text-3xl font-bold text-green-400 font-mono">{{ recordingTime }}</div>
              </div>
            </div>

            <!-- Recording Button -->
            <div class="space-y-2">
              <button
                v-if="!recordingInProgress && !recordedBlob"
                @click="startRecording"
                class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px] flex items-center justify-center gap-2">
                🔴 Start Recording
              </button>
              <button
                v-if="recordingInProgress"
                @click="stopRecording"
                class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px] flex items-center justify-center gap-2 animate-pulse">
                ⏹ Stop Recording
              </button>

              <!-- Volume Meter (When Microphone Active) -->
              <div v-if="deviceStatus.microphone" class="mt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold text-gray-300">🔊 Audio Level</label>
                  <span class="text-xs text-gray-400">{{ Math.round(volumeLevel) }}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
                  <div
                    class="h-3 rounded-full transition-all duration-75 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                    :style="{ width: Math.min(volumeLevel, 100) + '%' }"
                  ></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400">
                  <span>Silent</span>
                  <span>Speaking</span>
                  <span>Loud</span>
                </div>
              </div>
            </div>

            <!-- Device Status -->
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
              <h3 class="font-semibold text-white mb-3">Device Status</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-400">📷 Camera</span>
                  <span v-if="deviceStatus.camera" class="text-green-400 font-semibold">✓ Connected</span>
                  <span v-else class="text-red-400 font-semibold">✗ Not Connected</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-400">🎤 Microphone</span>
                  <span v-if="deviceStatus.microphone" class="text-green-400 font-semibold">✓ Connected</span>
                  <span v-else class="text-red-400 font-semibold">✗ Not Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Device Setup Section -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold text-yellow-400 mb-4">⚙️ Device Settings</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-300 mb-2">Camera Device</label>
              <select v-model="selectedCamera" @change="switchCamera" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400">
                <option value="">Default Camera</option>
                <option v-for="device in cameraDevices" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || 'Camera ' + device.deviceId.substring(0, 5) }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-300 mb-2">Microphone Device</label>
              <select v-model="selectedMicrophone" @change="switchMicrophone" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400">
                <option value="">Default Microphone</option>
                <option v-for="device in microphoneDevices" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || 'Microphone ' + device.deviceId.substring(0, 5) }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Review/Upload Section -->
        <div v-if="recordedBlob" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-xl font-bold text-yellow-400 mb-4">✓ Review & Upload</h2>

          <!-- Recorded Video Preview -->
          <video v-if="recordedBlobUrl" :src="recordedBlobUrl" controls class="w-full rounded-lg bg-black border-2 border-gray-700 mb-4"></video>

          <!-- Upload Status -->
          <div v-if="uploading" class="space-y-3 mb-4">
            <p class="text-gray-300 font-semibold">{{ uploadingStatus }}</p>
            <div class="w-full bg-gray-700 rounded-full h-3">
              <div class="bg-yellow-400 h-3 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
            </div>
          </div>

          <!-- Success Message -->
          <div v-if="uploadedFile" class="bg-green-900 border-l-4 border-green-400 rounded-lg p-4 mb-4">
            <p class="text-green-300 font-semibold text-lg">✅ Upload Complete!</p>
            <p class="text-green-200 text-sm">Thank you for your submission. Your recording has been received.</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              v-if="!uploadedFile"
              @click="resetRecording"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]">
              🔄 Record Again
            </button>
            <button
              v-if="!uploading && !uploadedFile"
              @click="uploadRecording"
              class="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]">
              📤 Upload Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
