import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function CoffeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lấy đường dẫn hiện tại từ headers không khả dụng trong layout
  // Nên ta sẽ kiểm tra cookie ở đây, nhưng cho phép trang login đi qua
  // bằng cách kiểm tra trong từng page thay vì layout
  
  return <>{children}</>;
}