import React, { useEffect, useState } from 'react';
import axios from 'axios'; // ✅ THÊM AXIOS
import { getImageUrl } from '../../utils/imageHelper';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Avatar, Button, Card, Col, Row, Tag, Typography,
  Spin, Statistic, Empty, Rate, Breadcrumb, Tooltip, message,
  Pagination
} from 'antd';
import {
  UserOutlined, PhoneOutlined,
  EnvironmentOutlined, ClockCircleOutlined, HeartOutlined,
  SafetyCertificateFilled, HomeOutlined, CheckCircleFilled,
  CameraFilled, IdcardFilled, CrownFilled, FireFilled
} from '@ant-design/icons';
import { Select } from 'antd';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import userService from '../../services/userService';
import roomService from '../../services/roomService';
import { formatCurrency } from '../../utils/format';
import useAuth from '../../hooks/useAuth'; // ✅ THÊM USE AUTH
import chatService from '../../services/chatService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const LandlordProfile = () => {
  const { user: currentUser } = useAuth(); // ✅ LẤY USER HIỆN TẠI
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState('newest');

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'FOR_RENT', 'FOR_SALE'
  const pageSize = 8;

  // 1. Tải Profile và Banner công khai khi slug thay đổi
  useEffect(() => {
    const fetchProfileAndBanner = async () => {
      setLoading(true);
      try {
        // Lấy profile bằng slug
        const profileRes = await userService.getLandlordPublicProfile(slug);
        const profileData = profileRes.data?.result || profileRes.data;
        setProfile(profileData);

        // Lấy banner công khai từ API mới
        try {
          const bannerRes = await userService.getLandlordPublicBanner(slug);
          const bannerData = bannerRes.data?.result || bannerRes.data;
          setBannerUrl(bannerData?.bannerUrl || null);
        } catch (bannerErr) {
          console.warn("Lỗi tải banner, dùng banner mặc định:", bannerErr);
          setBannerUrl(null);
        }
      } catch (error) {
        console.error("Lỗi tải profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProfileAndBanner();
      setCurrentPage(1);
      setActiveTab('ALL');
    }
  }, [slug]);

  // 2. Tải danh sách bài viết (rooms) phân trang khi profile, currentPage hoặc activeTab thay đổi
  useEffect(() => {
    const fetchOwnerRooms = async () => {
      const ownerId = profile?.id || profile?.publicId;
      if (!ownerId) return;

      try {
        const pageParam = currentPage - 1;
        const transactionTypeParam = activeTab === 'ALL' ? null : activeTab;
        
        const resRooms = await roomService.getRoomsByLandlord(ownerId, pageParam, pageSize, transactionTypeParam);
        
        // Trích xuất dữ liệu cực kỳ linh hoạt
        const resData = resRooms.data;
        const resultObj = resData?.result || resData?.data || resData;
        
        let contentArray = [];
        let totalElements = 0;
        
        if (Array.isArray(resultObj)) {
          contentArray = resultObj;
          totalElements = resultObj.length;
        } else if (resultObj) {
          contentArray = resultObj.content || [];
          totalElements = resultObj.totalElements ?? contentArray.length;
        }
        
        setRooms(contentArray);
        setTotalRooms(totalElements);
      } catch (error) {
        console.error("Lỗi tải bài viết:", error);
      }
    };

    fetchOwnerRooms();
  }, [profile, currentPage, activeTab]);

  // Reset trang về 1 khi người dùng đổi tab lọc hoặc đổi sắp xếp
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortType]);
  // --- HÀM XỬ LÝ NHẮN TIN ---
  const handleStartChat = async () => {
    // 1. Kiểm tra đăng nhập
    if (!currentUser) {
      message.warning("Vui lòng đăng nhập để nhắn tin!");
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // 2. Kiểm tra có phải chính mình không
    if (currentUser.id === profile?.id) {
      message.info("Đây là trang cá nhân của bạn.");
      return;
    }

    // 3. Gửi tin nhắn text (không phải property card)
    try {
      message.loading({ content: "Đang kết nối...", key: 'chat_loading' });

      // Tạo hội thoại
      await chatService.startConversation(profile.id);

      // ✅ GỬI TEXT THƯỜNG - THAY ĐỔI DÒNG NÀY
      await chatService.sendMessage(profile.id, "Xin chào! Tôi muốn liên hệ với bạn.", 'TEXT');

      message.success({ content: "Đã kết nối!", key: 'chat_loading' });

      // 4. Chuyển sang Messages
      navigate('/messages', { state: { openPartnerId: profile.id } });
    } catch (error) {
      console.error(error);
      message.error({ content: "Lỗi kết nối server chat.", key: 'chat_loading' });
    }
  };

  const getLastActiveText = (dateString) => {
    if (!dateString) return "Chưa hoạt động";
    const lastActive = dayjs(dateString);
    const diffMins = dayjs().diff(lastActive, 'minute');

    if (diffMins < 5) return <span className="text-green-600 font-bold">● Đang hoạt động</span>;
    if (diffMins < 60) return `Online ${diffMins} phút trước`;
    return `Online ${lastActive.fromNow()}`;
  };

  const isRented = (room) => {
    if (room.status === 'FULL') return true;
    if (room.rentalType === 'WHOLE' && (room.currentTenants > 0)) return true;
    return false;
  };

  const getSortedRooms = () => {
    let sorted = [...rooms];

    if (sortType === 'newest') {
      // 🟢 LOGIC MỚI: Ưu tiên VIP (Priority cao) -> Sau đó mới đến Ngày tạo
      sorted.sort((a, b) => {
        const priorityA = a.priorityLevel || 0;
        const priorityB = b.priorityLevel || 0;

        // Nếu khác độ ưu tiên, đưa VIP lên trước
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        // Nếu cùng độ ưu tiên, tin mới hơn lên trước
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    } else if (sortType === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortType === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    }
    return sorted;
  };

  if (loading) return <div className="flex h-screen justify-center items-center"><Spin size="large" /></div>;
  if (!profile) return <div className="text-center mt-10">Không tìm thấy người dùng</div>;

  const isOwnProfile = currentUser?.id === profile?.id;
  const isVerified = profile.isIdentityVerified === true || profile.identityVerified === true;
  const isOnline = dayjs().diff(dayjs(profile.lastActiveAt), 'minute') < 5;

  return (
    <div className="bg-[#f0f2f5] min-h-screen pb-10 font-sans">

      {/* 1. BREADCRUMB */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/"><HomeOutlined /> Trang chủ</Link> },
            { title: <Link to="/search">Tìm phòng</Link> },
            { title: <span className="text-gray-800 font-medium">Hồ sơ: {profile.fullName}</span> },
          ]}
        />
      </div>

      {/* 2. HEADER PROFILE */}
      <div className="max-w-6xl mx-auto px-4 mt-2">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">

          {/* BANNER */}
          <div
            className="h-[250px] w-full bg-cover bg-center relative"
            style={{
              backgroundImage: `url('${bannerUrl || profile.bannerUrl || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"}')`
            }}
          >
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* INFO USER */}
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 mb-4 gap-6">

              <div className="relative z-10 group cursor-pointer">
                <Avatar
                  size={140}
                  src={profile.avatarUrl}
                  icon={<UserOutlined />}
                  className="border-[5px] border-white shadow-md bg-white object-cover"
                />

                {isVerified && (
                  <Tooltip title="Tài khoản đã xác minh (eKYC)">
                    <div className="absolute bottom-2 right-2 z-30 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                      <CheckCircleFilled className="text-blue-500 text-3xl border-2 border-white rounded-full bg-white" />
                    </div>
                  </Tooltip>
                )}

                {isOnline && (
                  <Tooltip title="Đang hoạt động">
                    <div
                      className={`absolute bottom-2 ${isVerified ? 'right-12' : 'right-4'} bg-green-500 border-4 border-white w-6 h-6 rounded-full z-20`}
                    ></div>
                  </Tooltip>
                )}
              </div>

              <div className="flex-grow text-center md:text-left mb-2 md:mb-0">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Title level={2} style={{ margin: 0, color: '#333' }}>
                    {profile.fullName}
                  </Title>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2 mt-1 mb-2">
                  {isVerified && (
                    <Tag color="success" icon={<IdcardFilled />}>Đã xác minh</Tag>
                  )}
                  {profile.successfulDeals >= 5 && (
                    <Tag color="gold" icon={<CheckCircleFilled />}>Chủ trọ uy tín</Tag>
                  )}
                </div>

                <div className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-1 text-sm">
                  <ClockCircleOutlined /> {getLastActiveText(profile.lastActiveAt)}
                  <span className="mx-1">|</span>
                  <span>Tham gia: {dayjs(profile.joinDate).format('DD/MM/YYYY')}</span>
                </div>
              </div>

              <div className="flex gap-3 mb-4 md:mb-0">
                {/* ✅ ẨN NÚT NHẮN TIN NẾU LÀ CHÍNH MÌNH */}
                {!isOwnProfile && (
                  <Button size="large" className="rounded-full border-gray-300" onClick={handleStartChat}>
                    Nhắn tin
                  </Button>
                )}
                {/* ----------------------------------- */}

                <Button type="primary" size="large" icon={<PhoneOutlined />} className="bg-[#f96302] hover:bg-orange-600 rounded-full font-bold px-6">
                  Liên hệ
                </Button>
              </div>
            </div>

            <hr className="border-gray-100 my-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-orange-50/50">
                <Statistic
                  title={<span className="text-gray-500 text-xs uppercase font-bold">Đánh giá</span>}
                  value={profile.averageRating || 0}
                  precision={1}
                  suffix="/ 5"
                  valueStyle={{ color: '#f96302', fontWeight: 'bold' }}
                  prefix={<Rate disabled defaultValue={1} count={1} className="text-[#f96302] mr-1" />}
                />
                <div className="text-xs text-gray-400 mt-1">{profile.totalReviews || 0} lượt</div>
              </div>

              <div className="text-center p-3 rounded-lg hover:bg-gray-50">
                <Statistic
                  title={<span className="text-gray-500 text-xs uppercase font-bold">Giao dịch</span>}
                  value={profile.successfulDeals || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<SafetyCertificateFilled />}
                />
                <div className="text-xs text-gray-400 mt-1">Hợp đồng thành công</div>
              </div>

              <div className="text-center p-3 rounded-lg hover:bg-gray-50">
                <Statistic
                  title={<span className="text-gray-500 text-xs uppercase font-bold">Tổng tin đăng</span>}
                  value={totalRooms}
                />
                <div className="text-xs text-gray-400 mt-1">Phòng trọ</div>
              </div>

              <div className="text-center p-3 rounded-lg hover:bg-gray-50">
                <div className="ant-statistic">
                  <div className="ant-statistic-title text-gray-500 text-xs uppercase font-bold">Khu vực hoạt động</div>
                  <div className="ant-statistic-content mt-1">
                    <div className="flex flex-wrap justify-center gap-1">
                      {profile.activeDistricts && profile.activeDistricts.length > 0 ? (
                        profile.activeDistricts.slice(0, 2).map((d, i) => (
                          <Tag key={i} color="geekblue" className="m-0 border-none bg-blue-50 text-blue-600 font-medium">{d}</Tag>
                        ))
                      ) : (
                        <span className="text-sm font-bold text-gray-400">Toàn quốc</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">Hoạt động chính</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BODY: DANH SÁCH TIN ĐĂNG */}
      <div className="max-w-6xl mx-auto px-4 mt-8">

        <div className="flex items-center justify-between mb-4" id="room-section-title">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 m-0 border-l-4 border-[#f96302] pl-3">
              Tin đăng của {profile.fullName}
            </h2>
            <Tag color="#f96302" className="rounded-full px-2">{totalRooms}</Tag>
          </div>
        </div>

        {/* TABS LỌC TIN ĐĂNG (TẤT CẢ / CHO THUÊ / BÁN) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'ALL' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả ({activeTab === 'ALL' ? totalRooms : 'Xem'})
            </Button>
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'FOR_RENT' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('FOR_RENT')}
            >
              Cho thuê ({activeTab === 'FOR_RENT' ? totalRooms : 'Xem'})
            </Button>
            <Button
              className={`rounded-full font-bold transition-all px-5 ${activeTab === 'FOR_SALE' ? 'bg-[#f96302] text-white border-[#f96302]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
              onClick={() => setActiveTab('FOR_SALE')}
            >
              Cần bán ({activeTab === 'FOR_SALE' ? totalRooms : 'Xem'})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-semibold">Sắp xếp:</span>
            <Select
              defaultValue="newest"
              bordered={false}
              className="font-bold text-gray-700 hover:text-[#f96302] transition-colors"
              onChange={setSortType}
              style={{ width: 160 }}
            >
              <Select.Option value="newest">Mới nhất</Select.Option>
              <Select.Option value="price_asc">Giá thấp đến cao</Select.Option>
              <Select.Option value="price_desc">Giá cao đến thấp</Select.Option>
            </Select>
          </div>
        </div>

        {rooms.length === 0 ? (
          <Empty description="Người này hiện không có tin đăng nào." className="bg-white p-10 rounded-lg shadow-sm" />
        ) : (
          <>
            <Row gutter={[20, 20]}>
              {getSortedRooms().map(room => {
                const rented = isRented(room);

                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={room.id}>
                    <Card
                      hoverable={!rented}
                      // 🟢 VIỀN CAM NẾU LÀ VIP (Đồng bộ HomePage)
                      className={`overflow-hidden border shadow-sm transition-all rounded-lg h-full flex flex-col group ${rented
                        ? 'bg-gray-100 opacity-90 border-gray-200'
                        : ((room.priorityLevel && room.priorityLevel > 0) ? 'border-orange-200 border-2 bg-white hover:shadow-lg' : 'border-gray-200 bg-white hover:shadow-lg')
                        }`}
                      bodyStyle={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}
                      cover={
                        <div className="relative h-44 w-full overflow-hidden">
                          <img
                            src={getImageUrl(room)}
                            className={`h-full w-full object-cover transition-transform duration-500 ${rented ? 'grayscale filter blur-[1px]' : 'group-hover:scale-105'}`}
                            alt="room"
                          />

                          {/* 🟢 NHÃN VIP: Chỉ hiện khi chưa thuê & Có priority */}
                          {!rented && room.priorityLevel > 0 && (
                            <Tag color="#fadb14" className="absolute top-2 right-2 border-none font-bold text-[10px] m-0 flex items-center gap-1 shadow-sm text-black px-1.5 py-0.5 z-10">
                              <CrownFilled /> VIP
                            </Tag>
                          )}

                          {/* 🟢 ICON LỬA: Nếu priority >= 50 */}
                          {!rented && room.priorityLevel >= 50 && (
                            <div className="absolute bottom-2 left-2 text-[#fadb14] animate-bounce drop-shadow-md z-10">
                              <FireFilled style={{ fontSize: '18px' }} />
                            </div>
                          )}

                          {/* OVERLAY KHI ĐÃ THUÊ */}
                          {rented && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                              <div className="border-2 border-white text-white font-bold text-lg px-3 py-1 transform -rotate-12 tracking-wider shadow-lg">
                                ĐÃ CHO THUÊ
                              </div>
                              {room.status === 'FULL' && (
                                <div className="text-white text-xs mt-2 font-medium bg-red-600 px-2 rounded">Hết phòng</div>
                              )}
                            </div>
                          )}

                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm z-10">
                            <CameraFilled /> {room.images?.length || 0}
                          </div>
                        </div>
                      }
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <div className="flex-grow">
                        {/* 🟢 TIÊU ĐỀ: Có icon Crown nếu là VIP */}
                        <h3 className={`text-[15px] font-bold line-clamp-2 mb-2 min-h-[44px] leading-snug transition-colors flex items-start gap-1 ${rented ? 'text-gray-500' : ((room.priorityLevel > 0) ? 'text-[#f96302]' : 'text-gray-800')
                          }`}>
                          {!rented && room.priorityLevel > 0 && <CrownFilled className="mt-1 flex-shrink-0" />} {room.title}
                        </h3>

                        <div className="flex items-end gap-2 mb-2">
                          <span className={`font-bold text-lg leading-none ${rented ? 'text-gray-500 decoration-slate-400' : 'text-[#d0021b]'}`}>
                            {formatCurrency(room.price)}
                          </span>
                          <span className="text-gray-400 text-xs pb-0.5">/ tháng</span>
                        </div>

                        <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <EnvironmentOutlined /> {room.address}
                        </div>

                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>{room.area} m²</span>
                          <span className="w-[1px] bg-gray-300 h-3 self-center"></span>

                          {room.rentalType === 'SHARED' ? (
                            <span className={room.currentTenants >= room.capacity ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                              {room.currentTenants || 0}/{room.capacity} người
                            </span>
                          ) : (
                            <span>{room.capacity} ngủ</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-400">{dayjs(room.createdAt).fromNow()}</span>
                        {!rented && <HeartOutlined className="text-gray-400 hover:text-red-500 transition-colors" />}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {totalRooms > pageSize && (
              <div className="flex justify-center mt-8">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalRooms}
                  onChange={(page) => {
                    setCurrentPage(page);
                    // Cuộn mượt mà lên đầu danh sách bài viết để theo dõi
                    const element = document.getElementById('room-section-title');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  showSizeChanger={false}
                  className="bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-100"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LandlordProfile;