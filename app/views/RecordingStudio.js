import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
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

    // Preview state
    const previewVideo = ref(null);
    const previewMuted = ref(true);
    const showPrepGuide = ref(true);

    // RAM headroom tracking
    // navigator.deviceMemory is approximate — browsers round DOWN to nearest power of 2
    // (e.g., 16GB reports as 8, 12GB reports as 8) for fingerprinting protection.
    // It is NOT free RAM, just a rough lower bound of total RAM.
    const deviceRAM = ref(navigator.deviceMemory || null);
    const recordingDataSize = ref(0); // bytes of recorded data so far
    const ramHeadroom = computed(() => {
      const usedMB = Math.round(recordingDataSize.value / (1024 * 1024));
      const totalGB = deviceRAM.value;
      if (!totalGB) return { level: 'unknown', label: 'Unknown', percent: 0, maxMB: 0, usedMB };

      // Conservative budget: 25% of the reported (already rounded-down) value
      // On a real 16GB machine reporting 8GB, this gives ~2GB budget — safe even
      // if the user has many apps open consuming the other ~14GB
      const safeBudgetMB = Math.floor(totalGB * 1024 * 0.25);
      const percent = safeBudgetMB > 0 ? Math.min(100, Math.round((usedMB / safeBudgetMB) * 100)) : 0;

      let level = 'good';
      if (percent > 85) level = 'critical';
      else if (percent > 65) level = 'warning';

      return { level, percent, maxMB: safeBudgetMB, usedMB, label: level === 'good' ? 'Good' : level === 'warning' ? 'Low' : 'Critical' };
    });

    // Media mode from session (video, audio, both)
    const sessionMediaMode = ref('video');
    const activeRecordingMode = ref('video'); // 'video' | 'audio' — user's current choice

    // Audio-only recording refs
    const audioCanvasRef = ref(null);
    const audioWaveformAnimFrame = ref(null);
    const reviewAudioPlayer = ref(null);
    const reviewCurrentTime = ref(0);
    const reviewDuration = ref(0);

    // Mode selection state — when sessionMediaMode is 'both', user picks before recording
    const modeSelected = ref(false);

    // Mic test state
    const micTestState = ref('idle'); // 'idle' | 'recording' | 'playing' | 'done'
    const micTestBlob = ref(null);
    const micTestBlobUrl = ref(null);
    const micTestPassed = ref(false);
    const micTestCountdown = ref(0);
    const micTestCountdownInterval = ref(null);
    const micTestShowTips = ref(false);
    const micTestDetected = ref(false); // true if we saw audio signal during test

    // Upload mode state
    const uploadMode = ref('record'); // 'record' | 'upload'
    const selectedUploadFile = ref(null);
    const uploadFilePreviewUrl = ref(null);
    const uploadFileError = ref(null);

    // Save to device state
    const savedToDevice = ref(false);
    const uploadFailed = ref(false);
    const pendingSavedRecordings = ref([]);

    // Disk status
    const diskStatus = ref(null);
    const diskStatusInterval = ref(null);

    // Audio meter color — green at low, yellow mid, red near peak
    const meterColor = computed(() => {
      const v = volumeLevel.value;
      if (v >= 85) return '#ef4444';       // red-500 — near clipping
      if (v >= 70) return '#f97316';       // orange-500
      if (v >= 50) return '#eab308';       // yellow-500
      if (v >= 30) return '#84cc16';       // lime-500
      return '#22c55e';                    // green-500
    });

    const diskStatusColor = computed(() => {
      if (!diskStatus.value) return 'gray';
      if (diskStatus.value.status === 'critical') return 'red';
      if (diskStatus.value.status === 'warning') return 'yellow';
      return 'green';
    });

    const diskSpaceBlocked = computed(() => {
      return diskStatus.value && diskStatus.value.status === 'critical';
    });

    const formatDiskBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const loadDiskStatus = async () => {
      try {
        const res = await window.api.getRecordingDiskStatus();
        if (res.success) {
          diskStatus.value = res.data;
        }
      } catch (err) {
        console.warn('[RecordingStudio] Failed to load disk status:', err.message);
      }
    };

    const startDiskStatusPolling = () => {
      loadDiskStatus();
      diskStatusInterval.value = setInterval(loadDiskStatus, 30000);
    };

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
        sessionMediaMode.value = session.value.mediaMode || 'video';
        if (sessionMediaMode.value === 'both') {
          // User will pick on the mode selection screen
          modeSelected.value = false;
          activeRecordingMode.value = 'video'; // default, will be set by user
        } else {
          activeRecordingMode.value = sessionMediaMode.value;
          modeSelected.value = true; // skip mode selection screen
        }

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

    const startMediaStream = async (skipPermissionCheck) => {
      try {
        const isAudioOnly = activeRecordingMode.value === 'audio';

        if (!skipPermissionCheck) {
          // First, request generic access to trigger permission prompts
          const genericConstraints = {
            video: !isAudioOnly,
            audio: true
          };

          console.log('[RecordingStudio] Requesting media access with generic constraints...', { isAudioOnly });
          const stream = await navigator.mediaDevices.getUserMedia(genericConstraints);

          // Stop this temporary stream
          stream.getTracks().forEach(track => track.stop());

          // Now enumerate devices and try with specific device IDs if available
          await enumerateDevices();
        }

        // Now get the stream with specific devices (if selected)
        // For audio: disable browser processing to get clean, uncompressed input
        // (echo cancellation, noise suppression, and auto gain control degrade quality)
        const audioConstraints = isAudioOnly ? {
          ...(selectedMicrophone.value ? { deviceId: { exact: selectedMicrophone.value } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        } : (selectedMicrophone.value ? { deviceId: { exact: selectedMicrophone.value } } : true);

        const videoConstraints = isAudioOnly ? false : {
          ...(selectedCamera.value ? { deviceId: { exact: selectedCamera.value } } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        };
        const constraints = {
          video: videoConstraints,
          audio: audioConstraints
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

        // Attach stream to preview video element via Vue ref
        await nextTick();
        if (previewVideo.value) {
          previewVideo.value.srcObject = mediaStream.value;
          previewVideo.value.muted = previewMuted.value;
          console.log('[RecordingStudio] Preview video attached to stream via ref');
        } else {
          console.warn('[RecordingStudio] Preview video ref not available');
        }

        // Setup audio analyser for volume meter (show before recording)
        try {
          audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.value.createMediaStreamSource(mediaStream.value);
          analyser.value = audioContext.value.createAnalyser();
          analyser.value.fftSize = 2048;
          source.connect(analyser.value);

          // Start monitoring volume using RMS of time-domain waveform
          const updateVolume = () => {
            if (!analyser.value) return;
            const dataArray = new Uint8Array(analyser.value.fftSize);
            analyser.value.getByteTimeDomainData(dataArray);

            // Calculate RMS (root mean square) — true signal level
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const normalized = (dataArray[i] - 128) / 128; // center around 0
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);

            // Apply sqrt curve so quiet-to-mid range is more visible
            // rms typically ranges 0–0.5 for normal speech/audio
            const scaled = Math.min(100, Math.sqrt(rms / 0.4) * 100);
            volumeLevel.value = scaled;
          };

          volumeMeterInterval.value = setInterval(updateVolume, 50);
          console.log('[RecordingStudio] Audio analyser started');
        } catch (analyserErr) {
          console.warn('[RecordingStudio] Could not start audio analyser:', analyserErr);
        }
      } catch (err) {
        console.error('[RecordingStudio] Error accessing media devices:', err);
        const isAudioOnly = activeRecordingMode.value === 'audio';
        error.value = isAudioOnly
          ? `Microphone Error: ${err.name} - ${err.message}. Please allow microphone access in your browser.`
          : `Camera/Microphone Error: ${err.name} - ${err.message}. Please check permissions in your browser settings.`;
      }
    };

    const switchCamera = async () => {
      if (!mediaStream.value) return;
      console.log('[RecordingStudio] Switching camera to:', selectedCamera.value);
      try {
        // Stop only the old video track
        mediaStream.value.getVideoTracks().forEach(t => t.stop());

        // Get a new video-only stream for the selected camera
        const videoConstraints = {
          ...(selectedCamera.value ? { deviceId: { exact: selectedCamera.value } } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        };
        const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (newVideoTrack) {
          // Remove old video track(s) and add the new one
          mediaStream.value.getVideoTracks().forEach(t => mediaStream.value.removeTrack(t));
          mediaStream.value.addTrack(newVideoTrack);

          // Re-attach to preview — some browsers need srcObject reassigned to pick up track changes
          if (previewVideo.value) {
            previewVideo.value.srcObject = null;
            previewVideo.value.srcObject = mediaStream.value;
            previewVideo.value.muted = previewMuted.value;
          }

          deviceStatus.value.camera = true;
          console.log('[RecordingStudio] Camera switched to:', newVideoTrack.label);
        }
      } catch (err) {
        console.error('[RecordingStudio] Failed to switch camera:', err);
        error.value = 'Failed to switch camera: ' + err.message;
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
        await startMediaStream(true);
      }
    };

    const togglePreviewMute = () => {
      previewMuted.value = !previewMuted.value;
      if (previewVideo.value) {
        previewVideo.value.muted = previewMuted.value;
      }
    };

    const switchTab = (tab) => {
      activeTab.value = tab;
    };

    // Permission state for UI messaging
    const permissionDenied = ref(false);
    const permissionError = ref('');

    const selectRecordingMode = async (mode) => {
      activeRecordingMode.value = mode;
      permissionDenied.value = false;
      permissionError.value = '';
      error.value = null;

      // Request permission immediately while we still have user gesture context
      try {
        const isAudioOnly = mode === 'audio';
        const permStream = await navigator.mediaDevices.getUserMedia({
          video: !isAudioOnly,
          audio: true
        });
        // Stop temporary permission stream
        permStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.error('[RecordingStudio] Permission request failed:', err);
        permissionDenied.value = true;
        permissionError.value = mode === 'audio'
          ? 'Microphone access was denied.'
          : 'Camera/Microphone access was denied.';
        // Do NOT set modeSelected — stay on mode selection screen
        return;
      }

      // Permission granted — now transition to recording UI
      modeSelected.value = true;

      // Clean up any existing streams and start fresh
      if (mediaStream.value) {
        mediaStream.value.getTracks().forEach(t => t.stop());
      }
      if (volumeMeterInterval.value) {
        clearInterval(volumeMeterInterval.value);
        volumeMeterInterval.value = null;
      }
      if (audioContext.value && audioContext.value.state !== 'closed') {
        audioContext.value.close().catch(() => {});
        audioContext.value = null;
        analyser.value = null;
      }
      await startMediaStream();
    };

    const goBackToModeSelection = () => {
      modeSelected.value = false;
      // Stop current stream
      if (mediaStream.value) {
        mediaStream.value.getTracks().forEach(t => t.stop());
        mediaStream.value = null;
      }
      if (volumeMeterInterval.value) {
        clearInterval(volumeMeterInterval.value);
        volumeMeterInterval.value = null;
      }
      if (audioContext.value && audioContext.value.state !== 'closed') {
        audioContext.value.close().catch(() => {});
        audioContext.value = null;
        analyser.value = null;
      }
      deviceStatus.value = { camera: false, microphone: false };
    };

    // === Mic Test Methods ===
    const TEST_DURATION = 5; // seconds

    const startMicTest = () => {
      if (!mediaStream.value) {
        error.value = 'Media stream not initialized';
        return;
      }

      micTestState.value = 'recording';
      micTestBlob.value = null;
      micTestDetected.value = false;
      if (micTestBlobUrl.value) {
        URL.revokeObjectURL(micTestBlobUrl.value);
        micTestBlobUrl.value = null;
      }
      micTestCountdown.value = TEST_DURATION;

      const isAudioOnly = activeRecordingMode.value === 'audio';
      const mimeTypes = isAudioOnly ? [
        'audio/webm;codecs=opus', 'audio/webm', ''
      ] : [
        'video/webm;codecs=vp9,opus', 'video/webm', ''
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (mime === '' || MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const chunks = [];
      const opts = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(mediaStream.value, opts);

      // Track peak volume during test to detect audio input
      let peakVolume = 0;
      const peakCheck = setInterval(() => {
        if (volumeLevel.value > peakVolume) peakVolume = volumeLevel.value;
        micTestDetected.value = peakVolume > 8;
      }, 100);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(peakCheck);
        micTestDetected.value = peakVolume > 8;
        const mimeType = selectedMime || (isAudioOnly ? 'audio/webm' : 'video/webm');
        micTestBlob.value = new Blob(chunks, { type: mimeType });
        micTestBlobUrl.value = URL.createObjectURL(micTestBlob.value);
        micTestState.value = 'playing';
      };

      recorder.start();

      // Countdown timer
      micTestCountdownInterval.value = setInterval(() => {
        micTestCountdown.value--;
        if (micTestCountdown.value <= 0) {
          clearInterval(micTestCountdownInterval.value);
          micTestCountdownInterval.value = null;
          if (recorder.state !== 'inactive') recorder.stop();
        }
      }, 1000);
    };

    const micTestThumbsUp = () => {
      micTestPassed.value = true;
      micTestState.value = 'done';
      cleanupMicTest();
    };

    const micTestThumbsDown = () => {
      micTestState.value = 'idle';
      micTestShowTips.value = true;
      cleanupMicTest();
    };

    const micTestRetry = () => {
      micTestState.value = 'idle';
      micTestShowTips.value = false;
      cleanupMicTest();
    };

    const cleanupMicTest = () => {
      if (micTestBlobUrl.value && micTestState.value !== 'playing') {
        URL.revokeObjectURL(micTestBlobUrl.value);
        micTestBlobUrl.value = null;
      }
      micTestBlob.value = null;
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
        recordingDataSize.value = 0;
        recordingStartTime.value = Date.now();
        recordingInProgress.value = true;

        // Try multiple MIME types in order of preference
        const isAudioOnly = activeRecordingMode.value === 'audio';
        const mimeTypes = isAudioOnly ? [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          ''
        ] : [
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
        // High bitrate for clean audio (320kbps audio-only, 5Mbps video for 1080p)
        if (isAudioOnly) {
          options.audioBitsPerSecond = 320000;
        } else {
          options.audioBitsPerSecond = 192000;
          options.videoBitsPerSecond = 5000000;
        }
        mediaRecorder.value = new MediaRecorder(mediaStream.value, options);

        mediaRecorder.value.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunks.value.push(event.data);
            recordingDataSize.value += event.data.size;
          }
        };

        mediaRecorder.value.onstop = () => {
          console.log('[RecordingStudio] Recording stopped. Total chunks:', recordingChunks.value.length);
          console.log('[RecordingStudio] Total data size:', recordingChunks.value.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');

          if (recordingChunks.value.length === 0) {
            error.value = isAudioOnly ? 'No audio data was recorded. Please check your microphone permissions.' : 'No video data was recorded. Please check your camera permissions.';
            return;
          }

          const mimeType = selectedMimeType || (isAudioOnly ? 'audio/webm' : 'video/webm');
          recordedBlob.value = new Blob(recordingChunks.value, { type: mimeType });
          recordedBlobUrl.value = URL.createObjectURL(recordedBlob.value);
          recordingInProgress.value = false;

          console.log('[RecordingStudio] Blob created:', {
            size: recordedBlob.value.size,
            type: recordedBlob.value.type,
            url: recordedBlobUrl.value
          });

          // Auto-save to device immediately to protect against data loss
          console.log('[RecordingStudio] Auto-saving recording to device...');
          saveToDevice().then(() => {
            console.log('[RecordingStudio] Auto-save complete');
          }).catch((err) => {
            console.warn('[RecordingStudio] Auto-save failed:', err);
          });
        };

        mediaRecorder.value.start(1000);
        console.log('[RecordingStudio] MediaRecorder started (1s timeslice)');

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
      savedToDevice.value = false;
      uploadFailed.value = false;
    };

    const uploadRecording = async () => {
      if (!recordedBlob.value) {
        error.value = 'No recording available';
        return;
      }

      uploading.value = true;
      uploadProgress.value = 0;
      uploadError.value = null;
      uploadFailed.value = false;

      try {
        console.log('[RecordingStudio] Starting upload. File size:', recordedBlob.value.size, 'bytes');

        uploadingStatus.value = 'Uploading recording...';
        const isAudio = activeRecordingMode.value === 'audio';
        const ext = isAudio ? 'webm' : 'webm';
        const formData = new FormData();
        formData.append('file', recordedBlob.value, `recording-${Date.now()}.${ext}`);

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
        uploadFailed.value = true;
        uploading.value = false;
        uploadingStatus.value = '';
        error.value = `Upload Error: ${err.message}`;
      }
    };

    const saveToDevice = async () => {
      if (!recordedBlob.value) return;

      // Check available space via Storage Manager API
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          const availableBytes = estimate.quota - estimate.usage;
          const blobSize = recordedBlob.value.size;
          if (availableBytes < blobSize * 2) {
            const availableMB = Math.round(availableBytes / (1024 * 1024));
            const neededMB = Math.round(blobSize / (1024 * 1024));
            if (!confirm(
              'Low disk space warning!\\n\\n' +
              'Your browser reports approximately ' + availableMB + 'MB available, ' +
              'and the recording is about ' + neededMB + 'MB.\\n\\n' +
              'Make sure you have enough free disk space before saving.\\n\\n' +
              'Save anyway?'
            )) {
              return;
            }
          }
        } catch (e) {
          console.warn('[RecordingStudio] Storage estimate unavailable:', e);
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const mediaType = activeRecordingMode.value;
      const filename = 'vs-recording__' + sessionId.value + '__' + timestamp + '__' + mediaType + '.webm';

      // Trigger browser download
      const url = URL.createObjectURL(recordedBlob.value);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Track in localStorage for dashboard reminder
      try {
        const saved = JSON.parse(localStorage.getItem('vs_saved_recordings') || '[]');
        saved.push({
          sessionId: sessionId.value,
          timestamp: new Date().toISOString(),
          mediaType,
          filename,
          purpose: session.value?.purpose || ''
        });
        localStorage.setItem('vs_saved_recordings', JSON.stringify(saved));
      } catch (e) {
        console.warn('[RecordingStudio] Could not save to localStorage:', e);
      }

      savedToDevice.value = true;
    };

    const selectUploadFile = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      uploadFileError.value = null;

      // Validate MIME type
      // Note: .webm files may report as video/webm even for audio-only recordings,
      // so we accept both audio/* and video/webm when in audio mode.
      const isAudio = activeRecordingMode.value === 'audio';
      if (isAudio) {
        if (!file.type.startsWith('audio/') && file.type !== 'video/webm') {
          uploadFileError.value = 'Please select an audio file (MP3, WAV, OGG, WebM, etc.)';
          return;
        }
      } else {
        if (!file.type.startsWith('video/')) {
          uploadFileError.value = 'Please select a video file (MP4, MOV, WebM, AVI, etc.)';
          return;
        }
      }

      // Validate file size (warn if > 2GB, backend limit is 5GB)
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      if (fileSizeGB > 5) {
        uploadFileError.value = `File is too large (${fileSizeGB.toFixed(2)}GB). Maximum size is 5GB.`;
        return;
      }
      if (fileSizeGB > 2) {
        console.warn(`[RecordingStudio] Selected file is large: ${fileSizeGB.toFixed(2)}GB. Upload may take time.`);
      }

      selectedUploadFile.value = file;
      uploadFilePreviewUrl.value = URL.createObjectURL(file);
      console.log('[RecordingStudio] File selected:', { name: file.name, size: file.size, type: file.type });
    };

    const clearUploadFile = () => {
      if (uploadFilePreviewUrl.value) {
        URL.revokeObjectURL(uploadFilePreviewUrl.value);
      }
      selectedUploadFile.value = null;
      uploadFilePreviewUrl.value = null;
      uploadFileError.value = null;
    };

    const uploadSelectedFile = async () => {
      if (!selectedUploadFile.value) {
        uploadFileError.value = 'No file selected';
        return;
      }

      uploading.value = true;
      uploadProgress.value = 0;
      uploadError.value = null;
      uploadFileError.value = null;

      try {
        console.log('[RecordingStudio] Starting file upload. File size:', selectedUploadFile.value.size, 'bytes');

        uploadingStatus.value = 'Uploading video file...';
        const formData = new FormData();
        formData.append('file', selectedUploadFile.value);

        // Use correct endpoint with sessionId
        const endpoint = `/recordings/sessions/${sessionId.value}/upload`;
        const url = `${window.api.baseURL}${endpoint}`;
        console.log('[RecordingStudio] Uploading to:', url);

        // Get auth token
        const token = localStorage.getItem('vs_auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Use fetch directly for FormData
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

        if (!response.ok) {
          const errorMsg = responseData.message || responseData.error || `Upload failed with status ${response.status}`;
          console.error('[RecordingStudio] Backend error:', errorMsg);
          throw new Error(errorMsg);
        }

        if (responseData.success) {
          uploadedFile.value = responseData.data.file;
          uploadProgress.value = 100;
          uploadingStatus.value = '✅ Upload complete! Thank you for your submission.';
          uploading.value = false;
          console.log('[RecordingStudio] File upload successful');

          // Clear saved recording entries for this session from localStorage
          try {
            const saved = JSON.parse(localStorage.getItem('vs_saved_recordings') || '[]');
            const remaining = saved.filter(r => r.sessionId !== sessionId.value);
            if (remaining.length > 0) {
              localStorage.setItem('vs_saved_recordings', JSON.stringify(remaining));
            } else {
              localStorage.removeItem('vs_saved_recordings');
            }
          } catch (e) { /* ignore */ }
        } else {
          throw new Error(responseData.message || 'Upload failed');
        }
      } catch (err) {
        console.error('[RecordingStudio] File upload error:', err);
        uploadFileError.value = err.message || 'Failed to upload file';
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
          startDiskStatusPolling();

          // Check if we should open in upload mode (e.g. from saved recording banner)
          if (route.query.tab === 'upload') {
            uploadMode.value = 'upload';
            // Load saved recordings for this session to show hints
            try {
              const all = JSON.parse(localStorage.getItem('vs_saved_recordings') || '[]');
              pendingSavedRecordings.value = all.filter(r => r.sessionId === sessionId.value);
            } catch (e) { /* ignore */ }
          }

          // Only start media stream immediately if mode is already selected (not 'both')
          if (modeSelected.value) {
            await startMediaStream();
          }
        }
      } catch (err) {
        console.error('Mount error:', err);
        error.value = err.message;
        sessionInvalid.value = true;
      }
    });

    onBeforeUnmount(() => {
      if (diskStatusInterval.value) {
        clearInterval(diskStatusInterval.value);
      }
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
      if (uploadFilePreviewUrl.value) {
        URL.revokeObjectURL(uploadFilePreviewUrl.value);
      }
      if (micTestBlobUrl.value) {
        URL.revokeObjectURL(micTestBlobUrl.value);
      }
      if (micTestCountdownInterval.value) {
        clearInterval(micTestCountdownInterval.value);
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
      previewVideo,
      previewMuted,
      showPrepGuide,
      deviceRAM,
      recordingDataSize,
      ramHeadroom,
      uploadMode,
      selectedUploadFile,
      uploadFilePreviewUrl,
      uploadFileError,
      loadSession,
      enumerateDevices,
      startMediaStream,
      switchCamera,
      switchMicrophone,
      togglePreviewMute,
      switchTab,
      startRecording,
      stopRecording,
      resetRecording,
      uploadRecording,
      selectUploadFile,
      clearUploadFile,
      uploadSelectedFile,
      diskStatus,
      diskStatusColor,
      diskSpaceBlocked,
      formatDiskBytes,
      sessionMediaMode,
      activeRecordingMode,
      modeSelected,
      selectRecordingMode,
      goBackToModeSelection,
      audioCanvasRef,
      permissionDenied,
      permissionError,
      meterColor,
      micTestState,
      micTestBlobUrl,
      micTestPassed,
      micTestCountdown,
      micTestShowTips,
      micTestDetected,
      startMicTest,
      micTestThumbsUp,
      micTestThumbsDown,
      micTestRetry,
      TEST_DURATION,
      savedToDevice,
      uploadFailed,
      saveToDevice,
      pendingSavedRecordings
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

      <!-- Disk Status Bar -->
      <div v-if="diskStatus && !loading && !sessionInvalid" class="max-w-4xl mx-auto mb-4">
        <!-- Critical: Block recording -->
        <div v-if="diskSpaceBlocked" class="bg-red-600/30 border border-red-500 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🔴</span>
            <div class="flex-1">
              <p class="text-red-300 font-semibold">No Storage Space Available</p>
              <p class="text-red-400 text-sm">All recording disks are full. Recording and uploads are disabled until space is freed.</p>
            </div>
          </div>
        </div>
        <!-- Warning -->
        <div v-else-if="diskStatus.status === 'warning'" class="bg-yellow-600/20 border border-yellow-500/50 rounded-lg px-4 py-2">
          <div class="flex items-center gap-3">
            <span>🟡</span>
            <div class="flex-1 flex items-center gap-3">
              <span class="text-yellow-300 text-sm font-medium">Storage running low</span>
              <div class="flex-1 max-w-xs bg-gray-700 rounded-full h-2">
                <div class="h-2 rounded-full bg-yellow-500 transition-all" :style="{ width: diskStatus.percentUsed + '%' }"></div>
              </div>
              <span class="text-yellow-400 text-sm font-mono">{{ formatDiskBytes(diskStatus.available) }} free</span>
            </div>
          </div>
        </div>
        <!-- OK -->
        <div v-else class="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
          <div class="flex items-center gap-3">
            <span>🟢</span>
            <div class="flex-1 flex items-center gap-3">
              <span class="text-gray-400 text-sm">Storage</span>
              <div class="flex-1 max-w-xs bg-gray-700 rounded-full h-2">
                <div class="h-2 rounded-full bg-green-500 transition-all" :style="{ width: diskStatus.percentUsed + '%' }"></div>
              </div>
              <span class="text-green-400 text-sm font-mono">{{ formatDiskBytes(diskStatus.available) }} free</span>
            </div>
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
          <h1 class="text-4xl font-bold text-yellow-400 mb-2">{{ activeRecordingMode === 'audio' && modeSelected ? '🎙️ Audio Studio' : '🎬 Recording Studio' }}</h1>
          <p class="text-gray-300 text-lg">{{ session?.purpose || 'Record your message' }}</p>
        </div>

        <!-- ============================================ -->
        <!-- MODE SELECTION SCREEN (when mediaMode='both') -->
        <!-- ============================================ -->
        <div v-if="!modeSelected" class="max-w-3xl mx-auto">
          <div class="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
            <h2 class="text-2xl font-bold text-white mb-2">How would you like to record?</h2>
            <p class="text-gray-400 mb-8">Choose your recording method below</p>

            <!-- Permission Denied Warning -->
            <div v-if="permissionDenied" class="bg-red-900/30 border border-red-500 rounded-xl p-6 mb-6 text-left">
              <h3 class="text-lg font-bold text-red-300 mb-2">{{ permissionError }}</h3>
              <p class="text-gray-300 text-sm mb-3">Your browser is blocking access. To fix this:</p>
              <ol class="text-gray-400 text-sm space-y-1 list-decimal list-inside mb-4">
                <li>Click the <strong class="text-gray-200">lock icon</strong> (or tune/settings icon) in your browser's address bar</li>
                <li>Find <strong class="text-gray-200">Microphone</strong> (and Camera if recording video)</li>
                <li>Change from "Block" to <strong class="text-gray-200">Allow</strong></li>
                <li>Reload the page and try again</li>
              </ol>
              <button
                @click="permissionDenied = false; permissionError = ''"
                class="text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition">
                Dismiss &amp; Try Again
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Video Option -->
              <button
                @click="selectRecordingMode('video')"
                class="group bg-gray-700/50 hover:bg-gray-700 border-2 border-gray-600 hover:border-yellow-400 rounded-xl p-8 transition-all duration-200 text-left">
                <div class="text-5xl mb-4">🎥</div>
                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition">Record Video</h3>
                <p class="text-gray-400 text-sm">Record video and audio using your webcam and microphone</p>
              </button>

              <!-- Audio Only Option -->
              <button
                @click="selectRecordingMode('audio')"
                class="group bg-gray-700/50 hover:bg-gray-700 border-2 border-gray-600 hover:border-yellow-400 rounded-xl p-8 transition-all duration-200 text-left">
                <div class="text-5xl mb-4">🎙️</div>
                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition">Audio Only</h3>
                <p class="text-gray-400 text-sm">Record audio only using your microphone — no camera needed</p>
              </button>
            </div>
          </div>
        </div>

        <!-- ============================================ -->
        <!-- RECORDING INTERFACE (after mode is selected) -->
        <!-- ============================================ -->
        <div v-if="modeSelected">

          <!-- Back to mode selection (only when session allows both) -->
          <button
            v-if="sessionMediaMode === 'both' && !recordingInProgress && !recordedBlob && !uploading"
            @click="goBackToModeSelection"
            class="mb-4 text-gray-400 hover:text-yellow-400 text-sm font-medium transition flex items-center gap-1">
            ← Change recording mode
          </button>

          <!-- Mode Selector Tabs -->
          <div class="flex gap-2 mb-6">
            <button
              @click="uploadMode='record'"
              :class="[
                'flex-1 py-3 px-4 rounded-lg font-bold transition duration-200 min-h-[44px] flex items-center justify-center gap-2',
                uploadMode === 'record'
                  ? 'bg-yellow-400 text-gray-900 shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              ]">
              {{ activeRecordingMode === 'audio' ? '🎙️ Record Audio' : '🎥 Record with Webcam' }}
            </button>
            <button
              @click="uploadMode='upload'"
              :class="[
                'flex-1 py-3 px-4 rounded-lg font-bold transition duration-200 min-h-[44px] flex items-center justify-center gap-2',
                uploadMode === 'upload'
                  ? 'bg-yellow-400 text-gray-900 shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              ]">
              {{ activeRecordingMode === 'audio' ? '📁 Upload Audio File' : '📁 Upload Pre-Recorded Video' }}
            </button>
          </div>

          <!-- ======================== -->
          <!-- PREPARATION GUIDE        -->
          <!-- ======================== -->
          <div v-if="uploadMode === 'record' && !recordingInProgress && !recordedBlob" class="mb-6">
            <div class="bg-gray-800 border border-yellow-500/40 rounded-lg overflow-hidden">
              <button @click="showPrepGuide = !showPrepGuide" class="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-750 transition">
                <span class="text-yellow-400 font-semibold text-sm flex items-center gap-2">
                  ⚠️ Important: Read Before Recording
                </span>
                <span class="text-gray-400 text-xs">{{ showPrepGuide ? '▲ Hide' : '▼ Show' }}</span>
              </button>
              <div v-if="showPrepGuide" class="px-5 pb-5 border-t border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <!-- Before You Record -->
                  <div class="space-y-3">
                    <h4 class="text-white font-semibold text-sm">Before You Record</h4>
                    <ul class="text-gray-300 text-sm space-y-2">
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">1.</span> <strong>Close all other apps</strong> — browsers, Zoom, Spotify, etc. Your recording uses your computer's memory (RAM), and other apps compete for it.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">2.</span> <strong>Close other browser tabs</strong> — each open tab uses memory. Keep only this tab open.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">3.</span> <strong>Plug in your charger</strong> — recording uses significant battery.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">4.</span> <strong>Use a stable internet connection</strong> — Wi-Fi or wired. You'll need it for uploading afterward.</li>
                    </ul>
                  </div>
                  <!-- During & After -->
                  <div class="space-y-3">
                    <h4 class="text-white font-semibold text-sm">During & After Recording</h4>
                    <ul class="text-gray-300 text-sm space-y-2">
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">5.</span> <strong>Do NOT close or refresh this tab</strong> — your recording lives in browser memory until saved. Closing the tab loses it.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">6.</span> When you stop recording, a <strong>backup copy is automatically saved</strong> to your Downloads folder.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">7.</span> After reviewing, click <strong>Upload</strong> and <strong>wait for the "Upload Complete" confirmation</strong>. Do not close the tab until you see it.</li>
                      <li class="flex gap-2"><span class="text-yellow-400 flex-shrink-0">8.</span> On slower connections, uploads may take several minutes for longer recordings. <strong>Be patient</strong> — the progress bar will update.</li>
                    </ul>
                  </div>
                </div>
                <!-- Hardware Guide -->
                <div class="mt-4 pt-4 border-t border-gray-700">
                  <h4 class="text-white font-semibold text-sm mb-2">💻 Hardware & Recording Limits</h4>
                  <p v-if="deviceRAM" class="text-yellow-300 text-xs mb-2 font-semibold">Your device reports at least {{ deviceRAM }} GB RAM (browsers round down for privacy — your actual RAM may be higher)</p>
                  <p class="text-gray-400 text-xs mb-3">Your recording is stored in your computer's memory (RAM) while you record. Here's what to expect:</p>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-gray-900 rounded-lg p-3 text-center">
                      <div class="text-red-400 font-bold text-lg">4 GB</div>
                      <div class="text-gray-500 text-xs mt-1">~10-15 min video</div>
                      <div class="text-gray-600 text-xs">~30 min audio</div>
                    </div>
                    <div class="bg-gray-900 rounded-lg p-3 text-center">
                      <div class="text-yellow-400 font-bold text-lg">8 GB</div>
                      <div class="text-gray-500 text-xs mt-1">~30-45 min video</div>
                      <div class="text-gray-600 text-xs">~2 hrs audio</div>
                    </div>
                    <div class="bg-gray-900 rounded-lg p-3 text-center">
                      <div class="text-green-400 font-bold text-lg">16 GB</div>
                      <div class="text-gray-500 text-xs mt-1">~1-2 hrs video</div>
                      <div class="text-gray-600 text-xs">~4+ hrs audio</div>
                    </div>
                    <div class="bg-gray-900 rounded-lg p-3 text-center">
                      <div class="text-blue-400 font-bold text-lg">32 GB+</div>
                      <div class="text-gray-500 text-xs mt-1">~3+ hrs video</div>
                      <div class="text-gray-600 text-xs">Extended audio</div>
                    </div>
                  </div>
                  <p class="text-gray-500 text-xs mt-2">* Estimates based on 1080p video at 5 Mbps (~37 MB/min) and audio at 320 kbps (~2.4 MB/min). Actual usage depends on your system and other running apps.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================== -->
          <!-- VIDEO RECORD MODE        -->
          <!-- ======================== -->
          <div v-if="uploadMode === 'record' && activeRecordingMode === 'video'" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Left: Video Preview (spans 2 columns) -->
            <div class="lg:col-span-2">
              <div class="bg-gray-800 rounded-lg overflow-hidden border-2 relative" :class="recordingInProgress ? 'border-red-500' : 'border-gray-700'">
                <video
                  ref="previewVideo"
                  autoplay
                  playsinline
                  :muted="previewMuted"
                  class="w-full bg-black"
                  style="aspect-ratio: 16/9; object-fit: contain;">
                </video>

                <!-- Recording Indicator Overlay -->
                <div v-if="recordingInProgress" class="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span class="text-white text-sm font-bold">REC {{ recordingTime }}</span>
                </div>

                <!-- Mute/Unmute Toggle -->
                <button
                  @click="togglePreviewMute"
                  class="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition"
                  :title="previewMuted ? 'Unmute preview' : 'Mute preview'">
                  <span v-if="previewMuted" class="text-lg">🔇</span>
                  <span v-else class="text-lg">🔊</span>
                </button>
              </div>
              <div class="flex items-center justify-between mt-3">
                <p class="text-gray-400 text-sm">👤 Live Preview - You should see yourself here</p>
                <p class="text-gray-500 text-xs">Audio {{ previewMuted ? 'muted' : 'on' }}</p>
              </div>
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

                <!-- RAM Headroom Indicator -->
                <div v-if="recordingInProgress || recordedBlob" class="border-t border-gray-700 pt-4 mt-4">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-gray-400 text-xs uppercase tracking-wide">Memory</span>
                    <span class="text-xs font-mono" :class="{
                      'text-green-400': ramHeadroom.level === 'good',
                      'text-yellow-400': ramHeadroom.level === 'warning',
                      'text-red-400': ramHeadroom.level === 'critical',
                      'text-gray-400': ramHeadroom.level === 'unknown'
                    }">{{ ramHeadroom.usedMB }} MB{{ ramHeadroom.maxMB ? ' / ~' + ramHeadroom.maxMB + ' MB' : '' }}</span>
                  </div>
                  <div v-if="ramHeadroom.level !== 'unknown'" class="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div class="h-2.5 rounded-full transition-all duration-500" :style="{ width: ramHeadroom.percent + '%' }" :class="{
                      'bg-green-500': ramHeadroom.level === 'good',
                      'bg-yellow-500': ramHeadroom.level === 'warning',
                      'bg-red-500 animate-pulse': ramHeadroom.level === 'critical'
                    }"></div>
                  </div>
                  <p v-if="ramHeadroom.level === 'unknown'" class="text-gray-500 text-xs mt-1">Recording size: {{ ramHeadroom.usedMB }} MB</p>
                  <p v-if="ramHeadroom.level === 'warning'" class="text-yellow-400 text-xs mt-1.5">⚠️ Memory getting low — wrap up soon</p>
                  <p v-if="ramHeadroom.level === 'critical'" class="text-red-400 text-xs mt-1.5 font-semibold">🛑 Stop recording now to avoid data loss</p>
                  <p v-if="deviceRAM" class="text-gray-600 text-xs mt-1">{{ deviceRAM }}+ GB RAM (approximate)</p>
                </div>
              </div>

              <!-- Recording Button -->
              <div class="space-y-2">
                <button
                  v-if="!recordingInProgress && !recordedBlob"
                  @click="startRecording"
                  :disabled="diskSpaceBlocked"
                  class="w-full font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px] flex items-center justify-center gap-2"
                  :class="diskSpaceBlocked ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'">
                  {{ diskSpaceBlocked ? '⛔ No Disk Space' : '🔴 Start Recording' }}
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
                      class="h-3 rounded-full transition-all duration-75"
                      :style="{ width: Math.min(volumeLevel, 100) + '%', backgroundColor: meterColor }"
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

          <!-- ======================== -->
          <!-- AUDIO-ONLY RECORD MODE   -->
          <!-- ======================== -->
          <div v-if="uploadMode === 'record' && activeRecordingMode === 'audio'" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Left: Audio Visualization (spans 2 columns) -->
            <div class="lg:col-span-2">
              <div class="bg-gray-800 rounded-lg overflow-hidden border-2 relative" :class="recordingInProgress ? 'border-red-500' : 'border-gray-700'">
                <!-- Audio Waveform / Visualization Area -->
                <div class="w-full bg-gray-900 flex flex-col items-center justify-center" style="min-height: 300px;">
                  <!-- Idle state -->
                  <div v-if="!recordingInProgress && !recordedBlob" class="text-center">
                    <div class="text-6xl mb-4">🎙️</div>
                    <p class="text-gray-300 text-lg font-semibold">Audio Recording</p>
                    <p class="text-gray-500 text-sm mt-1">Press "Start Recording" to begin</p>
                  </div>

                  <!-- Recording state - animated waveform bars -->
                  <div v-if="recordingInProgress" class="flex items-center justify-center gap-1 h-40">
                    <div v-for="i in 20" :key="i"
                      class="bg-gradient-to-t from-green-500 to-yellow-400 rounded-full transition-all duration-75"
                      :style="{
                        width: '8px',
                        height: Math.max(8, (volumeLevel * (0.5 + Math.random())) * 0.8) + 'px',
                        opacity: 0.6 + Math.random() * 0.4
                      }">
                    </div>
                  </div>

                  <!-- Done recording -->
                  <div v-if="recordedBlob && !recordingInProgress" class="text-center px-4">
                    <div class="text-5xl mb-3">✅</div>
                    <p class="text-green-400 font-bold text-lg mb-2">Recording Complete!</p>
                    <p class="text-gray-300 text-sm">Scroll down to preview your audio, review the quality, and upload your recording.</p>
                    <div class="mt-4 text-yellow-400 text-2xl animate-bounce">↓</div>
                  </div>
                </div>

                <!-- Recording Indicator Overlay -->
                <div v-if="recordingInProgress" class="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span class="text-white text-sm font-bold">REC {{ recordingTime }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between mt-3">
                <p class="text-gray-400 text-sm">🎙️ Audio Only Mode — no camera used</p>
              </div>
            </div>

            <!-- Right: Controls Panel (Audio) -->
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

                <!-- RAM Headroom Indicator (Audio) -->
                <div v-if="recordingInProgress || recordedBlob" class="border-t border-gray-700 pt-4 mt-4">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-gray-400 text-xs uppercase tracking-wide">Memory</span>
                    <span class="text-xs font-mono" :class="{
                      'text-green-400': ramHeadroom.level === 'good',
                      'text-yellow-400': ramHeadroom.level === 'warning',
                      'text-red-400': ramHeadroom.level === 'critical',
                      'text-gray-400': ramHeadroom.level === 'unknown'
                    }">{{ ramHeadroom.usedMB }} MB{{ ramHeadroom.maxMB ? ' / ~' + ramHeadroom.maxMB + ' MB' : '' }}</span>
                  </div>
                  <div v-if="ramHeadroom.level !== 'unknown'" class="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div class="h-2.5 rounded-full transition-all duration-500" :style="{ width: ramHeadroom.percent + '%' }" :class="{
                      'bg-green-500': ramHeadroom.level === 'good',
                      'bg-yellow-500': ramHeadroom.level === 'warning',
                      'bg-red-500 animate-pulse': ramHeadroom.level === 'critical'
                    }"></div>
                  </div>
                  <p v-if="ramHeadroom.level === 'unknown'" class="text-gray-500 text-xs mt-1">Recording size: {{ ramHeadroom.usedMB }} MB</p>
                  <p v-if="ramHeadroom.level === 'warning'" class="text-yellow-400 text-xs mt-1.5">⚠️ Memory getting low — wrap up soon</p>
                  <p v-if="ramHeadroom.level === 'critical'" class="text-red-400 text-xs mt-1.5 font-semibold">🛑 Stop recording now to avoid data loss</p>
                  <p v-if="deviceRAM" class="text-gray-600 text-xs mt-1">{{ deviceRAM }}+ GB RAM (approximate)</p>
                </div>
              </div>

              <!-- Recording Button -->
              <div class="space-y-2">
                <button
                  v-if="!recordingInProgress && !recordedBlob"
                  @click="startRecording"
                  :disabled="diskSpaceBlocked"
                  class="w-full font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px] flex items-center justify-center gap-2"
                  :class="diskSpaceBlocked ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'">
                  {{ diskSpaceBlocked ? '⛔ No Disk Space' : '🔴 Start Recording' }}
                </button>
                <button
                  v-if="recordingInProgress"
                  @click="stopRecording"
                  class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px] flex items-center justify-center gap-2 animate-pulse">
                  ⏹ Stop Recording
                </button>

                <!-- Volume Meter -->
                <div v-if="deviceStatus.microphone" class="mt-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-semibold text-gray-300">🔊 Audio Level</label>
                    <span class="text-xs text-gray-400">{{ Math.round(volumeLevel) }}%</span>
                  </div>
                  <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
                    <div
                      class="h-3 rounded-full transition-all duration-75"
                      :style="{ width: Math.min(volumeLevel, 100) + '%', backgroundColor: meterColor }"
                    ></div>
                  </div>
                  <div class="flex justify-between text-xs text-gray-400">
                    <span>Silent</span>
                    <span>Speaking</span>
                    <span>Loud</span>
                  </div>
                </div>
              </div>

              <!-- Device Status (Audio Only) -->
              <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
                <h3 class="font-semibold text-white mb-3">Device Status</h3>
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-400">🎤 Microphone</span>
                    <span v-if="deviceStatus.microphone" class="text-green-400 font-semibold">✓ Connected</span>
                    <span v-else class="text-red-400 font-semibold">✗ Not Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Device Setup Section (Record Mode) -->
          <div v-if="uploadMode === 'record'" class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">⚙️ Device Settings</h2>

            <!-- Microphone hint -->
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-3 mb-4">
              <p class="text-blue-300 text-sm">
                <strong>🎤 Tip:</strong> If you have an external microphone, USB mic, or audio interface (such as a Focusrite, Blue Yeti, etc.), make sure to select it below. The default may use your webcam or built-in mic, which will result in lower audio quality.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="activeRecordingMode === 'video'">
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
                <p v-if="microphoneDevices.length > 1" class="text-xs text-yellow-400/80 mt-1">{{ microphoneDevices.length }} microphones detected — verify the correct one is selected</p>
              </div>
            </div>
          </div>

          <!-- ======================== -->
          <!-- MIC TEST SECTION          -->
          <!-- ======================== -->
          <div v-if="uploadMode === 'record' && !recordedBlob && !recordingInProgress && deviceStatus.microphone" class="mb-6">
            <!-- Passed state — compact confirmation -->
            <div v-if="micTestPassed" class="bg-green-900/20 border border-green-600/40 rounded-lg px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-green-400 text-lg">✓</span>
                <span class="text-green-300 text-sm font-medium">Mic test passed — you're ready to record</span>
              </div>
              <button @click="micTestPassed = false; micTestState = 'idle'" class="text-gray-500 hover:text-gray-300 text-xs transition">Test again</button>
            </div>

            <!-- Test UI (not yet passed) -->
            <div v-if="!micTestPassed" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  🎤 Test Your Microphone
                </h3>
                <button
                  @click="micTestShowTips = !micTestShowTips"
                  class="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm font-bold flex items-center justify-center transition"
                  title="Troubleshooting tips">
                  i
                </button>
              </div>

              <!-- Troubleshooting tips (toggle) -->
              <div v-if="micTestShowTips" class="bg-gray-900/60 border border-gray-600 rounded-lg p-4 mb-4 text-sm">
                <p class="text-gray-200 font-semibold mb-2">Quick Troubleshooting</p>
                <ul class="text-gray-400 space-y-1.5">
                  <li>• <strong class="text-gray-300">No audio detected?</strong> Try tapping or speaking directly into your mic</li>
                  <li>• <strong class="text-gray-300">Wrong mic selected?</strong> Change it in the Device Settings dropdown above</li>
                  <li>• <strong class="text-gray-300">Sounds muffled or distant?</strong> You may be using your webcam mic — select your external mic above</li>
                  <li>• <strong class="text-gray-300">Audio interface users:</strong> Make sure your input gain is turned up and the correct input channel is selected in your system audio settings</li>
                  <li>• <strong class="text-gray-300">Still not working?</strong> Check your browser's site permissions (lock icon in address bar) and ensure microphone access is allowed</li>
                </ul>
                <button @click="micTestShowTips = false" class="text-yellow-400 hover:text-yellow-300 text-xs font-medium mt-3 transition">Dismiss</button>
              </div>

              <!-- Idle: prompt to test -->
              <div v-if="micTestState === 'idle'">
                <p class="text-gray-400 text-sm mb-3">Record a quick {{ TEST_DURATION || 5 }}-second test to make sure your mic sounds good before the real recording.</p>
                <button
                  @click="startMicTest"
                  class="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-5 rounded-lg transition text-sm">
                  🎙️ Start Test Recording
                </button>
              </div>

              <!-- Recording test -->
              <div v-if="micTestState === 'recording'">
                <div class="flex items-center gap-4 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    <span class="text-white font-semibold text-sm">Listening... {{ micTestCountdown }}s</span>
                  </div>
                  <div class="flex-1 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div class="h-2.5 rounded-full transition-all duration-75" :style="{ width: Math.min(volumeLevel, 100) + '%', backgroundColor: meterColor }"></div>
                  </div>
                </div>
                <p class="text-gray-400 text-sm">
                  <span v-if="micTestDetected" class="text-green-400 font-medium">✓ We detect your audio!</span>
                  <span v-else>Speak or tap your mic now...</span>
                </p>
              </div>

              <!-- Playback & rating -->
              <div v-if="micTestState === 'playing'">
                <div class="flex items-center gap-3 mb-3">
                  <span v-if="micTestDetected" class="text-green-400 font-medium text-sm">✓ Audio detected</span>
                  <span v-else class="text-red-400 font-medium text-sm">⚠ No audio detected — check your mic</span>
                </div>

                <div class="bg-gray-900 rounded-lg border border-gray-600 p-4 mb-4">
                  <p class="text-gray-300 text-sm mb-2">Listen to your test:</p>
                  <audio :src="micTestBlobUrl" controls class="w-full" autoplay></audio>
                </div>

                <p class="text-gray-400 text-sm mb-3">Does your audio sound clear?</p>
                <div class="flex gap-3">
                  <button
                    @click="micTestThumbsUp"
                    class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2">
                    👍 Sounds Good
                  </button>
                  <button
                    @click="micTestThumbsDown"
                    class="flex-1 bg-red-600/80 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2">
                    👎 Not Right
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Review/Upload Section (Record Mode) -->
          <div v-if="uploadMode === 'record' && recordedBlob" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">✓ Review & Upload</h2>

            <!-- Auto-save confirmation -->
            <div v-if="savedToDevice" class="bg-green-900/30 border border-green-500/40 rounded-lg p-4 mb-4">
              <p class="text-green-300 text-sm flex items-center gap-2">
                <span class="text-lg">💾</span>
                <strong>Backup saved!</strong> A copy of your recording was automatically saved to your Downloads folder. If anything goes wrong, you can upload it later from your dashboard.
              </p>
            </div>

            <!-- Post-recording instructions -->
            <div v-if="!uploadedFile" class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 mb-4">
              <p class="text-blue-300 text-sm mb-2"><strong>Before you upload:</strong></p>
              <ol class="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                <li>Play back your recording below to check the quality</li>
                <li>Make sure the audio is clear and at a good volume</li>
                <li v-if="activeRecordingMode === 'audio'">If it sounds muffled or distant, go back and select your external microphone in Device Settings</li>
                <li v-else>If the audio sounds muffled or distant, check that the correct microphone is selected in Device Settings</li>
                <li>When you're happy with it, click <strong class="text-yellow-400">Upload Recording</strong></li>
              </ol>
            </div>

            <!-- Upload warning -->
            <div v-if="!uploadedFile" class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p class="text-red-300 text-sm flex items-center gap-2 mb-2">
                <span class="text-lg">🚫</span>
                <strong>Do NOT close this tab during upload</strong>
              </p>
              <ul class="text-gray-400 text-xs space-y-1 ml-7">
                <li>• Uploading may take several minutes on slower connections — this is normal</li>
                <li>• Wait for the <strong class="text-green-400">"Upload Complete"</strong> confirmation before closing</li>
                <li>• If the upload fails, your backup copy is safe in your Downloads folder — you can return and upload it later</li>
              </ul>
            </div>

            <!-- Recorded Video Preview -->
            <video v-if="recordedBlobUrl && activeRecordingMode === 'video'" :src="recordedBlobUrl" controls class="w-full rounded-lg bg-black border-2 border-gray-700 mb-4"></video>

            <!-- Recorded Audio Preview -->
            <div v-if="recordedBlobUrl && activeRecordingMode === 'audio'" class="mb-4">
              <div class="bg-gray-900 rounded-lg border-2 border-gray-700 p-6">
                <div class="flex items-center gap-4 mb-3">
                  <div class="text-4xl">🎧</div>
                  <div class="flex-1">
                    <p class="text-white font-semibold">Preview Your Recording</p>
                    <p class="text-gray-400 text-sm">Duration: {{ recordingTime }} — Press play to listen back</p>
                  </div>
                </div>
                <audio :src="recordedBlobUrl" controls class="w-full"></audio>
              </div>
            </div>

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

            <!-- Upload Failed - Save to Device Fallback -->
            <div v-if="uploadFailed && !uploading && !uploadedFile" class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
              <p class="text-red-300 font-semibold mb-2">Upload could not reach the server.</p>
              <p class="text-gray-400 text-sm mb-3">The recording server may be offline or your connection was interrupted. Save your recording to your device so you don't lose it — you can upload it later.</p>
              <div class="flex gap-3">
                <button @click="saveToDevice" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-lg transition min-h-[44px]">
                  💾 Save to Device
                </button>
                <button @click="uploadRecording" class="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-5 rounded-lg transition min-h-[44px]">
                  🔄 Retry Upload
                </button>
              </div>
            </div>

            <!-- Saved to Device Confirmation -->
            <div v-if="savedToDevice" class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 mb-4">
              <p class="text-blue-300 font-semibold">💾 Recording saved to your Downloads folder!</p>
              <p class="text-gray-400 text-sm mt-1">You can upload it later using the "Upload Pre-Recorded {{ activeRecordingMode === 'audio' ? 'Audio' : 'Video' }}" tab above.</p>
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
                v-if="!uploading && !uploadedFile && !uploadFailed"
                @click="saveToDevice"
                class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]">
                💾 Save to Device
              </button>
              <button
                v-if="!uploading && !uploadedFile && !uploadFailed"
                @click="uploadRecording"
                :disabled="diskSpaceBlocked"
                class="flex-1 font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]"
                :class="diskSpaceBlocked ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'">
                {{ diskSpaceBlocked ? '⛔ No Disk Space' : '📤 Upload Recording' }}
              </button>
            </div>
          </div>

          <!-- Upload Mode UI -->
          <div v-if="uploadMode === 'upload'" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-6">{{ activeRecordingMode === 'audio' ? '📁 Upload Audio File' : '📁 Upload Pre-Recorded Video' }}</h2>

            <!-- Accepted Formats Info -->
            <div class="bg-blue-900 border-l-4 border-blue-400 rounded-lg p-4 mb-6">
              <p v-if="activeRecordingMode === 'audio'" class="text-blue-300 text-sm">
                <strong>Accepted formats:</strong> MP3, WAV, OGG, WebM, FLAC, and other common audio formats<br>
                <strong>Maximum file size:</strong> 5GB
              </p>
              <p v-else class="text-blue-300 text-sm">
                <strong>Accepted formats:</strong> MP4, MOV, WebM, AVI, and other common video formats<br>
                <strong>Maximum file size:</strong> 5GB
              </p>
            </div>

            <!-- Saved Recording Hint -->
            <div v-if="pendingSavedRecordings.length > 0 && !selectedUploadFile" class="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-4 mb-6">
              <p class="text-yellow-300 font-semibold mb-2">💾 Looking for your saved recording?</p>
              <p class="text-gray-300 text-sm mb-2">Check your <strong>Downloads</strong> folder for {{ pendingSavedRecordings.length > 1 ? 'these files' : 'this file' }}:</p>
              <ul class="space-y-1 mb-2">
                <li v-for="(rec, i) in pendingSavedRecordings" :key="i" class="text-sm font-mono bg-gray-800/60 rounded px-3 py-1.5 text-yellow-200 break-all">
                  {{ rec.filename }}
                </li>
              </ul>
              <p class="text-gray-500 text-xs">Saved recordings are .webm files starting with <strong>vs-recording__</strong></p>
            </div>

            <!-- File Selection Area -->
            <div v-if="!selectedUploadFile" class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-6 hover:border-yellow-400 hover:bg-gray-700/50 transition">
              <div class="mb-4">
                <p class="text-4xl mb-2">{{ activeRecordingMode === 'audio' ? '🎵' : '📹' }}</p>
                <p class="text-gray-300 font-semibold mb-2">Select {{ activeRecordingMode === 'audio' ? 'an audio' : 'a video' }} file to upload</p>
                <p class="text-gray-400 text-sm mb-4">Click below to browse your computer</p>
              </div>
              <input
                type="file"
                :accept="activeRecordingMode === 'audio' ? 'audio/*,.webm' : 'video/*'"
                @change="selectUploadFile"
                class="hidden"
                ref="fileInput"
                id="uploadFileInput">
              <label
                for="uploadFileInput"
                class="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-lg cursor-pointer transition duration-200 inline-block min-h-[44px]">
                {{ activeRecordingMode === 'audio' ? 'Choose Audio File' : 'Choose Video File' }}
              </label>
            </div>

            <!-- Upload Error -->
            <div v-if="uploadFileError" class="bg-red-900 border-l-4 border-red-400 rounded-lg p-4 mb-6">
              <p class="text-red-300 text-sm">{{ uploadFileError }}</p>
            </div>

            <!-- Upload Complete (shown outside selectedUploadFile block so it persists) -->
            <div v-if="uploadedFile && uploadMode === 'upload'" class="bg-green-900/40 border border-green-500/50 rounded-lg p-6 mb-6 text-center">
              <p class="text-5xl mb-3">&#x2705;</p>
              <p class="text-green-300 font-bold text-xl mb-2">Upload Complete — Thank You!</p>
              <p class="text-green-200">Your recording has been received. We appreciate you taking the time to share your story.</p>
            </div>

            <!-- Selected File Preview -->
            <div v-if="selectedUploadFile && !uploadedFile" class="space-y-4 mb-6">
              <!-- File Info -->
              <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-white font-semibold">{{ selectedUploadFile.name }}</p>
                    <p class="text-gray-400 text-sm">{{ (selectedUploadFile.size / (1024 * 1024)).toFixed(2) }} MB</p>
                  </div>
                  <button
                    v-if="!uploading"
                    @click="clearUploadFile"
                    class="text-gray-400 hover:text-red-400 transition">
                    ✕
                  </button>
                </div>
              </div>

              <!-- Video Preview -->
              <div v-if="uploadFilePreviewUrl && activeRecordingMode === 'video'" class="rounded-lg overflow-hidden border-2 border-gray-700">
                <video
                  :src="uploadFilePreviewUrl"
                  controls
                  class="w-full bg-black"
                  style="max-height: 400px; object-fit: contain;">
                </video>
              </div>

              <!-- Audio Preview -->
              <div v-if="uploadFilePreviewUrl && activeRecordingMode === 'audio'" class="bg-gray-900 rounded-lg border-2 border-gray-700 p-6">
                <audio :src="uploadFilePreviewUrl" controls class="w-full"></audio>
              </div>

              <!-- Upload Status -->
              <div v-if="uploading" class="space-y-3">
                <p class="text-gray-300 font-semibold">{{ uploadingStatus }}</p>
                <div class="w-full bg-gray-700 rounded-full h-3">
                  <div class="bg-yellow-400 h-3 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  v-if="!uploadedFile"
                  @click="clearUploadFile"
                  :disabled="uploading"
                  class="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]">
                  🔄 Select Different File
                </button>
                <button
                  v-if="!uploading && !uploadedFile"
                  @click="uploadSelectedFile"
                  :disabled="diskSpaceBlocked"
                  class="flex-1 font-bold py-3 px-6 rounded-lg transition duration-200 min-h-[44px]"
                  :class="diskSpaceBlocked ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'">
                  {{ diskSpaceBlocked ? '⛔ No Disk Space' : '📤 Upload ' + (activeRecordingMode === 'audio' ? 'Audio' : 'Video') }}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
};
