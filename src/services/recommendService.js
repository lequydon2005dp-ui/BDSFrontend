import axiosClient from '../config/axiosClient';

const recommendService = {
  // --- Tracking Behaviors ---
  trackBehavior: async (itemId, itemType, action, metadata = {}) => {
    // Lấy userId từ session nếu đã đăng nhập, ngược lại dùng guestId
    let finalUserId = null;
    const userSessionId = sessionStorage.getItem('userSessionId');
    if (userSessionId) {
      finalUserId = sessionStorage.getItem(`${userSessionId}_userId`);
    }
    if (!finalUserId) {
      finalUserId = localStorage.getItem('guestId');
      if (!finalUserId || isNaN(finalUserId)) {
         finalUserId = Date.now().toString();
         localStorage.setItem('guestId', finalUserId);
      }
    }

    return axiosClient.post('/recommend/track', {
      itemId,
      itemType,
      action,
      userId: finalUserId,
      duration: metadata.duration || 1.0,
      watchTime: metadata.watchTime || 0.0,
      price: metadata.price || 0.0,
      userBudget: metadata.userBudget || 0.0,
      locationMatch: metadata.locationMatch || 0,
      categoryMatch: metadata.categoryMatch || 0,
      district: metadata.district || ""
    });
  },

  trackSearch: async (data) => {
    let finalUserId = null;
    const userSessionId = sessionStorage.getItem('userSessionId');
    if (userSessionId) {
      finalUserId = sessionStorage.getItem(`${userSessionId}_userId`);
    }
    if (!finalUserId) {
      finalUserId = localStorage.getItem('guestId');
      if (!finalUserId || isNaN(finalUserId)) {
         finalUserId = Date.now().toString();
         localStorage.setItem('guestId', finalUserId);
      }
    }
    return axiosClient.post('/recommend/search/track', {
      userId: finalUserId,
      keyword: data.keyword || "",
      district: data.district || "",
      minPrice: data.minPrice || 0,
      maxPrice: data.maxPrice || 0
    });
  },

  getSearchSuggestions: async (keyword) => {
    return axiosClient.get('/recommend/search/suggest', { params: { keyword } });
  },

  getTopSearches: async () => {
    return axiosClient.get('/recommend/search/top');
  },

  // --- Feeds ---
  getFinalPropertiesFeed: async (userId, page = 0, size = 10, propertyType) => {
    const params = { page, size };
    if (propertyType && propertyType !== 'ALL') {
      params.propertyType = propertyType;
    }
    return axiosClient.get(`/recommend/users/${userId}/properties/final`, {
      params
    });
  },

  getFinalReelsFeed: async (userId, page = 0, size = 10) => {
    return axiosClient.get(`/recommend/users/${userId}/reels/final`, {
      params: { page, size }
    });
  },

  // --- Admin/Analytics ---
  getDashboard: async () => {
    return axiosClient.get('/recommend/analytics/dashboard');
  },

  getTrendingProperties: async (limit = 10) => {
    return axiosClient.get('/recommend/analytics/trending/properties', { params: { limit } });
  },

  getTrendingReels: async (limit = 10) => {
    return axiosClient.get('/recommend/analytics/trending/reels', { params: { limit } });
  },

  getRankingConfig: async () => {
    return axiosClient.get('/recommend/admin/ranking-config');
  },

  updateRankingConfig: async (config) => {
    return axiosClient.put('/recommend/admin/ranking-config', config);
  },

  // --- User Profiles ---
  getInterestProfile: async (userId) => {
    return axiosClient.get(`/recommend/users/${userId}/interest-profile`);
  },

  checkFraudStatus: async (userId) => {
    return axiosClient.get(`/recommend/users/${userId}/fraud-status`);
  }
};

export default recommendService;
