import { ref, computed } from 'vue';
import api from '../services/api.js';
import ImagePositionEditor from './ImagePositionEditor.js';

export default {
  name: 'HighlightMediaManager',
  components: {
    ImagePositionEditor
  },
  props: {
    highlightId: {
      type: String,
      required: true
    },
    profileImage: {
      type: Object,
      default: null
    },
    gallery: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const errorMessage = ref('');
    const successMessage = ref('');
    const showUrlInput = ref(false);
    const externalUrl = ref('');
    const urlAltText = ref('');
    const urlSource = ref('');
    const urlCaption = ref('');
    const galleryMetadata = ref([]);
    const showPositionEditor = ref(false);
    const editingImage = ref(null);

    const profileInputRef = ref(null);
    const galleryInputRef = ref(null);

    const maxGalleryImages = 20;

    const canAddMoreGallery = computed(() => {
      return props.gallery.length < maxGalleryImages;
    });

    const remainingGallerySlots = computed(() => {
      return maxGalleryImages - props.gallery.length;
    });

    const clearMessages = () => {
      errorMessage.value = '';
      successMessage.value = '';
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getImageUrl = (image) => {
      if (!image?.url) return '';

      // If storedLocally, construct API URL
      if (image.storedLocally && image.filename) {
        const type = image.caption ? 'gallery' : 'profile';
        return `${api.baseURL}/highlights/media/${props.highlightId}/${type}/${image.filename}`;
      }

      // External URL - use as-is
      return image.url;
    };

    const handleProfileDrop = (event) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length > 0) {
        uploadProfileImage(files[0]);
      }
    };

    const uploadProfileImage = async (file) => {
      try {
        clearMessages();

        if (!file) {
          errorMessage.value = 'No file selected';
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          errorMessage.value = 'Please select an image file';
          return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          errorMessage.value = `File exceeds maximum size of 10MB`;
          return;
        }

        uploading.value = true;
        uploadProgress.value = 0;

        const response = await api.uploadHighlightProfileImage(
          props.highlightId,
          file,
          {
            altText: 'Profile image',
            source: ''
          }
        );

        if (response.success) {
          successMessage.value = 'Profile image uploaded successfully';
          emit('update');
          setTimeout(() => clearMessages(), 3000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error uploading profile image';
      } finally {
        uploading.value = false;
        uploadProgress.value = 0;
        if (profileInputRef.value) {
          profileInputRef.value.value = '';
        }
      }
    };

    const handleGalleryDrop = (event) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      uploadGalleryImages(files);
    };

    const uploadGalleryImages = async (files) => {
      try {
        clearMessages();

        if (!files || files.length === 0) {
          errorMessage.value = 'No files selected';
          return;
        }

        // Check gallery limit
        if (props.gallery.length + files.length > maxGalleryImages) {
          errorMessage.value = `Would exceed maximum of ${maxGalleryImages} gallery images`;
          return;
        }

        // Validate files
        const validFiles = [];
        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            errorMessage.value = `"${file.name}" is not an image file`;
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            errorMessage.value = `"${file.name}" exceeds 10MB limit`;
            return;
          }
          validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        uploading.value = true;
        uploadProgress.value = 0;

        const response = await api.uploadHighlightGalleryImages(
          props.highlightId,
          validFiles,
          validFiles.map((_, i) => ({
            altText: '',
            caption: ''
          }))
        );

        if (response.success) {
          successMessage.value = `${validFiles.length} image(s) uploaded successfully`;
          emit('update');
          setTimeout(() => clearMessages(), 3000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error uploading gallery images';
      } finally {
        uploading.value = false;
        uploadProgress.value = 0;
        if (galleryInputRef.value) {
          galleryInputRef.value.value = '';
        }
      }
    };

    const addExternalUrl = async () => {
      try {
        clearMessages();

        if (!externalUrl.value) {
          errorMessage.value = 'Please enter an image URL';
          return;
        }

        // Validate URL
        try {
          new URL(externalUrl.value);
        } catch {
          errorMessage.value = 'Invalid URL format';
          return;
        }

        const imageData = {
          type: showUrlInput.value === 'profile' ? 'profile' : 'gallery',
          url: externalUrl.value,
          altText: urlAltText.value,
          source: urlSource.value
        };

        if (showUrlInput.value === 'gallery') {
          imageData.caption = urlCaption.value;
        }

        uploading.value = true;
        const response = await api.addHighlightExternalImage(props.highlightId, imageData);

        if (response.success) {
          successMessage.value = `${imageData.type === 'profile' ? 'Profile' : 'Gallery'} image added`;
          externalUrl.value = '';
          urlAltText.value = '';
          urlSource.value = '';
          urlCaption.value = '';
          showUrlInput.value = false;
          emit('update');
          setTimeout(() => clearMessages(), 3000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error adding external image';
      } finally {
        uploading.value = false;
      }
    };

    const deleteProfileImage = async () => {
      if (!confirm('Delete profile image?')) return;

      try {
        clearMessages();
        uploading.value = true;
        const response = await api.deleteHighlightImage(props.highlightId, 'profile');

        if (response.success) {
          successMessage.value = 'Profile image deleted';
          emit('update');
          setTimeout(() => clearMessages(), 3000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error deleting profile image';
      } finally {
        uploading.value = false;
      }
    };

    const deleteGalleryImage = async (index) => {
      if (!confirm('Delete this gallery image?')) return;

      try {
        clearMessages();
        uploading.value = true;
        const response = await api.deleteHighlightImage(props.highlightId, 'gallery', index);

        if (response.success) {
          successMessage.value = 'Gallery image deleted';
          emit('update');
          setTimeout(() => clearMessages(), 3000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error deleting gallery image';
      } finally {
        uploading.value = false;
      }
    };

    const updateImageMetadata = async (type, index, metadata) => {
      try {
        clearMessages();
        const response = await api.updateHighlightImageMetadata(
          props.highlightId,
          type,
          index,
          metadata
        );

        if (response.success) {
          successMessage.value = 'Image metadata updated';
          emit('update');
          setTimeout(() => clearMessages(), 2000);
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error updating metadata';
      }
    };

    const openPositionEditor = (type, url, positioning, galleryIndex = null) => {
      editingImage.value = {
        type,
        url,
        positioning: positioning || { offsetX: 0, offsetY: 0, zoom: 100 },
        galleryIndex
      };
      showPositionEditor.value = true;
    };

    const closePositionEditor = () => {
      showPositionEditor.value = false;
      editingImage.value = null;
    };

    const saveImagePosition = async (newPosition) => {
      try {
        clearMessages();
        const { type, galleryIndex } = editingImage.value;

        if (type === 'profile') {
          const payload = {
            altText: props.profileImage.altText,
            source: props.profileImage.source,
            positioning: newPosition
          };
          console.log('[HighlightMediaManager] Saving profile position:', payload);
          const response = await api.patch(
            `/highlights/${props.highlightId}/media/profile`,
            payload
          );
          console.log('[HighlightMediaManager] Profile save response:', response);
          if (response.success) {
            successMessage.value = 'Profile image position saved';
          }
        } else if (type === 'gallery') {
          const galleryImage = props.gallery[galleryIndex];
          const payload = {
            altText: galleryImage.altText,
            caption: galleryImage.caption,
            source: galleryImage.source,
            positioning: newPosition
          };
          console.log('[HighlightMediaManager] Saving gallery position:', payload);
          const response = await api.patch(
            `/highlights/${props.highlightId}/media/gallery/${galleryIndex}`,
            payload
          );
          console.log('[HighlightMediaManager] Gallery save response:', response);
          if (response.success) {
            successMessage.value = 'Gallery image position saved';
          }
        }

        closePositionEditor();
        emit('update');
        setTimeout(() => clearMessages(), 2000);
      } catch (error) {
        errorMessage.value = error.message || 'Error saving image position';
        console.error('[HighlightMediaManager] Save error:', error);
      }
    };

    return {
      uploading,
      uploadProgress,
      errorMessage,
      successMessage,
      showUrlInput,
      externalUrl,
      urlAltText,
      urlSource,
      urlCaption,
      profileInputRef,
      galleryInputRef,
      maxGalleryImages,
      canAddMoreGallery,
      remainingGallerySlots,
      formatFileSize,
      getImageUrl,
      handleProfileDrop,
      uploadProfileImage,
      handleGalleryDrop,
      uploadGalleryImages,
      addExternalUrl,
      deleteProfileImage,
      deleteGalleryImage,
      updateImageMetadata,
      showPositionEditor,
      editingImage,
      openPositionEditor,
      closePositionEditor,
      saveImagePosition
    };
  },
  template: `
    <div class="media-manager space-y-8">
      <!-- Messages -->
      <div v-if="errorMessage" class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <p class="text-red-300">⚠️ {{ errorMessage }}</p>
      </div>
      <div v-if="successMessage" class="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
        <p class="text-green-300">✓ {{ successMessage }}</p>
      </div>

      <!-- Profile Image Section -->
      <div class="profile-section border border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Profile Image</h3>

        <!-- Current image preview -->
        <div v-if="profileImage?.url" class="image-preview mb-6">
          <div class="relative inline-block">
            <img
              :src="getImageUrl(profileImage)"
              alt="Profile"
              class="w-48 h-64 object-cover rounded-lg shadow-lg"
              @error="$event.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E'"
            />
            <div v-if="profileImage.storedLocally" class="absolute top-2 right-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
              Uploaded
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div>
              <label class="text-sm text-gray-400">Image URL</label>
              <input
                v-model="profileImage.url"
                type="url"
                placeholder="https://example.com/image.jpg"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm font-mono text-xs"
                @blur="updateImageMetadata('profile', null, { url: profileImage.url })"
              />
            </div>
            <div>
              <label class="text-sm text-gray-400">Alt Text</label>
              <input
                v-model="profileImage.altText"
                type="text"
                placeholder="Describe the image for accessibility"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
                @blur="updateImageMetadata('profile', null, { altText: profileImage.altText })"
              />
            </div>
            <div>
              <label class="text-sm text-gray-400">Source/Attribution</label>
              <input
                v-model="profileImage.source"
                type="text"
                placeholder="Photo credit or source"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
                @blur="updateImageMetadata('profile', null, { source: profileImage.source })"
              />
            </div>
            <button
              @click="openPositionEditor('profile', getImageUrl(profileImage), profileImage.positioning)"
              class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition mt-2"
            >
              🖼️ Adjust Position
            </button>
            <button
              @click="deleteProfileImage"
              :disabled="uploading"
              class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm mt-2"
            >
              Delete Image
            </button>
          </div>
        </div>

        <!-- Upload area -->
        <div
          v-if="!profileImage?.url"
          @drop="handleProfileDrop"
          @dragover.prevent
          class="upload-area border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 hover:bg-gray-800/30 transition"
        >
          <input
            ref="profileInputRef"
            type="file"
            @change="e => uploadProfileImage(e.target.files[0])"
            accept="image/*"
            class="hidden"
          />
          <div @click="$refs.profileInputRef.click()" class="space-y-2">
            <p class="text-gray-300">📸 Drop image here or click to browse</p>
            <p class="text-sm text-gray-500">JPEG, PNG, or GIF (max 10MB)</p>
            <p class="text-xs text-gray-600">Recommended: 600×800px portrait</p>
          </div>
        </div>

        <!-- Or add URL -->
        <div v-if="!profileImage?.url" class="mt-6 pt-6 border-t border-gray-700">
          <button
            @click="showUrlInput = showUrlInput === 'profile' ? false : 'profile'"
            class="text-blue-400 hover:text-blue-300 text-sm mb-3"
          >
            + Or paste an image URL
          </button>
          <div v-if="showUrlInput === 'profile'" class="space-y-3 bg-gray-800/50 p-4 rounded">
            <input
              v-model="externalUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
            />
            <input
              v-model="urlAltText"
              type="text"
              placeholder="Alt text for accessibility"
              class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
            />
            <input
              v-model="urlSource"
              type="text"
              placeholder="Source/attribution"
              class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
            />
            <button
              @click="addExternalUrl"
              :disabled="uploading || !externalUrl"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
            >
              {{ uploading ? 'Adding...' : 'Add URL' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Gallery Section -->
      <div class="gallery-section border border-gray-700 rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-white">Gallery Images ({{ gallery.length }}/{{ maxGalleryImages }})</h3>
          <span v-if="!canAddMoreGallery" class="text-sm text-yellow-400">Gallery is full</span>
        </div>

        <!-- Gallery grid -->
        <div v-if="gallery.length > 0" class="gallery-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div
            v-for="(image, index) in gallery"
            :key="index"
            class="gallery-item border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50"
          >
            <!-- Image preview -->
            <div class="relative h-48 bg-gray-900 overflow-hidden">
              <img
                :src="getImageUrl(image)"
                :alt="'Gallery image ' + (index + 1)"
                class="w-full h-full object-cover"
                @error="$event.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E'"
              />
              <div v-if="image.storedLocally" class="absolute top-2 right-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
                Uploaded
              </div>
            </div>

            <!-- Metadata -->
            <div class="p-3 space-y-2">
              <input
                v-model="image.url"
                type="url"
                placeholder="Image URL"
                class="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-xs font-mono"
                @blur="updateImageMetadata('gallery', index, { url: image.url })"
              />
              <input
                v-model="image.altText"
                type="text"
                placeholder="Alt text"
                class="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-xs"
                @blur="updateImageMetadata('gallery', index, { altText: image.altText })"
              />
              <textarea
                v-model="image.caption"
                placeholder="Caption"
                class="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-xs h-12 resize-none"
                @blur="updateImageMetadata('gallery', index, { caption: image.caption })"
              />
              <div class="flex gap-2">
                <button
                  @click="openPositionEditor('gallery', getImageUrl(image), image.positioning, index)"
                  class="flex-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-xs"
                >
                  🖼️ Adjust
                </button>
                <button
                  @click="deleteGalleryImage(index)"
                  :disabled="uploading"
                  class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add more button -->
        <div v-if="canAddMoreGallery" class="add-button-area">
          <div
            @drop="handleGalleryDrop"
            @dragover.prevent
            class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 hover:bg-gray-800/30 transition"
          >
            <input
              ref="galleryInputRef"
              type="file"
              @change="e => uploadGalleryImages(Array.from(e.target.files || []))"
              multiple
              accept="image/*"
              class="hidden"
            />
            <div @click="$refs.galleryInputRef.click()" class="space-y-2">
              <p class="text-gray-300">📷 Drop images here or click to browse</p>
              <p class="text-sm text-gray-500">Add up to {{ remainingGallerySlots }} more image(s)</p>
              <p class="text-xs text-gray-600">JPEG, PNG, or GIF (max 10MB each)</p>
            </div>
          </div>

          <!-- Or add URL -->
          <div class="mt-4 pt-4 border-t border-gray-700">
            <button
              @click="showUrlInput = showUrlInput === 'gallery' ? false : 'gallery'"
              class="text-blue-400 hover:text-blue-300 text-sm mb-3"
            >
              + Or paste an image URL
            </button>
            <div v-if="showUrlInput === 'gallery'" class="space-y-3 bg-gray-800/50 p-4 rounded">
              <input
                v-model="externalUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              />
              <input
                v-model="urlAltText"
                type="text"
                placeholder="Alt text for accessibility"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              />
              <textarea
                v-model="urlCaption"
                placeholder="Caption - what this image shows"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm h-12 resize-none"
              />
              <input
                v-model="urlSource"
                type="text"
                placeholder="Source/attribution"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              />
              <button
                @click="addExternalUrl"
                :disabled="uploading || !externalUrl"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
              >
                {{ uploading ? 'Adding...' : 'Add URL' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Position Editor Modal -->
      <image-position-editor
        v-if="editingImage"
        :show="showPositionEditor"
        :imageUrl="editingImage.url"
        :imageType="editingImage.type"
        :currentPosition="editingImage.positioning"
        @save="saveImagePosition"
        @close="closePositionEditor"
      />
    </div>
  `
};
