"use server";

import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

/**
 * Đăng nhập admin - kiểm tra username/password trong bảng admin_users
 */
export async function loginAdmin(username: string, password: string) {
  try {
    if (!username || !password) {
      return { success: false, error: "Vui lòng nhập đầy đủ thông tin." };
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username.trim())
      .eq("password", password)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu." };
    }

    // Cập nhật last_login
    await supabase
      .from("admin_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.id);

    // Lưu session vào cookie
    const cookieStore = await cookies();
    cookieStore.set("coffee_admin_session", JSON.stringify({
      id: data.id,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
      loginAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 giờ
      path: "/",
    });

    return {
      success: true,
      user: {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
      },
    };
  } catch (err: any) {
    console.error("Login error:", err);
    return { success: false, error: "Lỗi hệ thống." };
  }
}

/**
 * Đăng xuất admin
 */
export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("coffee_admin_session");
  return { success: true };
}

/**
 * Kiểm tra session admin
 */
export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("coffee_admin_session");
    if (!session?.value) return null;
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

/**
 * Server Action cập nhật trạng thái đơn hàng sang 'paid' khi thanh toán thành công
 * và tự động kích hoạt tính năng real-time của Supabase
 */
export async function updateOrderStatusToPaid(orderId: string) {
  try {
    if (!orderId) {
      return { success: false, error: "Mã đơn hàng không hợp lệ." };
    }

    // Cập nhật trạng thái trong Supabase. 
    // Supabase Realtime sẽ tự động broadcast sự kiện này tới các clients đang lắng nghe bảng `orders`.
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `Đơn hàng ${orderId} đã được thanh toán thành công.`,
      order: data,
    };
  } catch (err: any) {
    console.error("Server Action Error:", err);
    return { success: false, error: err.message || "Lỗi hệ thống bất ngờ." };
  }
}

/**
 * Lấy danh sách giao dịch từ API PHP Vietcombank của khách hàng
 */
export async function getVCBTransactions() {
  try {
    const response = await fetch("https://biimeta.duckdns.org/api/vcb/to9xvn.php?type=3", {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Không thể kết nối đến API VCB (HTTP ${response.status})`);
    }

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`Dữ liệu trả về từ API VCB không hợp lệ (Không phải JSON).`);
    }

    // Cấu trúc VCB lịch sử trả về có thể là array hoặc object chứa key transactions/data
    let transactions: any[] = [];
    if (Array.isArray(data)) {
      transactions = data;
    } else if (data && typeof data === "object") {
      // Thử tìm trong các cấu trúc phổ biến
      transactions =
        data.transactions ||
        data.results ||
        (data.data && data.data.transactions) ||
        data.contents ||
        [];
    }

    // Chuẩn hóa dữ liệu trả về để giao diện dùng thống nhất
    const normalizedTx = transactions.map((tx: any, idx: number) => {
      return {
        id: tx.transactionID || tx.Reference || tx.reference || `TX-${idx}-${Date.now()}`,
        amount: Number(tx.amount || tx.Amount || 0),
        description: tx.escription || tx.Description || tx.description || "Không có nội dung",
        time: tx.TransactionDate || tx.time || tx.date || "-"
      };
    });

    return { success: true, transactions: normalizedTx };
  } catch (err: any) {
    console.error("Lỗi lấy lịch sử VCB:", err);
    return { success: false, error: err.message || "Lỗi kết nối API VCB." };
  }
}

/**
 * Tự động đồng bộ và so khớp giao dịch VCB với các đơn hàng pending
 */
export async function syncVCBTransactions() {
  try {
    const txResult = await getVCBTransactions();
    if (!txResult.success || !txResult.transactions) {
      return { success: false, error: txResult.error };
    }

    const { data: pendingOrders, error: dbError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending");

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return { success: true, message: "Không có đơn hàng nào đang chờ thanh toán.", updatedCount: 0 };
    }

    let updatedCount = 0;
    const updatedOrders: string[] = [];

    for (const order of pendingOrders) {
      // Tìm xem có giao dịch nào khớp với đơn hàng này không
      // Điều kiện khớp:
      // - Nội dung chuyển khoản chứa bàn (ví dụ: BAN 2 hoặc BAN02) hoặc chứa order ID rút gọn
      // - Số tiền chuyển lớn hơn hoặc bằng tổng tiền đơn hàng
      const matchedTx = txResult.transactions.find((tx) => {
        const desc = tx.description.toLowerCase();
        const cleanOrderId = order.id.replace(/-/g, "").toLowerCase();

        // Khớp theo Order ID (UUID dạng đầy đủ hoặc rút gọn không gạch nối)
        const isOrderIdMatched = desc.includes(order.id.toLowerCase()) || desc.includes(cleanOrderId);

        // Khớp theo Bàn (Ví dụ bàn: "5" -> kiểm tra xem có chữ "ban 5", "ban05", "table 5" trong nội dung chuyển khoản không)
        const cleanTableId = order.table_id.toLowerCase().trim();
        const isTableMatched =
          desc.includes(`ban ${cleanTableId}`) ||
          desc.includes(`ban0${cleanTableId}`) ||
          desc.includes(`table ${cleanTableId}`) ||
          desc.includes(`table0${cleanTableId}`) ||
          desc.includes(`ban${cleanTableId}`);

        // Phải thỏa mãn 1 trong 2 điều kiện khớp nội dung và số tiền đủ
        const isAmountMatched = tx.amount >= order.total_amount;

        return (isOrderIdMatched || isTableMatched) && isAmountMatched;
      });

      if (matchedTx) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", order.id);

        if (!updateError) {
          updatedCount++;
          updatedOrders.push(order.id);
        } else {
          console.error(`Error updating order ${order.id}:`, updateError.message);
        }
      }
    }

    return {
      success: true,
      message: updatedCount > 0
        ? `Đã so khớp thành công! Cập nhật ${updatedCount} đơn hàng thành 'Đã thanh toán'.`
        : "Đã đồng bộ với ngân hàng nhưng chưa phát hiện giao dịch khớp với đơn chờ.",
      updatedCount,
      updatedOrders
    };
  } catch (err: any) {
    console.error("Lỗi đồng bộ:", err);
    return { success: false, error: err.message || "Lỗi đồng bộ giao dịch." };
  }
}

/**
 * Xóa đơn hàng chưa thanh toán (chỉ cho phép trạng thái pending)
 */
export async function deletePendingOrder(orderId: string) {
  try {
    if (!orderId) {
      return { success: false, error: "Mã đơn hàng không hợp lệ." };
    }

    const { data: checkData, error: checkError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (checkError || !checkData) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    if (checkData.status !== "pending") {
      return { success: false, error: "Chỉ có thể xóa đơn hàng ở trạng thái chưa thanh toán." };
    }

    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, message: "Đã hủy đơn hàng thành công." };
  } catch (err: any) {
    console.error("Error deleting order:", err);
    return { success: false, error: err.message || "Không thể hủy đơn hàng." };
  }
}

