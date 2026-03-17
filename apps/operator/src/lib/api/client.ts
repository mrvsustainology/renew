import axios, { AxiosError } from "axios";

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Fail fast when offline — let each API's catch block handle Dexie fallback instantly
apiClient.interceptors.request.use(config => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        return Promise.reject(new Error("OFFLINE"));
    }

    // For FormData (multipart) requests, remove the default Content-Type so the
    // browser can set it automatically with the correct multipart boundary.
    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    const stored = localStorage.getItem("auth_session");
    if (stored) {
        try {
            const { token } = JSON.parse(stored);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // ignore
        }
    }
    return config;
});

// Handle 401 — token expired
apiClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Try refresh
            const stored = localStorage.getItem("auth_session");
            if (stored) {
                try {
                    const { refreshToken } = JSON.parse(stored);
                    const res = await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                        { refreshToken }
                    );
                    const data = res.data.data;
                    const newToken = data.accessToken;

                    // Update stored token
                    const parsed = JSON.parse(stored);
                    parsed.token = newToken;

                    // If server signalled deactivation grace period, store it
                    if (data.deactivated) {
                        parsed.deactivated = true;
                        parsed.deactivatedAt = data.deactivatedAt;
                        parsed.remainingHours = data.remainingHours;
                    }

                    localStorage.setItem("auth_session", JSON.stringify(parsed));

                    // Retry original request
                    if (error.config) {
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        return axios(error.config);
                    }
                } catch {
                    // Refresh failed — clear auth
                    localStorage.removeItem("auth_session");
                    window.location.href = "/login";
                }
            }
        }
        // For all other errors, surface the server's message if available
        const serverMessage =
            (error.response?.data as { message?: string })?.message;
        return Promise.reject(
            serverMessage ? new Error(serverMessage) : error
        );
    }
);