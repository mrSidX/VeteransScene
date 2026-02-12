# Unsaved Changes Detection - Quick Implementation Steps

## Status: Profile.js and SegmentDetail.js COMPLETE ✅

## Remaining Pages (Quick Implementation)

### For Each Page Below:

Copy-paste the following into the respective files:

---

## Users.js (Composition API - setup())

**After line 19 (deactivateAction ref):**
```javascript
// Unsaved changes tracking
const hasChanges = ref(false);
const originalEditForm = ref(null);
const navigationBlocked = ref(false);
```

**Before onMounted, add these methods:**
```javascript
const handleBeforeUnload = (e) => {
  if ((hasChanges.value || showEditModal.value) && !navigationBlocked.value) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
};

const setupUnsavedChangesDetection = () => {
  window.addEventListener('beforeunload', handleBeforeUnload);
};

const setupRouterGuard = () => {
  return router.beforeEach((to, from, next) => {
    if (hasChanges.value && from.path !== to.path) {
      const proceed = confirm('You have unsaved changes. Do you want to leave without saving?');
      if (proceed) {
        navigationBlocked.value = true;
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  });
};

// Watch for form changes
watch(() => editForm.value, () => {
  if (originalEditForm.value && showEditModal.value) {
    hasChanges.value = JSON.stringify(editForm.value) !== JSON.stringify(originalEditForm.value);
  }
}, { deep: true });
```

**Update onMounted:**
```javascript
onMounted(() => {
  fetchUsers();
  setupUnsavedChangesDetection();
  setupRouterGuard();
});
```

**Add after onMounted:**
```javascript
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
```

**In openEditModal function, after loading user:**
```javascript
originalEditForm.value = JSON.parse(JSON.stringify(editForm.value));
hasChanges.value = false;
```

**In updateUser function, after successful update:**
```javascript
originalEditForm.value = JSON.parse(JSON.stringify(editForm.value));
hasChanges.value = false;
navigationBlocked.value = false;
```

**Add to return statement:**
```javascript
hasChanges,
originalEditForm,
navigationBlocked,
handleBeforeUnload,
setupUnsavedChangesDetection,
setupRouterGuard
```

---

## HighlightDetail.js

Follow the same pattern as Users.js but watch `editingHighlight` or main form object

---

## FlagDetail.js

Follow the same pattern, watch the form/flag data being edited

---

## HelpTopics.js

Follow the same pattern, watch the topic form being edited

---

## DropboxSettings.js

Follow the same pattern, watch the settings object

---

## Implementation Time Estimate

- **Users.js**: 5-10 minutes
- **HighlightDetail.js**: 5-10 minutes
- **FlagDetail.js**: 5-10 minutes
- **HelpTopics.js**: 3-5 minutes
- **DropboxSettings.js**: 3-5 minutes

**Total: ~25-50 minutes** for all remaining pages using the copy-paste template above

The pattern is identical for all - just adjust the object names (editForm, editingHighlight, topic data, etc.) based on what each page uses.
