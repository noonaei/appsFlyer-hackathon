<<<<<<< Updated upstream
import axios from 'axios';

const baseURL = (import.meta.env.VITE_SERVER_API_URL || 'http://localhost:5000/').replace(/\/+$/, '');

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120_000,
});

let accessToken = null;

function setAccessToken(token) {
  accessToken = token;
}

axiosInstance.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function request(method, url, data, config = {}) {
  const res = await axiosInstance.request({ method, url, data, ...config });
  return res.data;
}

const api = {
  setAccessToken,

  parents: {
    login: ({ email, password }) => request('POST', '/api/parents/login', { email, password }),
    signup: ({ name, email, password }) => request('POST', '/api/parents/signup', { name, email, password }),
    update: ({ name }) => request('PUT', '/api/parents/update', { name }),
    delete: () => request('DELETE', '/api/parents/delete'),
  },

  devices: {
    list: () => request('GET', '/api/devices'),
    create: ({ name, age }) => request('POST', '/api/devices/create', { name, age }),
    update: ({ deviceId, name, age }) => request('PUT', `/api/devices/${deviceId}`, { name, age }),
    remove: ({ deviceId }) => request('DELETE', `/api/devices/${deviceId}`),
    validateToken: ({ token }) => request('GET', `/api/devices/validate/${token}`),
  },

  signals: {
    today: ({ deviceId }) => request('GET', `/api/signals/today/${deviceId}`),
    last5days: ({ deviceId }) => request('GET', `/api/signals/5days/${deviceId}`),
    deleteRange: ({ deviceId, startDate, endDate }) =>
      request('DELETE', `/api/signals/delete/${deviceId}`, { startDate, endDate }),
  },

  ai: {
    summary: ({ history, ageGroup = '12-14', location = 'Israel' }) => {
      return request(
        'POST',
        '/api/ai/summary',
        { history, ageGroup, location }
      );
    },
    summaryWithPrompt: ({ history, ageGroup = '12-14', location = 'Israel', customPrompt }) => {
      return request(
        'POST',
        '/api/ai/summary',
        { history, ageGroup, location, customPrompt }
      );
    },
    popular: ({ age }) => request('GET', `/api/ai/popular/${age}`),
  },
};

export default api;
=======
import axios from 'axios';
const apiUrl = import.meta.env.VITE_SERVER_API_URL;

// Create an instance of Axios with default configurations
const axiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
>>>>>>> Stashed changes
