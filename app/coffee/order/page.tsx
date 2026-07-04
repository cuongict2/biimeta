import type { Metadata } from 'next';
import CustomerOrderPage from './OrderClient'; // Import component từ file vừa đổi tên

// Bước 1: Export metadata từ Server Component
export const metadata: Metadata = {
  title: 'Đặt Món - Bii Coffee & Tea',
  description: 'Chọn món từ thực đơn và đặt hàng trực tuyến tại bàn.',
};

// Bước 2: Render Client Component
export default function OrderPage() {
  return <CustomerOrderPage />;
}