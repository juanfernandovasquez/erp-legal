import axios from 'axios'

const portalApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portalToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('portalToken')
      window.location.href = '/portal/login'
    }
    return Promise.reject(error)
  }
)

export default portalApi
