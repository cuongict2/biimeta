import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Các route KHÔNG cần đăng nhập
  const publicRoutes = ["/coffee/login", "/coffee/order"];

  // Kiểm tra xem route hiện tại có phải public không
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Nếu là route public, cho phép truy cập
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Nếu là route /coffee (dashboard), kiểm tra session
  if (pathname.startsWith("/coffee")) {
    const session = request.cookies.get("coffee_admin_session");

    if (!session?.value) {
      // Chưa đăng nhập -> redirect về trang login
      const loginUrl = new URL("/coffee/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Kiểm tra session hợp lệ
    try {
      const sessionData = JSON.parse(session.value);
      const loginAt = new Date(sessionData.loginAt);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginAt.getTime()) / (1000 * 60 * 60);

      // Session hết hạn sau 24 giờ
      if (hoursSinceLogin > 24) {
        const response = NextResponse.redirect(new URL("/coffee/login", request.url));
        response.cookies.delete("coffee_admin_session");
        return response;
      }
    } catch {
      // Session không hợp lệ -> redirect về login
      const response = NextResponse.redirect(new URL("/coffee/login", request.url));
      response.cookies.delete("coffee_admin_session");
      return response;
    }
  }

  return NextResponse.next();
}

// Chỉ áp dụng middleware cho các route /coffee
export const config = {
  matcher: ["/coffee/:path*"],
};