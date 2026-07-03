'use server';

import { supabase } from '@/lib/supabase';

/**
 * Tải tất cả sản phẩm từ database
 */
export async function loadAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false }); // Sắp xếp theo ngày tạo

  if (error) {
    console.error('Lỗi Server Action (loadAllProducts):', error);
    return [];
  }

  return data;
}