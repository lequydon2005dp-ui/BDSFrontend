import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Typography, Tag, List, Divider, message, Spin, Modal, Tabs } from 'antd';
import {
    CrownFilled, CheckCircleFilled, FireOutlined,
    RocketFilled, LeftOutlined, PercentageOutlined,
    InfoCircleOutlined, StarFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import roomService from '../../services/roomService';
import paymentService from '../../services/paymentService';
import useAuth from '../../hooks/useAuth';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const VIPServicePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // State lưu dữ liệu
    const [membershipPackages, setMembershipPackages] = useState([]);
    const [pushPackages, setPushPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    // Kiểm tra xem user có đang dùng gói hội viên nào không
    const hasActivePackage = user?.membershipPackage && 
                             user?.membershipExpiresAt && 
                             dayjs().isBefore(dayjs(user.membershipExpiresAt));

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await roomService.getAllPackages();
                const allPkgs = res.data || [];

                // Lọc và chia gói thành 2 loại
                setMembershipPackages(allPkgs.filter(p => p.type === 'MEMBERSHIP').sort((a, b) => a.price - b.price));
                setPushPackages(allPkgs.filter(p => p.type === 'ROOM_PROMOTION').sort((a, b) => a.priorityLevel - b.priorityLevel));

            } catch (error) {
                message.error("Lỗi tải gói dịch vụ");
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    // Hàm Xử lý Mua Gói Hội Viên
    const handleRegisterMember = (pkg) => {
        if (hasActivePackage) {
            message.warning("Bạn đang có gói Hội viên còn hiệu lực!");
            return;
        }

        Modal.confirm({
            title: `Đăng ký: ${pkg.name}`,
            content: (
                <div>
                    <p className="text-gray-600">Xác nhận thanh toán để nâng cấp tài khoản:</p>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                        <div className="flex justify-between mb-1">
                            <span>Giá gói:</span>
                            <b className="text-[#f96302]">{pkg.price?.toLocaleString()} đ</b>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span>Thời hạn:</span>
                            <b>{pkg.durationDays} ngày</b>
                        </div>
                        <div className="flex justify-between text-green-600 font-medium">
                            <span><PercentageOutlined /> Giảm giá tin đăng:</span>
                            <b>{pkg.discountPercent}%</b>
                        </div>
                    </div>
                </div>
            ),
            okText: 'Thanh Toán Ngay',
            cancelText: 'Hủy',
            okButtonProps: { className: 'bg-[#f96302] border-[#f96302] hover:bg-[#d85502]' },
            centered: true,
            onOk: async () => {
                try {
                    message.loading({ content: "Đang xử lý giao dịch...", key: 'pay_vip' });
                    await paymentService.buyMembership(pkg.id);
                    message.success({ content: "Nâng cấp thành công!", key: 'pay_vip', duration: 3 });
                    navigate('/landlord/dashboard'); // Hoặc reload trang
                } catch (error) {
                    const errorMsg = error.response?.data?.message || error.message || '';
                    const isInsufficient = errorMsg.toLowerCase().includes('số dư') || 
                                           errorMsg.toLowerCase().includes('không đủ tiền') || 
                                           errorMsg.toLowerCase().includes('balance') || 
                                           error.response?.status === 400;

                    if (isInsufficient) {
                        message.destroy('pay_vip');
                        Modal.warning({
                            title: 'Số dư ví không đủ!',
                            content: 'Số dư ví khả dụng của bạn hiện tại không đủ để đăng ký gói hội viên này. Vui lòng nạp thêm tiền vào ví để thực hiện thanh toán.',
                            okText: 'Nạp tiền ngay',
                            cancelText: 'Hủy',
                            okButtonProps: { className: 'bg-blue-600 border-blue-600 text-white' },
                            onOk: () => {
                                navigate('/landlord/finance');
                            }
                        });
                    } else {
                        message.error({ content: errorMsg || "Lỗi giao dịch", key: 'pay_vip' });
                    }
                }
            }
        });
    };

    if (loading) return <div className="flex h-screen justify-center items-center"><Spin size="large" tip="Đang tải..." /></div>;

    // --- COMPONENT CARD (Dùng chung để render giao diện) ---
    const PackageCard = ({ pkg, isMembership }) => {
        const isVip = pkg.price > 0;
        const isCurrentUsing = isMembership && user?.membershipPackage?.id === pkg.id && hasActivePackage;

        // Nội dung hiển thị khác nhau giữa 2 loại gói
        const benefits = isMembership 
            ? [
                { text: pkg.discountPercent > 0 ? `Giảm ${pkg.discountPercent}% phí đăng tin` : "Không giảm giá", highlight: true },
                { text: `Hạn dùng ${pkg.durationDays} ngày`, highlight: false },
                { text: isVip ? "Huy hiệu VIP Uy tín" : "Tài khoản thường", highlight: false }
              ]
            : [
                { text: `Độ ưu tiên (Priority): ${pkg.priorityLevel}`, highlight: true },
                { text: `Thời gian tồn tại tin: ${pkg.durationDays} ngày`, highlight: false },
                { text: pkg.priorityLevel >= 10 ? "Luôn hiển thị đầu trang" : "Hiển thị dưới tin VIP", highlight: false }
              ];

        return (
            <Col xs={24} md={10} lg={8} key={pkg.id}>
                <Card
                    hoverable
                    className={`rounded-2xl border-2 transition-all h-full flex flex-col ${
                        isCurrentUsing ? 'border-green-500 bg-green-50/10 shadow-md' : 
                        (isVip ? 'border-[#f96302] shadow-lg scale-105 z-10' : 'border-gray-200')
                    }`}
                    bodyStyle={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                    {isCurrentUsing && <Tag color="success" className="absolute top-4 right-4"><CheckCircleFilled /> ĐANG DÙNG</Tag>}
                    
                    <div className="text-center mb-4">
                        <div className={`text-4xl mb-2 ${isVip ? 'text-[#f96302]' : 'text-gray-400'}`}>
                            {isMembership ? <CrownFilled /> : <RocketFilled />} 
                        </div>
                        <Title level={4} className="mb-0 text-gray-800">{pkg.name}</Title>
                        <div className="mt-2">
                            <span className={`text-2xl font-bold ${isVip ? 'text-[#f96302]' : 'text-gray-700'}`}>
                                {pkg.price?.toLocaleString()}
                            </span>
                            <span className="text-gray-500 text-xs ml-1 font-medium">
                                đ / {isMembership ? `${pkg.durationDays} ngày` : 'tin'}
                            </span>
                        </div>
                    </div>

                    <Divider className="my-3" />

                    <List
                        className="flex-1 mb-6"
                        split={false}
                        dataSource={benefits}
                        renderItem={item => (
                            <List.Item className="py-1 px-0">
                                <div className="flex items-start gap-2 text-sm">
                                    <CheckCircleFilled className={item.highlight ? "text-[#f96302] mt-1" : "text-gray-300 mt-1"} />
                                    <span className={item.highlight ? "font-medium text-gray-700" : "text-gray-500"}>{item.text}</span>
                                </div>
                            </List.Item>
                        )}
                    />

                    {/* NÚT BẤM */}
                    {isMembership ? (
                        <Button
                            type="primary"
                            block
                            disabled={hasActivePackage}
                            className={`h-10 font-bold rounded-lg border-none ${
                                isCurrentUsing ? 'bg-green-500' : (isVip ? 'bg-[#f96302] hover:bg-[#d85502]' : 'bg-gray-700')
                            }`}
                            onClick={() => handleRegisterMember(pkg)}
                        >
                            {isCurrentUsing ? "ĐANG HOẠT ĐỘNG" : "NÂNG CẤP NGAY"}
                        </Button>
                    ) : (
                        <Button 
                            block 
                            className="h-10 font-bold border-[#f96302] text-[#f96302] hover:bg-orange-50"
                            onClick={() => navigate('/landlord/create-room')}
                        >
                            ĐĂNG TIN NGAY
                        </Button>
                    )}
                </Card>
            </Col>
        );
    };

    return (
        <div className="p-6 bg-[#fdfdfd] min-h-screen">
            <Button type="text" icon={<LeftOutlined />} onClick={() => navigate(-1)} className="mb-2 text-gray-500">Quay lại Dashboard</Button>

            <div className="text-center mb-8">
                <Title level={2} className="mb-1 text-[#f96302] uppercase">Dịch Vụ & Ưu Đãi</Title>
                <Text type="secondary">Nâng cấp tài khoản để nhận giảm giá hoặc chọn gói đẩy tin để tiếp cận khách hàng</Text>
            </div>

            <Tabs 
                defaultActiveKey="1" 
                centered 
                type="card"
                className="custom-tabs"
                items={[
                    {
                        key: '1',
                        label: <span className="font-bold px-4 py-1 text-base"><CrownFilled className="mr-2"/>Gói Hội Viên (Giảm giá)</span>,
                        children: (
                            <div className="mt-6 animate-fadeIn">
                                <div className="text-center mb-6">
                                    <div className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm border border-blue-100">
                                        <InfoCircleOutlined className="mr-1"/> 
                                        Mua gói này để được <b>Giảm giá %</b> mỗi khi thanh toán phí đăng tin.
                                    </div>
                                </div>
                                <Row gutter={[24, 24]} justify="center">
                                    {membershipPackages.map(pkg => <PackageCard key={pkg.id} pkg={pkg} isMembership={true} />)}
                                </Row>
                            </div>
                        )
                    },
                    {
                        key: '2',
                        label: <span className="font-bold px-4 py-1 text-base"><FireOutlined className="mr-2"/>Bảng Giá Đẩy Tin</span>,
                        children: (
                            <div className="mt-6 animate-fadeIn">
                                <div className="text-center mb-6">
                                    <div className="inline-block bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm border border-orange-100">
                                        <InfoCircleOutlined className="mr-1"/> 
                                        Đây là bảng giá tham khảo. Bạn sẽ chọn gói này tại bước <b>Đăng Tin</b>.
                                    </div>
                                </div>
                                <Row gutter={[24, 24]} justify="center">
                                    {pushPackages.map(pkg => <PackageCard key={pkg.id} pkg={pkg} isMembership={false} />)}
                                </Row>
                            </div>
                        )
                    }
                ]} 
            />
        </div>
    );
};

export default VIPServicePage;