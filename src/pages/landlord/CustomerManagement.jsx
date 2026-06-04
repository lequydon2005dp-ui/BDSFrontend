import React, { useState, useEffect, useRef } from 'react';
import {
  Layout, Avatar, Input, Tabs, Tag, Button,
  Typography, Badge, Divider, Spin, message, Modal, Form, DatePicker, InputNumber, Select, Space, Dropdown,
  Descriptions, Table // 🟢 Thêm Descriptions, Table để xem chi tiết
} from 'antd';
import {
  SearchOutlined, SendOutlined, UserOutlined,
  PhoneOutlined, HomeOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, FileTextOutlined, MessageOutlined, PlusOutlined, DeleteOutlined,
  MoreOutlined, PrinterOutlined // 🟢 Thêm icon
} from '@ant-design/icons';
import dayjs from 'dayjs';
import contractService from '../../services/contractService';
import chatService from '../../services/chatService';
import useAuth from '../../hooks/useAuth';

import { useSocket } from '../../contexts/SocketContext';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

const CustomerManagement = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const [chatHistory, setChatHistory] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [submittingContract, setSubmittingContract] = useState(false);

  // 🟢 STATE CHO XEM CHI TIẾT HỢP ĐỒNG
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [contractDetail, setContractDetail] = useState(null);

  const messagesEndRef = useRef(null);
  const { isConnected, lastMessage, sendChatMessage } = useSocket();

  useEffect(() => {
    if (lastMessage) {
      setChatHistory((prev) => [...prev, lastMessage]);
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchChatHistory(selectedTenantId);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await contractService.getLandlordCustomers();
      setCustomers(res || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (tenantId) => {
    setChatLoading(true);
    try {
      const res = await chatService.getChatHistory(tenantId);
      setChatHistory(Array.isArray(res) ? res : (res.data || []));
    } catch (error) {
      console.error("Lỗi tải tin nhắn:", error);
    } finally {
      setChatLoading(false);
    }
  };

  // 🟢 HÀM XỬ LÝ XEM HỢP ĐỒNG
  const handleViewContract = async () => {
    if (!selectedCustomer?.contractId) return;
    setIsViewModalOpen(true);
    setViewLoading(true);
    try {
      // Giả sử API endpoint là /api/contracts/{id}
      const res = await contractService.createContract; // Ở đây bạn nên có hàm getContractDetail trong service
      // Tạm thời mình dùng dữ liệu từ selectedCustomer kết hợp logic tải
      // Nếu bạn đã có API chi tiết, hãy thay thế dòng dưới bằng dữ liệu từ API
      setContractDetail(selectedCustomer); 
      // Lưu ý: Để hiện đủ điện nước/phí dịch vụ, Backend cần trả về object Contract đầy đủ
    } catch (error) {
      message.error("Không thể tải chi tiết hợp đồng");
    } finally {
      setViewLoading(false);
    }
  };

  const handleCreateContract = async (values) => {
    setSubmittingContract(true);
    try {
      const contractData = {
        roomId: selectedCustomer.roomId,
        tenantEmail: values.tenantEmail,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        monthlyRent: values.monthlyRent,
        depositAmount: values.depositAmount,
        electricPrice: values.electricPrice,
        waterPrice: values.waterPrice,
        serviceFees: values.serviceFees || []
      };

      await contractService.createContract(contractData);

      if (isConnected) {
        const notifyMsg = {
          senderId: user.id,
          receiverId: selectedTenantId,
          content: `📄 **HỢP ĐỒNG MỚI ĐÃ ĐƯỢC LẬP**\n📍 Phòng: ${selectedCustomer.roomTitle}\n💰 Giá thuê: ${values.monthlyRent.toLocaleString()}đ/tháng\n📅 Bắt đầu: ${contractData.startDate}\n*Vui lòng kiểm tra mục Hợp đồng để ký kết.*`,
          type: 'TEXT'
        };
        sendChatMessage(notifyMsg);
        setChatHistory(prev => [...prev, { ...notifyMsg, createdAt: new Date().toISOString() }]);
      }

      message.success("Đã tạo hợp đồng thành công!");
      setIsContractModalOpen(false);
      form.resetFields();
      fetchCustomers(); 
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tạo hợp đồng.");
    } finally {
      setSubmittingContract(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTenantId || !user) return;
    const chatMessage = {
      senderId: user.id,
      receiverId: selectedTenantId,
      content: messageInput,
      type: 'TEXT'
    };
    if (isConnected) {
      try {
        sendChatMessage(chatMessage);
        const tempMsg = { ...chatMessage, id: Date.now(), createdAt: new Date().toISOString() };
        setChatHistory(prev => [...prev, tempMsg]);
        setMessageInput('');
      } catch (error) {
        message.error("Lỗi gửi tin nhắn");
      }
    } else {
      message.error("Mất kết nối máy chủ chat.");
    }
  };

  const filteredList = customers.filter(c => {
    if (activeTab === 'active') return c.status === 'ACTIVE' || c.status === 'EXPIRED';
    if (activeTab === 'potential') return c.status === 'POTENTIAL' || c.status === 'PENDING';
    return true;
  });

  const selectedCustomer = customers.find(c => c.tenantId === selectedTenantId);

  const actionMenu = {
    items: [
      {
        key: '1',
        label: 'Tạo hợp đồng mới',
        icon: <PlusOutlined />,
        onClick: () => setIsContractModalOpen(true),
      },
    ],
  };

  const renderSidebar = () => (
    <div className="h-full flex flex-col border-r bg-white">
      <div className="p-3 border-b">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Tìm tên..."
          className="mb-3 rounded-md bg-gray-100 border-none"
        />
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          centered
          items={[
            { key: 'active', label: `Đang thuê` },
            { key: 'potential', label: `Quan tâm` }
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredList.map((item) => (
          <div
            key={item.tenantId}
            onClick={() => setSelectedTenantId(item.tenantId)}
            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 
              ${selectedTenantId === item.tenantId ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
          >
            <div className="flex items-center gap-2">
              <Avatar size={32} src={item.tenantAvatar} icon={<UserOutlined />} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <Text strong={selectedTenantId === item.tenantId} className={`truncate text-sm ${selectedTenantId === item.tenantId ? 'text-blue-600' : 'text-gray-700'}`}>
                    {item.tenantName}
                  </Text>
                  {item.status === 'ACTIVE' && <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 ml-1"></div>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (!selectedCustomer) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
          <div className="bg-white p-8 rounded-full shadow-sm mb-4"><MessageOutlined style={{ fontSize: 40 }} /></div>
          <p>Chọn một khách hàng để xem chi tiết & tin nhắn</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar src={selectedCustomer.tenantAvatar} icon={<UserOutlined />} />
            <div>
              <h3 className="font-bold text-gray-800 m-0">{selectedCustomer.tenantName}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <PhoneOutlined /> {selectedCustomer.tenantPhone || 'Chưa có SĐT'}
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <Tag color={selectedCustomer.status === 'ACTIVE' ? 'green' : 'orange'} className="m-0 border-none">
                  {selectedCustomer.status === 'ACTIVE' ? 'Đang thuê' : 'Quan tâm'}
                </Tag>
              </div>
            </div>
          </div>
          
          <Space>
            {selectedCustomer.status === 'ACTIVE' && (
              <Button 
                icon={<FileTextOutlined />} 
                onClick={handleViewContract} // 🟢 Gọi hàm xem hợp đồng
              >
                Hợp đồng
              </Button>
            )}
            
            <Dropdown menu={actionMenu} trigger={['click']} placement="bottomRight">
              <Button icon={<MoreOutlined />} type="text" className="text-gray-500 hover:text-blue-600" />
            </Dropdown>
          </Space>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatLoading ? <div className="text-center mt-5"><Spin /></div> : (
                chatHistory.length === 0 ? <div className="text-center text-gray-400 mt-10">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</div> :
                  chatHistory
                    .filter(msg =>
                      (msg.senderId === user.id && msg.receiverId === selectedTenantId) ||
                      (msg.senderId === selectedTenantId && msg.receiverId === user.id)
                    )
                    .map((msg, index) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && <Avatar size="small" src={selectedCustomer.tenantAvatar} icon={<UserOutlined />} className="mr-2 mt-1" />}
                          <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap
                              ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'}`}
                          >
                            {msg.content}
                            <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                              {dayjs(msg.createdAt).format('HH:mm')}
                            </div>
                          </div>
                        </div>
                      );
                    })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập tin nhắn..."
                  className="rounded-full bg-gray-100 border-none"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onPressEnter={handleSendMessage}
                />
                <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={handleSendMessage} className="bg-blue-600" />
              </div>
            </div>
          </div>

          <div className="w-[300px] bg-white border-l p-4 overflow-y-auto hidden xl:block">
            <Title level={5} className="mb-4 text-gray-700">Thông tin chi tiết</Title>

            {selectedCustomer.status === 'ACTIVE' ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-500 font-bold uppercase mb-1">Phòng đang ở</div>
                  <div className="font-bold text-gray-800"><HomeOutlined /> {selectedCustomer.roomTitle}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 font-bold uppercase mb-1">Hợp đồng</div>
                  <div className="text-sm flex justify-between mb-1">
                    <span>Bắt đầu:</span> <span className="font-medium">{dayjs(selectedCustomer.startDate).format('DD/MM/YYYY')}</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Kết thúc:</span> <span className="font-medium">{dayjs(selectedCustomer.endDate).format('DD/MM/YYYY')}</span>
                  </div>
                  <Divider className="my-2" />
                  {/* 🟢 Nút xem hợp đồng ở panel bên phải */}
                  <Button 
                    type="primary" 
                    ghost 
                    block 
                    icon={<FileTextOutlined />}
                    onClick={handleViewContract}
                  >
                    Xem hợp đồng
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-xs text-orange-500 font-bold uppercase mb-1">Quan tâm phòng</div>
                  <div className="font-bold text-gray-800"><HomeOutlined /> {selectedCustomer.roomTitle}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 font-bold uppercase mb-2">Trạng thái</div>
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationCircleOutlined className="text-orange-500" /> Chưa có hợp đồng
                  </div>
                  
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => setIsContractModalOpen(true)}
                  >
                    Tạo hợp đồng mới
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-white">
      <Layout className="h-full bg-white">
        <Sider width={240} theme="light" className="border-r shadow-sm z-10">
          {renderSidebar()}
        </Sider>
        <Content>
          {loading ? (
            <div className="h-full flex justify-center items-center"><Spin size="large" /></div>
          ) : (
            renderMainContent()
          )}
        </Content>
      </Layout>

      <Modal
        title={<span><FileTextOutlined className="mr-2 text-blue-600" /> Lập hợp đồng chính thức</span>}
        open={isContractModalOpen}
        onCancel={() => setIsContractModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submittingContract}
        okText="Ký kết hợp đồng"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateContract} className="mt-4" initialValues={{ electricPrice: 3500, waterPrice: 15000 }}>
          <Form.Item label="Khách hàng"><Input value={selectedCustomer?.tenantName} disabled /></Form.Item>
          <Form.Item label="Phòng thuê"><Input value={selectedCustomer?.roomTitle} disabled /></Form.Item>
          
          <Form.Item name="tenantEmail" label="Email khách hàng (Để xác thực hệ thống)" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email chính xác!' }]}>
             <Input placeholder="Nhập email khách đã đăng ký..." />
          </Form.Item>

          <Form.Item name="dateRange" label="Thời hạn hợp đồng (Bắt đầu - Kết thúc)" rules={[{ required: true, message: 'Chọn thời hạn!' }]}>
            <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="monthlyRent" label="Giá thuê (VND/Tháng)" rules={[{ required: true }]}>
              <InputNumber className="w-full" formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/\$\s?|(,*)/g, '')} />
            </Form.Item>
            <Form.Item name="depositAmount" label="Tiền cọc (VND)" rules={[{ required: true }]}>
              <InputNumber className="w-full" formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/\$\s?|(,*)/g, '')} />
            </Form.Item>
          </div>

          <Divider orientation="left" plain>Chỉ số & Dịch vụ</Divider>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="electricPrice" label="Giá điện (đ/KWh)">
              <InputNumber className="w-full" />
            </Form.Item>
            <Form.Item name="waterPrice" label="Giá nước (đ/m3)">
              <InputNumber className="w-full" />
            </Form.Item>
          </div>

        
          <Form.Item name="note" label="Ghi chú điều khoản bổ sung" className="mt-4">
            <TextArea rows={3} placeholder="Ví dụ: Giờ giấc tự do, không nuôi thú cưng..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 🟢 MODAL XEM CHI TIẾT HỢP ĐỒNG (COMPONENT MỚI) */}
      <Modal
        title={<Title level={4}><FileTextOutlined className="text-blue-600" /> Chi tiết hợp đồng thuê</Title>}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>In hợp đồng</Button>
        ]}
        width={700}
      >
        <Spin spinning={viewLoading}>
          {contractDetail && (
            <div className="p-2">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Khách thuê" span={2}><Text strong>{contractDetail.tenantName}</Text></Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{contractDetail.tenantPhone}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><Tag color="green">Đang hiệu lực</Tag></Descriptions.Item>
                <Descriptions.Item label="Phòng" span={2}><HomeOutlined /> {contractDetail.roomTitle}</Descriptions.Item>
                <Descriptions.Item label="Ngày bắt đầu">{dayjs(contractDetail.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Ngày kết thúc">{dayjs(contractDetail.endDate).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Giá thuê"><Text type="danger" strong>{contractDetail.monthlyRent?.toLocaleString()}đ/tháng</Text></Descriptions.Item>
                <Descriptions.Item label="Tiền cọc">{contractDetail.depositAmount?.toLocaleString()}đ</Descriptions.Item>
              </Descriptions>

              <Divider orientation="left" plain>Giá dịch vụ cố định</Divider>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Giá điện">{contractDetail.electricPrice?.toLocaleString()}đ/KWh</Descriptions.Item>
                <Descriptions.Item label="Giá nước">{contractDetail.waterPrice?.toLocaleString()}đ/m3</Descriptions.Item>
              </Descriptions>

         
             
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default CustomerManagement;