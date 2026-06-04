import axiosClient from "../config/axiosClient"; 

const searchHistoryService = {
    // 1. Lấy danh sách lịch sử
    getMyHistory: () => {
        return axiosClient.get('/search-history'); 
    },

    // 2. Xóa 1 dòng lịch sử
    deleteHistory: (id) => {
        return axiosClient.delete(`/search-history/${id}`);
    },

    // 3. Xóa tất cả
    clearAllHistory: () => {
        return axiosClient.delete('/search-history/all');
    }
};

export default searchHistoryService;