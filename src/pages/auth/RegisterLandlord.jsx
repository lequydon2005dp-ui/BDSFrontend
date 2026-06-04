import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

const { Title, Text } = Typography;

const RegisterLandlord = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Chuẩn bị dữ liệu gửi lên Backend
      const payload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        role: 'LANDLORD' // Mặc định là Chủ trọ
      };

      await authService.register(payload);
      
      message.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate('/login'); // Chuyển hướng về trang đăng nhập

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại (Email có thể đã tồn tại)";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-600 p-4">
      <Card 
        className="w-full max-w-lg shadow-2xl rounded-xl" 
        variant="borderless"
      >
        <div className="text-center mb-6">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <HomeOutlined className="text-3xl text-green-600" />
          </div>
          <Title level={3} style={{ margin: 0 }}>Đăng Ký Chủ Trọ</Title>
          <Text type="secondary">Tham gia hệ thống Smart Rental ngay hôm nay</Text>
        </div>

        <Form
          form={form}
          name="register_landlord"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          {/* Họ tên */}
          <Form.Item
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Họ và tên đầy đủ" />
          </Form.Item>

          {/* Email & Số điện thoại */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Nhập Email!' },
                  { type: 'email', message: 'Email sai định dạng!' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                rules={[
                    { required: true, message: 'Nhập SĐT!' },
                    { pattern: /^[0-9]{10,11}$/, message: 'SĐT không hợp lệ' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" />
              </Form.Item>
            </Col>
          </Row>

          {/* Mật khẩu */}
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng tạo mật khẩu!' }]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          {/* Nhập lại mật khẩu */}
          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full bg-green-600 hover:bg-green-500 border-none h-12 font-bold text-lg rounded-lg"
              loading={loading}
            >
              ĐĂNG KÝ NGAY
            </Button>
          </Form.Item>
          
          <div className="text-center mt-2">
            <Text>Đã có tài khoản? </Text>
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Đăng nhập tại đây
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterLandlord;