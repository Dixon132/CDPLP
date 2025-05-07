import axios from 'axios';

export function configureAxiosGlobal() {
    axios.interceptors.request.use(
        config => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = token;
            }
            return config;
        },
        error => Promise.reject(error)
    );
}