import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn token
axiosClient.interceptors.request.use((config) => {
  // 1. Ưu tiên Admin session
  const adminSessionId = sessionStorage.getItem('adminSessionId');
  let token = null;

  if (adminSessionId) {
    token = sessionStorage.getItem(`${adminSessionId}_accessToken`);
  }

  // 2. Fallback về User session
  if (!token) {
    const userSessionId = sessionStorage.getItem('userSessionId');
    if (userSessionId) {
      token = sessionStorage.getItem(`${userSessionId}_accessToken`);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Xử lý X-Guest-Id cho khách vãng lai khi CHƯA đăng nhập
    let guestId = localStorage.getItem('guestId');
    if (!guestId || isNaN(guestId)) {
      // Sử dụng ID dạng số nguyên lớn (Date.now()) để tránh lỗi 400 Bad Request khi backend expect Long
      guestId = Date.now().toString();
      localStorage.setItem('guestId', guestId);
    }
    config.headers['X-Guest-Id'] = guestId;
  }

  return config;
});

// Bắt lỗi 401 tự động để Refresh Token
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Chỉ thực hiện refresh token khi có lỗi 401 (Hết hạn) và chưa retry bao giờ
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const userSessionId = sessionStorage.getItem('userSessionId');
        const adminSessionId = sessionStorage.getItem('adminSessionId');
        
        let oldToken = adminSessionId 
          ? sessionStorage.getItem(`${adminSessionId}_accessToken`) 
          : sessionStorage.getItem(`${userSessionId}_accessToken`);

        if (!oldToken) throw new Error("Không có token để làm mới");

        // GỌI TRỰC TIẾP AXIOS ĐỂ TRÁNH CIRCULAR DEPENDENCY VỚI authService
        const res = await axios.post('/auth/refresh', null, {
          headers: {
            Authorization: `Bearer ${oldToken}`
          }
        });
        
        const newToken = res.data.result.token;

        // Lưu đè Token mới
        if (adminSessionId) {
            sessionStorage.setItem(`${adminSessionId}_accessToken`, newToken);
        } else if (userSessionId) {
            sessionStorage.setItem(`${userSessionId}_accessToken`, newToken);
        }

        // Cập nhật Token mới vào request bị lỗi và gửi lại
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);

      } catch (refreshError) {
        console.error("Làm mới token thất bại, vui lòng đăng nhập lại!", refreshError);
        // Có thể bổ sung logic dọn dẹp sessionStorage và redirect về /login ở đây
        // sessionStorage.clear();
        // window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
