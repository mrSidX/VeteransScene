import { createApp } from 'vue';
import App from './App.js';
import router from './router-user.js?v=20260409b';
import api from './services/api.js?v=20260211';

// Expose API service globally for components
window.api = api;

const app = createApp(App);

// Register API service as a Vue plugin so components can use this.$api
app.config.globalProperties.$api = api;

app.use(router);

app.mount('#app');

console.log('Veterans Scene User Portal Initialized');
