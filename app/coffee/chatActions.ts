"use server";

import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

const CHAT_FILE = path.join(process.cwd(), "chat_messages.json");

export interface Message {
  id: string;
  sender: string;
  text?: string; // Text có thể không bắt buộc nếu gửi ảnh
  imageUrl?: string;
  timestamp: string;
}

// Danh sách từ cấm nói bậy
const BAD_WORDS = [
  "địt", "đm", "vcl", "vl", "cặc", "lồn", "chó", "đéo", "buồi", 
  "fuck", "bitch", "shit", "cút", "dâm", "đm", "dkm", "clm", "clgt"
];

// Hàm lọc từ tục tĩu
function filterBadWords(text: string): string {
  let filtered = text;
  BAD_WORDS.forEach((word) => {
    const regex = new RegExp(word, "gi");
    filtered = filtered.replace(regex, "***");
  });
  return filtered;
}

// Đọc tin nhắn từ file JSON và tự động xóa tin nhắn cũ hơn 1 ngày
export async function getMessages(): Promise<Message[]> {
  try {
    if (!fs.existsSync(CHAT_FILE)) {
      fs.writeFileSync(CHAT_FILE, JSON.stringify([]));
      return [];
    }

    const data = fs.readFileSync(CHAT_FILE, "utf8");
    const messages: Message[] = JSON.parse(data || "[]");

    // Lọc tin nhắn trong vòng 24 giờ
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeMessages = messages.filter(
      (msg) => new Date(msg.timestamp).getTime() > oneDayAgo
    );

    // Nếu có tin nhắn bị xóa, ghi lại file
    if (activeMessages.length !== messages.length) {
      fs.writeFileSync(CHAT_FILE, JSON.stringify(activeMessages, null, 2));
    }

    return activeMessages;
  } catch (err) {
    console.error("Lỗi đọc chat:", err);
    return [];
  }
}

// Gửi tin nhắn mới
export async function sendMessage(sender: string, content: { text?: string, imageUrl?: string }) {
  try {
    if (!sender.trim() || (!content.text?.trim() && !content.imageUrl?.trim())) {
      return { success: false, error: "Nội dung trống" };
    }

    const messages = await getMessages();

    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      sender: filterBadWords(sender),
      timestamp: new Date().toISOString(),
    };

    if (content.text) {
      newMessage.text = filterBadWords(content.text);
    }
    if (content.imageUrl) {
      newMessage.imageUrl = content.imageUrl;
    }


    messages.push(newMessage);
    fs.writeFileSync(CHAT_FILE, JSON.stringify(messages, null, 2));

    return { success: true, message: newMessage };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}