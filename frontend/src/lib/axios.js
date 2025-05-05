import axios from 'axios';

export const axiosInstance = axios.create({
    baseURL:
    import.meta.env.MODE === "development"
      ? /*`http://${window.location.hostname}:3000/api`*/
        `http://localhost:3000/api`
      : "/api",
  withCredentials: true, // Ensures cookies are sent with requests
});