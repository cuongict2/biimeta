import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // 1. Import Supabase client
import ProductList from '@/app/components/ProductList';

export const metadata = {
  title: "Cường - Home",
  description: "Trang chủ của Cường, nơi chia sẻ các dự án và công nghệ web hiện đại.",
};

// Định nghĩa kiểu dữ liệu cho sản phẩm và danh mục
type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  ingredients: string[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

// 2. Chuyển component thành async để lấy dữ liệu
export default async function Home() {
  // 3. Lấy dữ liệu từ Supabase
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*');

  // Lấy 10 sản phẩm đầu tiên
  const { data: initialProducts, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Lấy tổng số sản phẩm
  const { count: totalProducts, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (categoriesError || productsError || countError) {
    console.error("Lỗi fetch dữ liệu:", categoriesError || productsError || countError);
    // Bạn có thể hiển thị một trang lỗi ở đây
  }
  return (
    <main style={{ padding: '40px', fontFamily: 'Inter, sans-serif', backgroundColor: '#1a1a1f', color: '#e0e0e0', minHeight: '100vh' }}>
      {/* Profile Section */}
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '10px', color: '#ffffff' }}>Admin</h1>
        <p style={{ fontSize: '1.2rem', color: '#007bff' }}>Fullstack Developer | AI Enthusiast</p>
        <p style={{ maxWidth: '600px', margin: '20px auto', color: '#a0a0a5' }}>
          Chào mừng bạn đến với không gian làm việc của tôi. Nơi tôi kết nối công nghệ và trí tuệ nhân tạo để tạo ra các giải pháp web tối ưu và hiện đại.
        </p>
      </section>

          <section style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#e0e0e0' }}>Project Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <Link
            href="/9router_config"
            target="_blank"
            style={{
              padding: '25px',
            backgroundColor: '#25252a',
            border: '1px solid #333',
              borderRadius: '12px',
              textDecoration: 'none',
            color: '#007bff',
            fontWeight: '600',
              fontSize: '1.2rem',
              textAlign: 'center',
              transition: '0.3s'
          }}
        >
            🚀 9Router Config Generator
        </Link>
      </div>
      </section>
    </main>
  );
}

