import axios from "axios";

class Api {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "/api",
      timeout: 100000000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token && !config.url.includes("/auth/login")) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if ([401, 403].includes(error?.response?.status)) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username, password) {
    const res = await this.axiosInstance.post("/auth/login", {
      username,
      password,
    });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    return res.data;
  }

  async logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  async getMenus() {
    const res = await this.axiosInstance.get("/auth/menus");
    return res.data;
  }

  async getCaseDetails(params) {
    const res = await this.axiosInstance.get("/case-details", { params });
    return res.data;
  }

  async getPartyDetails(params) {
    const res = await this.axiosInstance.get("/party-details", { params });
    return res.data;
  }

  async getDiaryDetails(params) {
    const res = await this.axiosInstance.get("/diary-basic-details", {
      params,
    });
    return res.data;
  }

  async saveFileMovements(payload) {
    const res = await this.axiosInstance.post("/file-movement/save", payload);
    return res.data;
  }

  async getUserFiles() {
    const res = await this.axiosInstance.get("/file-movement/user-files");
    return res.data;
  }

  async getUserFiles() {
    const res = await this.axiosInstance.get("/file-movement/user-files");
    return res.data;
  }
  async getMyFiles(params) {
    const res = await this.axiosInstance.get("/file-movement/myfiles");
    return res.data;
  }
}

export default new Api();
