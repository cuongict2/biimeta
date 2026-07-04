"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// Giữ nguyên interface này để khớp với code phía client
export interface Message {
  id: string;
  created_at: string; // Sử dụng lại tên này để không cần sửa client
  sender: string;
  text?: string;
  imageUrl?: string; // Sử dụng lại tên này
}

// Lấy tin nhắn từ CƠ SỞ DỮ LIỆU
export async function getMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true }) // Sắp xếp theo thời gian
    .limit(100); // Giới hạn lấy 100 tin nhắn gần nhất

  if (error) {
    console.error("Lỗi khi lấy tin nhắn:", error);
      return [];
    }

  // Map lại tên cột từ database (image_url) sang tên mà client đang dùng (imageUrl)
  return data.map(msg => ({
    id: msg.id,
    created_at: msg.created_at,
    sender: msg.sender,
    text: msg.text,
    imageUrl: msg.image_url,
  }));
}

// Gửi tin nhắn và LƯU VÀO CƠ SỞ DỮ LIỆU
export async function sendMessage(
  nickname: string,
  content: { text?: string; imageUrl?: string }
) {
  if ((!content.text || !content.text.trim()) && !content.imageUrl) {
    return { success: false, error: "Nội dung tin nhắn không được để trống" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender: nickname,
      text: content.text,
      image_url: content.imageUrl, // Lưu vào cột image_url
    })
    .select()
    .single();

  if (error) {
    console.error("Lỗi khi gửi tin nhắn:", error);
    return { success: false, error: error.message };
  }

  // Thông báo cho Next.js rằng dữ liệu của trang này đã thay đổi
  revalidatePath("/coffee/order");

  // Tạo đối tượng trả về cho client với đúng cấu trúc
    const newMessage: Message = {
    id: data.id,
    created_at: data.created_at,
    sender: data.sender,
    text: data.text,
    imageUrl: data.image_url,
    };

    return { success: true, message: newMessage };
  }
