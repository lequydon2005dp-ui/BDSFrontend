import axiosClient from "../config/axiosClient";
import { getGuestId } from "../utils/guestId";

import recommendService from "./recommendService";

const favoriteService = {
    // POST /properties/{id}/like → Toggle Like
    toggleLike: async (roomId) => {
        // Luôn luôn gửi tracking cho AI học (hỗ trợ cả Guest)
        recommendService.trackBehavior(roomId, 'PROPERTY', 'LIKE').catch(e => console.warn(e));

        const userSessionId = sessionStorage.getItem('userSessionId');
        const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

        if (!token) {
            // Khách vãng lai -> Không có token, không gọi API thật để tránh lỗi 403
            return { data: 'Like thành công (Guest)' };
        }

        const res = await axiosClient.post(`/properties/${roomId}/like`);
        return res;
    },

    // POST /properties/{id}/save → Toggle Save
    toggleSave: async (roomId) => {
        // Luôn luôn gửi tracking cho AI học (hỗ trợ cả Guest)
        recommendService.trackBehavior(roomId, 'PROPERTY', 'SAVE').catch(e => console.warn(e));

        const userSessionId = sessionStorage.getItem('userSessionId');
        const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

        if (!token) {
            // Khách vãng lai -> Không có token, không gọi API thật để tránh lỗi 403
            return { data: 'lưu tin thành công (Guest)' };
        }

        const res = await axiosClient.post(`/properties/${roomId}/save`);
        return res;
    },

    // GET /properties/me/liked → Danh sách đã thích
    getMyLikedProperties: (page = 0, size = 10) => {
        return axiosClient.get('/properties/me/liked', {
            params: { page, size }
        });
    },

    // GET /properties/me/saved → Danh sách đã lưu
    getMySavedProperties: (page = 0, size = 10) => {
        return axiosClient.get('/properties/me/saved', {
            params: { page, size }
        });
    }
};

export default favoriteService;