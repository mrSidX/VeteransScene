# Unsaved Changes Detection - Implementation Guide

## Completed Implementation

### ✅ Profile.js - FULLY IMPLEMENTED
- Tracks changes to profile form
- Shows prompt on page leave/refresh
- Shows prompt on in-app navigation
- Resets after successful save

### ✅ SegmentDetail.js - FULLY IMPLEMENTED
- Tracks changes to segment form
- Shows prompt on page leave/refresh
- Shows prompt on in-app navigation
- Resets after successful save

---

## Implementation Pattern for Remaining Pages

All remaining pages follow the same pattern. Here's what needs to be added to each:

### For Traditional Vue Components (data() + methods):

#### 1. Add to data():
```javascript
data() {
  return {
    // ... existing data ...
    // Unsaved changes tracking
    hasChanges: false,
    originalData: null,  // or originalForm, originalSegment, etc.
    navigationBlocked: false
  };
}
```

#### 2. Add to methods:
```javascript
handleBeforeUnload(e) {
  if (this.hasChanges && !this.navigationBlocked) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
},

setupUnsavedChangesDetection() {
  window.addEventListener('beforeunload', this.handleBeforeUnload);
},

setupRouterGuard() {
  const self = this;
  this.$router.beforeEach((to, from, next) => {
    if (self.hasChanges && from.path !== to.path) {
      const noPromptRoutes = ['/login', '/logout', '/'];
      if (noPromptRoutes.includes(to.path)) {
        self.navigationBlocked = true;
        next();
        return;
      }

      const proceed = confirm(
        'You have unsaved changes. Do you want to leave without saving?\n\nClick OK to discard changes, or Cancel to stay on this page.'
      );

      if (proceed) {
        self.navigationBlocked = true;
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  });
}
```

#### 3. Add to watch (or created if no watch exists):
```javascript
watch: {
  formData: {  // or whatever object contains the editable data
    handler() {
      if (this.originalData) {
        this.hasChanges = JSON.stringify(this.formData) !== JSON.stringify(this.originalData);
      }
    },
    deep: true
  }
},
```

#### 4. Update lifecycle hooks:
```javascript
mounted() {
  // ... existing code ...
  this.setupUnsavedChangesDetection();
  this.setupRouterGuard();
  // Save original data when loading
  this.loadData(); // or whatever loads the data
},

beforeUnmount() {
  window.removeEventListener('beforeunload', this.handleBeforeUnload);
}
```

#### 5. In data load method (e.g., loadUser, loadSegment):
```javascript
async loadData() {
  try {
    // ... existing load logic ...
    if (response.success) {
      this.data = response.data;
      this.form = { /* populate form from data */ };

      // Save original for change detection
      this.originalData = JSON.parse(JSON.stringify(this.form));
      this.hasChanges = false;
    }
  } catch (err) { /* ... */ }
}
```

#### 6. In update/save method:
```javascript
async updateData() {
  try {
    // ... existing save logic ...
    const response = await api.updateData(this.form);
    if (response.success) {
      // ... existing success logic ...

      // Reset unsaved changes tracking
      this.originalData = JSON.parse(JSON.stringify(this.form));
      this.hasChanges = false;
      this.navigationBlocked = false;
    }
  } catch (err) { /* ... */ }
}
```

---

## Pages Still Needing Implementation

### 1. Users.js
- Track: createForm, editForm objects
- Data load: In fetchUsers/getUser methods
- Save: In createUser, updateUser methods
- Page name: "user"

### 2. HighlightDetail.js
- Track: form/formData object
- Data load: In loadHighlight method
- Save: In saveChanges method
- Page name: "highlight"

### 3. FlagDetail.js
- Track: form/data that changes
- Data load: In loadFlag method
- Save: In any update methods
- Page name: "flag"

### 4. HelpTopics.js
- Track: form/data object
- Data load: In loadTopics method
- Save: In saveTopics method
- Page name: "help topic"

### 5. DropboxSettings.js
- Track: settings object
- Data load: In loadSettings method
- Save: In saveSettings method
- Page name: "Dropbox settings"

---

## Summary of Changes Needed Per File

For each of the 5 remaining files, you need to:

1. **Add 3 data properties** (hasChanges, originalData, navigationBlocked)
2. **Add 3 methods** (handleBeforeUnload, setupUnsavedChangesDetection, setupRouterGuard)
3. **Add watch** for the main data object (deep: true)
4. **Update lifecycle hooks** (mounted, add beforeUnmount)
5. **Update data loading** to save original state
6. **Update save methods** to reset the tracking

This is a straightforward copy-paste pattern that ensures consistent behavior across all editable pages.
