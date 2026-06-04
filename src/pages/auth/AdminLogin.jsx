import React, { useState } from 'react';
import {
  Form, Input, Button, Card, Typography, App
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateFilled
} from '@ant-design/icons';  // ✅ Import icons từ đây
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const { login, adminUser, logout } = useAdminAuth(); // ✅ Thêm refreshProfile
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        // ✅ CHECK ROLE TRỰC TIẾP TỪ SESSION STORAGE (NHANH NHẤT)
        const adminSessionId = sessionStorage.getItem('adminSessionId');
        const role = adminSessionId ? sessionStorage.getItem(`${adminSessionId}_role`) : null;

        if (role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
          message.success("✅ Đăng nhập Admin thành công!");
        } else {
          // Clear session nếu không phải Admin
          if (adminSessionId) {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith(`${adminSessionId}_`)) {
                sessionStorage.removeItem(key);
              }
            });
          }
          logout();
          message.error("📛 Tài khoản không có quyền Admin!");
        }
      }
    } catch (error) {
      message.error("❌ Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card
        className="w-full max-w-sm shadow-xl rounded-lg border border-gray-700 bg-gray-800"
        variant="outlined"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SafetyCertificateFilled className="text-5xl text-blue-500" />
          </div>
          <Title level={3} style={{ margin: 0, color: '#fff' }}>Admin Portal</Title>
          <Text className="text-gray-400">Hệ thống quản trị Smart Rental</Text>
        </div>

        <Form
          name="admin_login"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Nhập email quản trị!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email Quản trị viên"
              className="bg-white border-gray-600 placeholder-gray-400"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
              className="bg-white border-gray-600 placeholder-gray-400 "
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 border-none h-11 font-bold"
              loading={loading}
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text className="text-gray-500 text-xs">Truy cập trái phép sẽ bị ghi lại IP.</Text>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;