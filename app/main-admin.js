import { createApp } from 'vue';
import App from './App.js';
import router from './router-admin.js';

const app = createApp(App);

app.use(router);

app.mount('#app');

console.log('Veterans Scene Admin Portal Initialized');
