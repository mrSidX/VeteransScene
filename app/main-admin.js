import { createApp } from 'vue';
import App from './App.js?v=20260330';
import router from './router-admin.js?v=20260410';
import api from './services/api.js?v=20260211';
import InfoHelper from './components/InfoHelper.js?v=20260211';

// Expose API service globally for components
window.api = api;

const app = createApp(App);

// Register API service as a Vue plugin so components can use this.$api
app.config.globalProperties.$api = api;

app.use(router);

// Register InfoHelper component globally
app.component('InfoHelper', InfoHelper);

app.mount('#app');

console.log('Veterans Scene Admin Portal Initialized');
