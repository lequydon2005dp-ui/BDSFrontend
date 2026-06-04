import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, message, Popconfirm, Tabs, Avatar, Tooltip, Modal, Radio, DatePicker, Input } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  UserOutlined, HomeOutlined, PhoneOutlined, SyncOutlined,
  ExclamationCircleOutlined, CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import appointmentService from '../../services/appointmentService';

// --- COMPONENT CON: MODAL TỪ CHỐI / ĐỀ XUẤT ---
const RejectModal = ({ open, onClose, onFinish }) => {
    const [actionType, setActionType] = useState('REJECT'); // 'REJECT' | 'SUGGEST'
    const [newTime, setNewTime] = useState(null);
    const [note, setNote] = useState('');

    const handleOk = () => {
        if (actionType === 'SUGGEST' && !newTime) {
            return message.error("Vui lòng chọn giờ mới!");
        }
        onFinish(actionType, newTime, note);
        // Reset form
        setNote(''); setNewTime(null); setActionType('REJECT');
    };

    return (
        <Modal title="Xử lý yêu cầu này" open={open} onCancel={onClose} onOk={handleOk} okText="Xác nhận">
            <div className="mb-4">
                <Radio.Group value={actionType} onChange={e => setActionType(e.target.value)} className="flex flex-col gap-2">
                    <Radio value="REJECT">Từ chối thẳng (Hủy lịch)</Radio>
                    <Radio value="SUGGEST">Đề xuất giờ khác (Tôi bận giờ này, muốn hẹn lại)</Radio>
                </Radio.Group>
            </div>

            {actionType === 'SUGGEST' && (
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
                    <div className="text-xs font-bold text-blue-600 mb-1">Chọn thời gian bạn rảnh:</div>
                    <DatePicker 
                        showTime={{ format: 'HH:mm' }} 
                        format="YYYY-MM-DD HH:mm" 
                        className="w-full"
                        onChange={(val) => setNewTime(val)}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                </div>
            )}

            <Input.TextArea 
                rows={3} 
                placeholder={actionType === 'REJECT' ? "Nhập lý do từ chối..." : "Nhắn đôi lời với khách..."}
                value={note}
                onChange={e => setNote(e.target.value)}
            />
        </Modal>
    );
};

// --- COMPONENT CHÍNH ---
const AppointmentManagement = () => {
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);      // Outgoing (Tôi đi thuê)
  const [receivedRequests, setReceivedRequests] = useState([]); // Incoming (Khách hẹn tôi)
  
  // State cho Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentService.getMyCalendar();
      const allData = res.data?.result || [];
      // Phân loại dựa trên isMyRequest
      setSentRequests(allData.filter(item => item.myRequest === true));
      setReceivedRequests(allData.filter(item => item.myRequest === false));
    } catch (error) {
      console.error(error);
      message.error("Lỗi tải lịch hẹn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  // 1. Xử lý Duyệt / Hủy đơn giản
  const handleUpdateStatus = async (id, status) => {
    try {
      await appointmentService.updateStatus(id, status);
      message.success("Cập nhật thành công!");
      fetchAppointments();
    } catch (error) {
      message.error("Lỗi cập nhật");
    }
  };

  // 2. Mở Modal Từ chối/Đề xuất
  const openRejectModal = (id) => {
      setSelectedApptId(id);
      setModalVisible(true);
  };

  // 3. Xử lý logic Modal (Gọi API Suggest hoặc Reject)
  const handleModalFinish = async (type, newTime, note) => {
      try {
          if (type === 'REJECT') {
              // Gọi API Hủy (Có thể update status kèm note nếu backend hỗ trợ note khi hủy, ở đây demo cancel)
              await appointmentService.updateStatus(selectedApptId, 'CANCELLED');
              message.success("Đã từ chối lịch hẹn.");
          } else {
              // Gọi API Đề xuất
              const formattedTime = newTime.format('YYYY-MM-DDTHH:mm:ss');
              await appointmentService.suggestNewTime(selectedApptId, formattedTime, note);
              message.success("Đã gửi đề xuất giờ mới!");
          }
          setModalVisible(false);
          fetchAppointments();
      } catch (error) {
          message.error("Có lỗi xảy ra: " + (error.response?.data?.message || ""));
      }
  };

  // 4. Khách đồng ý giờ đề xuất
  const handleAcceptSuggestion = async (id) => {
      try {
          await appointmentService.acceptSuggestion(id);
          message.success("Đã chốt lịch hẹn mới!");
          fetchAppointments();
      } catch (error) {
          message.error("Lỗi xác nhận");
      }
  };

  // Helper UI
  const renderStatus = (status, record) => {
      if (status === 'SUGGESTED') {
          return (
              <Tooltip title="Chủ trọ muốn đổi giờ. Bấm Đồng ý để chốt.">
                  <Tag color="geekblue" icon={<ExclamationCircleOutlined />}>
                      Chủ đề xuất lại: <br/>
                      <b>{dayjs(record.suggestedMeetTime).format("HH:mm DD/MM")}</b>
                  </Tag>
              </Tooltip>
          );
      }
      switch (status) {
          case 'PENDING': return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ xác nhận</Tag>;
          case 'CONFIRMED': return <Tag color="green" icon={<CheckCircleOutlined />}>Đã chốt lịch</Tag>;
          case 'CANCELLED': return <Tag color="red" icon={<CloseCircleOutlined />}>Đã hủy</Tag>;
          default: return <Tag>{status}</Tag>;
      }
  };

  // --- TAB 1: KHÁCH HẸN TÔI (Tôi là Landlord) ---
  const receivedColumns = [
    {
        title: 'Khách hàng',
        render: (_, r) => (
            <div className="flex items-center gap-2">
                <Avatar src={r.partnerAvatar} icon={<UserOutlined />} />
                <div>
                    <div className="font-bold">{r.partnerName}</div>
                    <div className="text-xs text-gray-500">{r.partnerPhone || "SĐT ẩn"}</div>
                </div>
            </div>
        )
    },
    {
        title: 'Phòng & Lời nhắn',
        render: (_, r) => (
            <div className="max-w-[250px]">
                <div className="text-blue-700 font-medium truncate" title={r.roomTitle}>{r.roomTitle}</div>
                <div className="text-xs text-gray-500 italic mt-1">"{r.message}"</div>
            </div>
        )
    },
    {
        title: 'Giờ hẹn',
        dataIndex: 'meetTime',
        render: (t) => <span className="font-semibold text-orange-600">{dayjs(t).format('HH:mm - DD/MM/YYYY')}</span>
    },
    {
        title: 'Trạng thái',
        dataIndex: 'status',
        render: (s, r) => renderStatus(s, r)
    },
    {
        title: 'Hành động',
        render: (_, r) => {
            if (r.status === 'PENDING') {
                return (
                    <Space>
                        <Button type="primary" size="small" className="bg-green-600" onClick={() => handleUpdateStatus(r.id, 'CONFIRMED')}>Duyệt</Button>
                        <Button danger size="small" onClick={() => openRejectModal(r.id)}>Từ chối...</Button>
                    </Space>
                );
            }
            if (r.status === 'SUGGESTED') return <span className="text-gray-400 italic text-xs">Đang chờ khách chốt lại...</span>;
            return null;
        }
    }
  ];

  // --- TAB 2: TÔI ĐI THUÊ (Tôi là Tenant) ---
  const sentColumns = [
    {
        title: 'Chủ trọ',
        render: (_, r) => (
            <div className="flex items-center gap-2">
                <Avatar shape="square" src={r.partnerAvatar} icon={<HomeOutlined />} className="bg-purple-100 text-purple-600"/>
                <div>
                    <div className="font-bold">{r.partnerName}</div>
                    {r.status === 'CONFIRMED' ? (
                        <div className="text-xs text-green-600 font-bold"><PhoneOutlined/> {r.partnerPhone}</div>
                    ) : <div className="text-xs text-gray-400">SĐT hiện khi duyệt</div>}
                </div>
            </div>
        )
    },
    {
        title: 'Phòng đã đặt',
        dataIndex: 'roomTitle',
        render: (t) => <div className="text-blue-700 font-medium truncate max-w-[200px]" title={t}>{t}</div>
    },
    {
        title: 'Giờ hẹn',
        render: (_, r) => (
            <div>
                <div className={r.status==='SUGGESTED' ? "line-through text-gray-400 text-xs" : "font-semibold text-blue-600"}>
                    {dayjs(r.meetTime).format('HH:mm - DD/MM')}
                </div>
            </div>
        )
    },
    {
        title: 'Trạng thái',
        dataIndex: 'status',
        render: (s, r) => renderStatus(s, r)
    },
    {
        title: 'Hành động',
        render: (_, r) => {
            if (r.status === 'SUGGESTED') {
                return (
                    <Space direction="vertical" size={0}>
                        <Button type="primary" size="small" className="bg-blue-600 mb-1" onClick={() => handleAcceptSuggestion(r.id)}>Đồng ý giờ mới</Button>
                        <Button type="text" danger size="small" onClick={() => handleUpdateStatus(r.id, 'CANCELLED')}>Không, hủy lịch</Button>
                    </Space>
                )
            }
            if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
                return (
                    <Popconfirm title="Hủy lịch này?" onConfirm={() => handleUpdateStatus(r.id, 'CANCELLED')}>
                        <Button type="dashed" danger size="small">Hủy</Button>
                    </Popconfirm>
                );
            }
            return null;
        }
    }
  ];

  return (
    <div className="p-4 bg-white shadow rounded-lg min-h-[500px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Lịch Hẹn</h2>
        <Button icon={<SyncOutlined />} onClick={fetchAppointments} loading={loading}>Làm mới</Button>
      </div>
      
      <Tabs defaultActiveKey="1" items={[
          { key: '1', label: `Khách hẹn tôi (${receivedRequests.filter(r => r.status === 'PENDING').length})`, children: <Table dataSource={receivedRequests} columns={receivedColumns} rowKey="id" /> },
          { key: '2', label: `Tôi đi hẹn (${sentRequests.filter(r => r.status === 'SUGGESTED' || r.status === 'CONFIRMED').length})`, children: <Table dataSource={sentRequests} columns={sentColumns} rowKey="id" /> }
      ]} type="card" />

      {/* Modal xử lý */}
      <RejectModal 
        open={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onFinish={handleModalFinish} 
      />
    </div>
  );
};

export default AppointmentManagement;