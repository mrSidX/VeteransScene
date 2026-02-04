import { createApp } from 'vue';
import App from './App.js';
import router from './router-user.js';
import api from './services/api.js';

// Expose API service globally for components
window.api = api;

const app = createApp(App);

app.use(router);

app.mount('#app');

console.log('Veterans Scene User Portal Initialized');
