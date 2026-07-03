'use client';

import { useState } from 'react';
import { loadAllProducts } from '@/app/actions'; // Import Server Action

// Định nghĩa lại kiểu dữ liệu để component biết
type Product = {
  id: number;
  name: string;
  slug: string; 
  description: string;
  price: number;
  image_url: string;
  ingredients: string[];
};

interface ProductListProps {
  initialProducts: Product[];
  totalProducts: number;
}

export default function ProductList({ initialProducts, totalProducts }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);

  // Kiểm tra xem tất cả sản phẩm đã được tải hay chưa
  const allProductsLoaded = products.length >= totalProducts;

  const handleLoadMore = async () => {
    setIsLoading(true);
    const allProds = await loadAllProducts(); // Gọi Server Action
    setProducts(allProds);
    setIsLoading(false);
  };

  return (
    <section style={{ maxWidth: '1200px', margin: '60px auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#e0e0e0' }}>Sản Phẩm Nổi Bật</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
        {products.map((product) => (
          <div key={product.id} style={{ backgroundColor: '#25252a', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
            <img src={product.image_url || 'https://via.placeholder.com/300'} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#ffffff' }}>{product.name}</h3>
                              <p style={{ color: '#a0a0a5', fontSize: '0.9rem', marginBottom: '15px', height: 'auto', minHeight: '60px' }}>{product.description}</p>
                {/* Hiển thị thành phần */}
                <div style={{ marginBottom: '15px', fontSize: '0.85rem', color: '#b0b0b5' }}>
                  <strong>Thành phần:</strong> {product.ingredients?.join(', ')}
                </div>
              <div style={{ fontSize: '1.3rem', color: '#4ade80', fontWeight: 'bold' }}>
                {product.price.toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allProductsLoaded && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            style={{
              padding: '12px 30px',
              fontSize: '1rem',
              color: '#fff',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Đang tải...' : 'Xem tất cả sản phẩm'}
          </button>
        </div>
      )}
    </section>
  );
}