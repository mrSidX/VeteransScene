import { createApp } from 'vue';
import App from './App.js?v=20260124i';
import router from './router.js?v=20260124i';
import api from './services/api.js?v=20260124i';
import InfoHelper from './components/InfoHelper.js?v=20260202i';

// Expose API service globally for components
window.api = api;

const app = createApp(App);

app.use(router);

// Register InfoHelper component globally
app.component('InfoHelper', InfoHelper);

app.mount('#app');

console.log('Veterans Scene App Initialized');
