"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deletePendingOrder } from "../actions";
import { getMessages, sendMessage, Message } from "../chatActions";
import { toast, Toaster } from "react-hot-toast";

// --- Component Icon Yahoo (được tích hợp trực tiếp vào file) ---
function YahooIcons({ onSend }: { onSend: (text: string) => void }) {
  const icons = ["bawling.gif", "bow.gif", "fearful.gif", "nuh_uh.gif", "pensive.gif", "relaxed.gif", "rofl.gif", "smiley.gif", "wink.gif", "worried.gif"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "10px", marginBottom: "10px" }}>
      {icons.map(icon => (
        <button
          key={icon}
          type="button" // Quan trọng: để không submit form khi nhấn
          onClick={() => onSend(`[YAHOO:${icon}]`)}
          title={`Gửi icon ${icon.split('.')[0]}`}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "6px", cursor: "pointer", fontSize: "1.1rem" }}
        >
          <img src={`/yahoo_icons/${icon}`} alt={icon} style={{ width: "24px", height: "24px" }} />
        </button>
      ))}
    </div>
  );
}

// --- Các hàm và kiểu dữ liệu ---
const getStyles = (theme: 'dark' | 'light') => {
  const isDark = theme === 'dark';
  return {
    page: { minHeight: "100vh", background: isDark ? "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)" : "#f9fafb", color: isDark ? "#e4e4e7" : "#000000", fontFamily: "'Inter', sans-serif", paddingBottom: "80px" } as React.CSSProperties,
    glass: { background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff", backdropFilter: isDark ? "blur(12px)" : "none", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)", boxShadow: isDark ? "none" : "0 2px 4px rgba(0,0,0,0.05)", borderRadius: "16px" } as React.CSSProperties,
    glassHover: { background: isDark ? "rgba(255,255,255,0.07)" : "#ffffff", border: isDark ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(16,185,129,0.5)", borderRadius: "16px", boxShadow: isDark ? "0 0 20px rgba(16,185,129,0.1)" : "0 4px 12px rgba(16,185,129,0.2)" } as React.CSSProperties,
    gradientText: { background: "linear-gradient(135deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" } as React.CSSProperties,
    bottomNav: { position: "fixed" as const, bottom: 0, left: 0, right: 0, background: isDark ? "rgba(15,15,26,0.95)" : "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0", zIndex: 100 } as React.CSSProperties,
    navItem: (active: boolean) => ({ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "2px", padding: "6px 16px", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease", background: active ? (isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)") : "transparent", color: active ? "#10b981" : "#71717a", fontSize: "0.7rem", fontWeight: active ? "700" : "500", border: "none" }),
    badge: { position: "absolute" as const, top: "-4px", right: "-4px", background: "linear-gradient(135deg, #ef4444, #f97316)", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" } as React.CSSProperties,
    primaryBtn: { background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", padding: "12px 28px", borderRadius: "12px", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s ease", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" } as React.CSSProperties,
    secondaryBtn: { background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)", color: isDark ? "#d4d4d8" : "#374151", padding: "10px 20px", borderRadius: "12px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s ease" } as React.CSSProperties,
    statusBadge: (status: string) => ({ display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "0.5px", background: status === "paid" ? (isDark ? "rgba(74,222,128,0.15)" : "rgba(34,197,94,0.1)") : status === "completed" ? (isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)") : (isDark ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.1)"), color: status === "paid" ? (isDark ? "#4ade80" : "#15803d") : status === "completed" ? (isDark ? "#3b82f6" : "#1d4ed8") : (isDark ? "#eab308" : "#b45309"), border: `1px solid ${status === "paid" ? (isDark ? "rgba(74,222,128,0.3)" : "rgba(34,197,94,0.2)") : status === "completed" ? (isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)") : (isDark ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)")}` }),
  };
};

type TabType = "menu" | "cart" | "history" | "chat";

interface OrderHistory {
  id: string;
  table_id: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total_amount: number;
  status: string;
  created_at: string;
}
function CustomerOrderContent() {
  const searchParams = useSearchParams();
  const [tableId, setTableId] = useState("");

  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("menu");
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // States for Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [nickname, setNickname] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isChangingNickname, setIsChangingNickname] = useState(false);
  const [newNicknameInput, setNewNicknameInput] = useState("");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ [nickname: string]: number }>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, activeTab]);

  // States for Menu
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<string[]>(["Tất cả"]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme as 'dark' | 'light');
    }
  }, []);

  useEffect(() => {
    const fetchMenuData = async () => {
      setMenuLoading(true);
      try {
        const { data: prodData, error: prodErr } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
        const { data: catData, error: catErr } = await supabase.from("categories").select("name");
        if (prodErr || catErr) throw prodErr || catErr;
        if (prodData) {
          const mappedProducts = prodData.map((p: any) => ({ id: p.slug || String(p.id), name: p.name, price: Number(p.price), category: p.categories?.name || "Khác", image: p.image_url || "https://via.placeholder.com/400", description: p.description || "", ingredients: Array.isArray(p.ingredients) ? p.ingredients : [] }));
          setMenuItems(mappedProducts);
        }
        if (catData) {
          const catNames = catData.map((c: any) => c.name);
          setMenuCategories(["Tất cả", ...catNames]);
        }
      } catch (error: any) {
        console.error("Lỗi khi tải thực đơn:", error.message);
        toast.error("Không thể tải thực đơn từ hệ thống!");
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenuData();
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const fetchHistory = useCallback(async () => {
    if (!tableId) return;
    setHistoryLoading(true);
    try {
      const { data: resetData } = await supabase.from("table_resets").select("reset_at").eq("table_id", tableId).order("reset_at", { ascending: false }).limit(1).single();
      let query = supabase.from("orders").select("*").eq("table_id", tableId).order("created_at", { ascending: false }).limit(20);
      if (resetData?.reset_at) {
        query = query.gt("created_at", resetData.reset_at);
      }
      const { data, error } = await query;
      if (!error && data) {
        setOrderHistory(data as OrderHistory[]);
      }
    } catch (e) {
      console.error("Lỗi lấy lịch sử:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    const channel = supabase.channel("customer-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
      if (payload.eventType === "UPDATE") {
        const updated = payload.new as OrderHistory;
        setOrderHistory((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        if (orderCreated && orderCreated.id === updated.id && updated.status === "paid") {
          setOrderCreated({ ...orderCreated, status: "paid" });
        }
      } else if (payload.eventType === "INSERT") {
        const newOrder = payload.new as OrderHistory;
        if (newOrder.table_id === tableId) {
          setOrderHistory((prev) => [newOrder, ...prev]);
        }
      } else if (payload.eventType === "DELETE") {
        const deletedOrder = payload.old as { id?: string; table_id?: string };
        if (deletedOrder?.id) {
          setOrderHistory((prev) => prev.filter((o) => o.id !== deletedOrder.id));
          if (orderCreated && orderCreated.id === deletedOrder.id) {
            setOrderCreated(null);
          }
        } else {
          fetchHistory();
          if (orderCreated) {
            supabase.from("orders").select("id").eq("id", orderCreated.id).single().then(({ data }) => {
              if (!data) setOrderCreated(null);
            });
          }
        }
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableId, orderCreated, fetchHistory]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  useEffect(() => {
    const table = searchParams.get("table");
    if (table) {
      setTableId(table);
    }
  }, [searchParams]);

  useEffect(() => {
    const savedNickname = localStorage.getItem("chat_nickname");
    if (savedNickname) {
      setNickname(savedNickname);
      setNewNicknameInput(savedNickname);
    } else {
      const animals = ["Mèo", "Gấu", "Thỏ", "Cáo", "Sóc", "Nai", "Hổ", "Sư Tử", "Khỉ", "Panda", "Koala", "Cú", "Rùa"];
      const colors = ["Hồng", "Xanh", "Đỏ", "Vàng", "Tím", "Cam", "Xám", "Trắng", "Đen", "Nâu", "Bạc", "Vàng Gold"];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomNum = Math.floor(Math.random() * 900) + 100;
      const defaultNickname = `Bàn ${tableId || "?"} - ${randomAnimal} ${randomColor} #${randomNum}`;
      setNickname(defaultNickname);
      setNewNicknameInput(defaultNickname);
      localStorage.setItem("chat_nickname", defaultNickname);
    }
  }, [tableId]);

  useEffect(() => {
    const loadMessages = async () => {
      const msgs = await getMessages();
      setMessages(msgs);
    };
    loadMessages();
  }, []);

  useEffect(() => {
    const channel = supabase.channel("chat-room");
    channel.on("broadcast", { event: "new-message" }, (payload: any) => {
      const newMsg = payload.payload as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (activeTab !== "chat") {
        setChatUnreadCount((c) => c + 1);
      }
    }).on("broadcast", { event: "typing" }, (payload: any) => {
      const { nickname: typingNickname } = payload.payload;
      if (typingNickname !== nickname) {
        setTypingUsers((prev) => ({ ...prev, [typingNickname]: Date.now() }));
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab, nickname]);

  useEffect(() => {
    if (activeTab === "chat") {
      setChatUnreadCount(0);
    }
    const typingCleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const updatedTypingUsers: { [nickname: string]: number } = {};
        let changed = false;
        for (const user in prev) {
          if (now - prev[user] < 3000) {
            updatedTypingUsers[user] = prev[user];
          } else {
            changed = true;
          }
        }
        return changed ? updatedTypingUsers : prev;
      });
    }, 3000);
    return () => { clearInterval(typingCleanupInterval); };
  }, [activeTab]);

  const lastTypingEventSent = useRef(0);

  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingEventSent.current > 2000) {
      supabase.channel("chat-room").send({ type: "broadcast", event: "typing", payload: { nickname } });
      lastTypingEventSent.current = now;
    }
  };

  const handleSendMessage = async (content: { text?: string, imageUrl?: string }) => {
    if ((!content.text || !content.text.trim()) && !content.imageUrl) return;
    const res = await sendMessage(nickname, content);
    if (res.success && res.message) {
      const newMsg = res.message as Message;
      setMessages((prev) => [...prev, newMsg]);
      await supabase.channel("chat-room").send({ type: "broadcast", event: "new-message", payload: newMsg });
    } else {
      toast.error(res.error || "Không thể gửi tin nhắn");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const currentInput = chatInput;
    setChatInput("");
    await handleSendMessage({ text: currentInput });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB.");
      return;
    }
    setIsUploadingImage(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from("chat_images").upload(fileName, file);
    setIsUploadingImage(false);
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("chat_images").getPublicUrl(data.path);
    await handleSendMessage({ imageUrl: publicUrl });
  };

  const handleSaveNickname = () => {
    if (!newNicknameInput.trim()) return;
    setNickname(newNicknameInput.trim());
    localStorage.setItem("chat_nickname", newNicknameInput.trim());
    setIsChangingNickname(false);
    toast.success("Đã cập nhật biệt danh!");
  };

  const addToCart = (id: string) => { setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 })); };
  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[id] > 1) { updated[id]--; } else { delete updated[id]; }
      return updated;
    });
  };
  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!tableId.trim()) { toast.error("Vui lòng nhập hoặc quét đúng số bàn của bạn!"); return; }
    if (Object.keys(cart).length === 0) { toast.error("Giỏ hàng của bạn đang trống!"); return; }
    setLoading(true);
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return { name: item?.name || id, quantity: qty, price: item?.price || 0 };
    });
    const totalAmount = getCartTotal();
    try {
      const { data, error } = await supabase.from("orders").insert({ table_id: tableId, items: orderItems, total_amount: totalAmount, status: "pending" }).select().single();
      if (error) throw error;
      setOrderCreated(data);
      setCart({});
    } catch (e: any) {
      toast.error("Đặt món không thành công: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getVietQRUrl = () => {
    if (!orderCreated) return "";
    const bankId = "vietcombank";
    const accountNo = "0351001065271";
    const template = "qr_only";
    const amount = orderCreated.total_amount;
    const description = encodeURIComponent(`BAN${orderCreated.table_id} ${orderCreated.id.slice(0, 8).toUpperCase()}`);
    const accountName = encodeURIComponent("DO MINH CUONG");
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${description}&accountName=${accountName}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  };

  const currentStyles = getStyles(theme);
  return (
    <div style={currentStyles.page}>
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' }, duration: 5000 }} containerStyle={{ bottom: 120 }} />
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 16px", position: "relative" }}>

      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "25px", paddingBottom: "15px" }}>
        <button onClick={toggleTheme} style={{ position: "absolute", top: "20px", left: "20px", background: currentStyles.glass.background, border: currentStyles.glass.border, color: currentStyles.page.color, padding: "8px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", zIndex: 10, }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div style={{ fontSize: "2.5rem", marginBottom: "5px", filter: "drop-shadow(0 0 10px rgba(74,222,128,0.3))" }}>☕</div>
        <h1 style={{ ...currentStyles.gradientText, margin: "5px 0", fontSize: "1.8rem", letterSpacing: "-0.5px", fontWeight: "800" }}>Cường Coffee & Tea</h1>
        <p style={{ color: "#71717a", margin: "5px 0 0", fontSize: "0.85rem" }}>Thức uống tươi ngon — Phục vụ tận bàn</p>
        {tableId && ( <div style={{ display: "inline-block", marginTop: "10px", ...currentStyles.glass, padding: "6px 16px", borderRadius: "20px", color: "#4ade80", fontSize: "0.85rem", fontWeight: "600", border: "1px solid rgba(16,185,129,0.3)", }}> 📍 Bàn số {tableId} </div> )}
      </header>

      {/* ========== TAB: MENU ========== */}
      {activeTab === "menu" && !orderCreated && (
        <div>
          {!searchParams.get("table") && ( <div style={{ marginBottom: "20px", ...currentStyles.glass, padding: "15px" }}> <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#a1a1aa" }}>Nhập số bàn của bạn:</label> <input type="text" placeholder="Ví dụ: 1, 2, 5..." value={tableId} onChange={(e) => setTableId(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", boxSizing: "border-box", fontSize: "1rem", outline: "none", }} /> </div> )}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", paddingRight: "24px", marginBottom: "20px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)', }}>
            {menuCategories.map((cat) => ( <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.82rem", whiteSpace: "nowrap", transition: "all 0.2s ease", background: activeCategory === cat ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.06)", color: activeCategory === cat ? "#fff" : "#a1a1aa", boxShadow: activeCategory === cat ? "0 2px 10px rgba(16,185,129,0.3)" : "none", }} > {cat === "Tất cả" ? "🍽️ Tất cả" : cat === "Cà phê" ? "☕ Cà phê" : cat === "Trà trái cây" ? "🍑 Trà trái cây" : cat === "Trà sữa" ? "🧋 Trà sữa" : "🍊 Nước ép"} </button> ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "30px" }}>
            {menuLoading ? ( <p style={{ color: "#a1a1aa", gridColumn: "span 2", textAlign: "center", padding: "20px" }}>⏳ Đang tải thực đơn...</p> ) : ( menuItems.filter((item) => activeCategory === "Tất cả" || item.category === activeCategory) .map((item) => (
              <div key={item.id} onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} style={{ ...(cart[item.id] ? currentStyles.glassHover : currentStyles.glass), overflow: "hidden", cursor: "pointer", transition: "all 0.25s ease", transform: expandedItem === item.id ? "scale(1.02)" : "scale(1)", }} >
                <div style={{ position: "relative", width: "100%", paddingTop: "75%", overflow: "hidden" }}> <img src={item.image} alt={item.name} loading="lazy" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease", }} /> {cart[item.id] && ( <div style={{ ...currentStyles.badge, top: "8px", right: "8px", width: "26px", height: "26px", background: "linear-gradient(135deg, #10b981, #059669)" }}> {cart[item.id]} </div> )} <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,0,0,0.6)", color: "#d4d4d8", padding: "3px 8px", borderRadius: "10px", fontSize: "0.68rem", backdropFilter: "blur(4px)" }}> {item.category} </div> </div>
                <div style={{ padding: "10px 12px 12px" }}> <span style={{ fontSize: "0.65rem", color: theme === 'dark' ? "#a1a1aa" : "#6b7280", textTransform: "uppercase" }}>{item.category}</span> <h4 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", color: theme === 'dark' ? "#e4e4e7" : "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", }}>{item.name}</h4> <p style={{ margin: "0 0 8px 0", color: theme === 'dark' ? "#a1a1aa" : "#000000", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", height: "calc(0.72rem * 1.4 * 3)" }}> {item.description} </p>
                  {expandedItem === item.id && ( <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "8px 10px", marginBottom: "10px", fontSize: "0.72rem", color: "#a1a1aa" }}> <div style={{ fontWeight: "bold", color: "#d4d4d8", marginBottom: "4px" }}>🧾 Thành phần:</div> {item.ingredients.map((ing: string, idx: number) => ( <span key={idx} style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "8px", margin: "2px 3px", fontSize: "0.68rem" }}> {ing} </span> ))} </div> )}
                  <div style={{ marginTop: "8px" }}> <div style={{ marginBottom: "8px" }}> <span style={{ ...currentStyles.gradientText, fontWeight: "800", fontSize: "1rem" }}> {item.price.toLocaleString("vi-VN")}đ </span> </div> <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}> {cart[item.id] ? ( <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "20px" }}> <button onClick={() => removeFromCart(item.id)} style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "#fff", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", boxShadow: "0 2px 6px rgba(239,68,68,0.2)" }}>−</button> <span style={{ minWidth: "20px", textAlign: "center", fontWeight: "bold", fontSize: "0.9rem" }}>{cart[item.id]}</span> <button onClick={() => addToCart(item.id)} style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", color: "#fff", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", boxShadow: "0 2px 6px rgba(59,130,246,0.2)" }}>+</button> </div> ) : ( <button onClick={(e) => { e.stopPropagation(); addToCart(item.id); }} style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.78rem", width: "100%", boxShadow: "0 2px 8px rgba(16,185,129,0.2)", }}>+ Thêm</button> )} </div> </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* ========== TAB: CART ========== */}
      {activeTab === "cart" && !orderCreated && ( <div> <h2 style={{ ...currentStyles.gradientText, fontSize: "1.4rem", textAlign: "center", marginBottom: "20px", fontWeight: "800" }}>🛒 Giỏ hàng của bạn</h2> {cartCount === 0 ? ( <div style={{ ...currentStyles.glass, padding: "40px 20px", textAlign: "center" }}> <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🍃</div> <p style={{ color: "#71717a", fontSize: "0.95rem" }}>Giỏ hàng đang trống</p> <button onClick={() => setActiveTab("menu")} style={{ ...currentStyles.primaryBtn, marginTop: "15px" }}>Xem Menu</button> </div> ) : ( <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}> {Object.entries(cart).map(([id, qty]) => { const item = menuItems.find((m) => m.id === id); if (!item) return null; return ( <div key={id} style={{ ...currentStyles.glass, padding: "12px 15px", display: "flex", alignItems: "center", gap: "12px" }}> <img src={item.image} alt={item.name} style={{ width: "55px", height: "55px", borderRadius: "10px", objectFit: "cover" }} /> <div style={{ flex: 1 }}> <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{item.name}</div> <div style={{ ...currentStyles.gradientText, fontWeight: "bold", fontSize: "0.85rem" }}>{(item.price * qty).toLocaleString("vi-VN")}đ</div> </div> <div style={{ display: "flex", alignItems: "center", gap: "8px" }}> <button onClick={() => removeFromCart(id)} style={{ width: "30px", height: "30px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button> <span style={{ minWidth: "24px", textAlign: "center", fontWeight: "bold", fontSize: "1rem" }}>{qty}</span> <button onClick={() => addToCart(id)} style={{ width: "30px", height: "30px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button> </div> </div> ); })} <div style={{ ...currentStyles.glass, padding: "16px", marginTop: "10px" }}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}> <span style={{ color: "#a1a1aa", fontSize: "0.9rem" }}>Tổng cộng ({cartCount} món)</span> <span style={{ ...currentStyles.gradientText, fontSize: "1.4rem", fontWeight: "800" }}>{getCartTotal().toLocaleString("vi-VN")}đ</span> </div> <button onClick={handleCheckout} disabled={loading} style={{ ...currentStyles.primaryBtn, width: "100%", padding: "14px" }}> {loading ? "⏳ Đang gửi..." : "🧾 Xác nhận đặt món"} </button> </div> </div> )} </div> )}

      {/* ========== TAB: HISTORY (Lịch sử) ========== */}
      {activeTab === "history" && !orderCreated && (
        <div>
          <h2 style={{ ...currentStyles.gradientText, fontSize: "1.4rem", textAlign: "center", marginBottom: "20px", fontWeight: "800" }}>📜 Lịch sử đơn hàng</h2>
          {!tableId ? (
            <div style={{ ...currentStyles.glass, padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "#71717a" }}>Vui lòng nhập số bàn để xem lịch sử.</p>
            </div>
          ) : historyLoading ? (
            <div style={{ ...currentStyles.glass, padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "#a1a1aa" }}>⏳ Đang tải lịch sử...</p>
            </div>
          ) : orderHistory.length === 0 ? (
            <div style={{ ...currentStyles.glass, padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px" }}>📋</div>
              <p style={{ color: "#71717a", fontSize: "0.95rem" }}>Chưa có đơn hàng nào tại bàn này</p>
              <button onClick={() => setActiveTab("menu")} style={{ ...currentStyles.primaryBtn, marginTop: "15px" }}>Đặt món ngay</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {orderHistory.map((order) => {
                const totalItemsInOrder = Array.isArray(order.items) ? order.items.reduce((sum: number, it: any) => sum + it.quantity, 0) : 0;
                return (
                <div
                  key={order.id}
                  style={{
                    ...currentStyles.glass,
                    padding: "16px",
                    transition: "all 0.2s ease",
                    cursor: "default",
                    ...(order.status === "pending" ? { border: "1px solid rgba(234,179,8,0.3)" } : {}),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#71717a" }}>Mã đơn: </span>
                      <code style={{
                        color: order.status === "pending" ? "#eab308" : "#22d3ee",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        textDecoration: order.status === "pending" ? "underline" : "none",
                      }}>{order.id.slice(0, 8).toUpperCase()}</code>
                    </div>
                    <span style={currentStyles.statusBadge(order.status)}>
                      {order.status === "paid" ? "✅ Đã thanh toán" : order.status === "completed" ? "🎉 Hoàn thành" : "⏳ Chờ thanh toán"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "8px" }}>
                    {Array.isArray(order.items) && order.items.map((it: any, idx: number) => (
                      <span key={idx}>{it.name} x{it.quantity}{idx < order.items.length - 1 ? ", " : ""}</span>
                    ))}
                  </div>
                  {/* Thêm Tổng số món và Tổng tiền */} 
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#d4d4d8", marginBottom: "5px" }}>
                    <span>Tổng số món:</span>
                    <span>{Array.isArray(order.items) ? order.items.reduce((sum: number, it: any) => sum + it.quantity, 0) : 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#71717a" }}>🕐 {formatTime(order.created_at)}</span>
                    <span style={{ ...currentStyles.gradientText, fontWeight: "bold", fontSize: "1rem" }}>{order.total_amount.toLocaleString("vi-VN")}đ</span>
                  </div>
                  {order.status === "pending" && (
                    <div
                      onClick={() => setOrderCreated(order)}
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer", // Thêm cursor: pointer vào đây
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", color: "#eab308" }}>
                        💳 Bấm đơn để thanh toán
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(order.id);
                        }}
                        style={{
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          textDecoration: "underline",
                        }}
                      >
                        🗑️ Hủy đơn
                      </span>
                    </div>
                  )}
                </div>
                );
              })}
              {/* Phần tổng kết */} 
              {(() => {
                const totalPaidItems = orderHistory.reduce((sum, order) => {
                  if (order.status === 'paid') {
                    return sum + (Array.isArray(order.items) ? order.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) : 0);
                  }
                  return sum;
                }, 0);
                const totalPaidAmount = orderHistory.reduce((sum, order) => {
                  if (order.status === 'paid') {
                    return sum + order.total_amount;
                  }
                  return sum;
                }, 0);

                if (totalPaidItems > 0 || totalPaidAmount > 0) {
                  return (
                    <div style={{ ...currentStyles.glass, padding: "16px", marginTop: "20px" }}>
                      <h3 style={{ ...currentStyles.gradientText, fontSize: "1.2rem", marginBottom: "15px", fontWeight: "800", textAlign: "center" }}>Tổng kết đã thanh toán</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ color: "#a1a1aa", fontSize: "0.9rem" }}>Tổng số món đã order:</span>
                        <span style={{ color: "#e4e4e7", fontWeight: "bold" }}>{totalPaidItems}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#a1a1aa", fontSize: "0.9rem" }}>Tổng tiền đã thanh toán:</span>
                        <span style={{ ...currentStyles.gradientText, fontSize: "1.3rem", fontWeight: "800" }}>{totalPaidAmount.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB CHAT CHUNG (No SQL, Tự xóa sau 1 ngày) ========== */}
      {activeTab === "chat" && !orderCreated && (
        <div style={{ ...currentStyles.glass, padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: "450px" }}>
          {/* Chat Header: Nickname settings */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>Biệt danh của bạn trong quán:</div>
              {isChangingNickname ? (
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input
                    type="text"
                    value={newNicknameInput}
                    onChange={(e) => setNewNicknameInput(e.target.value)}
                    placeholder="Nhập biệt danh mới..."
                    maxLength={30}
                    style={{
                      flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px", padding: "6px 12px", color: "#fff", fontSize: "0.85rem", outline: "none"
                    }}
                  />
                  <button onClick={handleSaveNickname} style={{ background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer" }}>Lưu</button>
                  <button onClick={() => { setIsChangingNickname(false); setNewNicknameInput(nickname); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", cursor: "pointer" }}>Hủy</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontWeight: "bold", color: "#22d3ee", fontSize: "0.95rem" }}>{nickname}</span>
                  <button onClick={() => setIsChangingNickname(true)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: "0.9rem" }} title="Đổi biệt danh">✏️</button>
                </div>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#71717a", textAlign: "right" }}>
              💬 Chat chung<br/>🗑️ Tự xóa sau 24h
            </div>
          </div>

          {/* Chat Messages Area (Scrollable) */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px", marginBottom: "8px" }}>
            {messages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#71717a", fontSize: "0.85rem" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>💬</span>
                Hãy là người đầu tiên gửi lời chào!<br/>Mọi người trong quán sẽ thấy tin nhắn này.
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === nickname;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {/* Tên người gửi */}
                    <span style={{ fontSize: "0.7rem", color: isMe ? "#22d3ee" : "#a1a1aa", marginBottom: "3px", marginLeft: isMe ? "0" : "6px", marginRight: isMe ? "6px" : "0" }}>
                      {msg.sender}
                    </span>
                    {/* Bong bóng chat */}
                    <div style={{
                      maxWidth: "80%",
                      background: isMe ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      padding: msg.imageUrl ? "4px" : "10px 14px", // Giảm padding nếu là ảnh
                      borderRadius: isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      fontSize: "0.88rem",
                      lineHeight: "1.4",
                      wordBreak: "break-word",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}>
                      {msg.imageUrl ? (
                        <img
                          src={msg.imageUrl}
                          alt="Ảnh chat"
                          style={{ maxWidth: "100%", borderRadius: "14px", display: "block" }}
                        />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: (msg.text || "").replace(/\[YAHOO:([^\]]+)\]/g, '<img src="/yahoo_icons/$1" style="width:24px; height:24px; display:inline-block; vertical-align:middle; margin:0 2px;" />') }} />
                      )}
                    </div>
                    {/* Thời gian */}
                    <span style={{ fontSize: "0.6rem", color: "#52525b", marginTop: "3px", marginLeft: isMe ? "0" : "6px", marginRight: isMe ? "6px" : "0" }}>
                      {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          <div style={{ height: "18px", marginBottom: "5px" }}>
            {Object.keys(typingUsers).length > 0 && (
              <span style={{ color: "#a1a1aa", fontSize: "0.75rem", fontStyle: "italic", animation: "fadeIn 0.5s" }}>
                {Object.keys(typingUsers).slice(0, 2).join(", ")}
                {Object.keys(typingUsers).length > 2 ? ` và ${Object.keys(typingUsers).length - 2} người khác` : ''}
                {' đang nhập...✍️'}
              </span>
            )}
          </div>

          {/* Bảng chọn Emoji nhanh */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "10px", marginBottom: "10px" }}>
            {["❤️", "😂", "👍", "🙏", "🎉", "😮", "😍", "😢", "🤔", "👏"].map(emoji => (
              <button
                key={emoji}
                onClick={() => setChatInput(prev => prev + emoji)}
                title={`Thêm icon ${emoji} vào tin nhắn`}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "6px", cursor: "pointer", fontSize: "1.1rem" }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <YahooIcons onSend={(text) => setChatInput(prev => prev + text)} />
          <form onSubmit={handleFormSubmit} style={{ display: "flex", gap: "10px" }}>
            {/* Nút Upload ảnh */}
            <label htmlFor="image-upload" style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer"
            }}>
              {isUploadingImage ? "⏳" : "📎"}
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              disabled={isUploadingImage}
            />

            <input
              type="text"
              value={chatInput}
              onChange={(e) => { setChatInput(e.target.value); handleTyping(); }}
              onKeyDown={handleTyping}
              placeholder="Nhập tin nhắn với quán..."
              maxLength={200}
              style={{
                flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px", padding: "12px 16px", color: "#fff", fontSize: "0.9rem", outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isUploadingImage}
              style={{
                background: chatInput.trim() ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
                border: "none", color: chatInput.trim() ? "#fff" : "#52525b",
                width: "44px", height: "44px", borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: chatInput.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s ease"
              }}
            >
              {isUploadingImage ? "⏳" : "🚀"}
            </button>
          </form>
        </div>
      )}

      {/* ========== THANH TOÁN (sau khi đặt thành công) ========== */}
      {orderCreated && (
        <div style={{ ...currentStyles.glass, padding: "25px", textAlign: "center" }}>
          {orderCreated.status === "paid" ? (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>✅</div>
              <h2 style={{ ...currentStyles.gradientText, fontSize: "1.5rem", fontWeight: "800" }}>Thanh toán thành công!</h2>
              <p style={{ color: "#a1a1aa", margin: "10px 0" }}>Đơn hàng của bạn đã được xác nhận. Cảm ơn bạn!</p>
              <button onClick={() => { setOrderCreated(null); setActiveTab("menu"); }} style={{ ...currentStyles.primaryBtn, marginTop: "15px" }}>Đặt thêm món</button>
            </>
          ) : (
            <>
          <h2 style={{ ...currentStyles.gradientText, fontSize: "1.5rem", fontWeight: "800" }}>🎉 Đặt món thành công!</h2>
          <p style={{ color: "#a1a1aa", margin: "10px 0" }}>Mã hóa đơn: <code style={{ color: "#22d3ee", fontWeight: "600" }}>{orderCreated.id.slice(0, 8).toUpperCase()}</code></p>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "15px 0", color: "#e4e4e7" }}>
            Số tiền cần thanh toán: <span style={{ color: "#10b981" }}>{orderCreated.total_amount.toLocaleString("vi-VN")}đ</span>
          </div>

          <div style={{ margin: "20px 0" }}>
            <p style={{ color: "#f59e0b", fontSize: "0.9rem", marginBottom: "10px" }}>
              * Quét mã QR bên dưới qua App Ngân hàng để thanh toán tự động:
            </p>
            <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", display: "inline-block" }}>
              <img
                src={getVietQRUrl()}
                alt="VietQR Vietcombank"
                style={{ width: "240px", height: "240px", display: "block" }}
              />
            </div>

            {/* Thông tin chuyển khoản thủ công (cho máy hỏng cam) */}
            <div style={{
              marginTop: "15px",
              background: "#27272a",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "left"
            }}>
              <div style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "bold", marginBottom: "10px", textAlign: "center" }}>
                📱 Hoặc chuyển khoản thủ công:
              </div>
              <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#71717a", whiteSpace: "nowrap" }}>🏦 Ngân hàng:</td>
                    <td style={{ padding: "6px 0", color: "#e4e4e7", fontWeight: "bold", textAlign: "right" }}>Vietcombank (VCB)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#71717a", whiteSpace: "nowrap" }}>📋 Số tài khoản:</td>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>
                      <span
                        onClick={() => { navigator.clipboard.writeText("0351001065271"); toast.success("Đã copy số tài khoản!"); }}
                        style={{
                          color: "#4ade80",
                          fontWeight: "bold",
                          fontSize: "1.05rem",
                          cursor: "pointer",
                          letterSpacing: "1px",
                          borderBottom: "1px dashed #4ade80"
                        }}
                      >
                        0351001065271
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#71717a", whiteSpace: "nowrap" }}>👤 Chủ TK:</td>
                    <td style={{ padding: "6px 0", color: "#e4e4e7", fontWeight: "bold", textAlign: "right" }}>DUONG VAN CUONG</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#71717a", whiteSpace: "nowrap" }}>💰 Số tiền:</td>
                    <td style={{ padding: "6px 0", color: "#10b981", fontWeight: "bold", fontSize: "1.1rem", textAlign: "right" }}>
                      {orderCreated.total_amount.toLocaleString("vi-VN")}đ
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#71717a", whiteSpace: "nowrap" }}>📝 Nội dung:</td>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>
                      <span
                        onClick={() => { navigator.clipboard.writeText(`BAN${orderCreated.table_id} ${orderCreated.id.slice(0, 8).toUpperCase()}`); toast.success("Đã copy nội dung CK!"); }}
                        style={{
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          cursor: "pointer",
                          background: "#3f3f46",
                          padding: "4px 10px",
                          borderRadius: "4px"
                        }}
                      >
                        BAN{orderCreated.table_id} {orderCreated.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#71717a", textAlign: "center" }}>
                💡 Bấm vào số tài khoản hoặc nội dung CK để copy nhanh
              </p>
            </div>
          </div>

          <p style={{ color: "#3b82f6", fontSize: "0.9rem", marginTop: "15px" }}>
            🔄 Đang chờ hệ thống ngân hàng xác nhận giao dịch...
          </p>

          <button
            onClick={() => { setOrderCreated(null); setActiveTab("menu"); }}
            style={{ ...currentStyles.secondaryBtn, marginTop: "15px" }}
          >
            Quay lại Menu gọi thêm món
          </button>
            </>
          )}
        </div>
      )}

      </div>{/* end max-width container */}

      {/* ========== MODAL XÁC NHẬN HỦY ĐƠN ========== */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 9999,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme === 'dark' ? "#1e1e24" : "#ffffff",
              borderRadius: "20px",
              padding: "35px 30px",
              textAlign: "center",
              maxWidth: "380px",
              width: "90%",
              border: theme === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              animation: "slideUp 0.3s ease",
            }}
          >
            {/* Icon cảnh báo lớn */}
            <div style={{
              width: "70px", height: "70px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              border: "2px solid rgba(239, 68, 68, 0.3)",
            }}>
              <span style={{ fontSize: "2.5rem" }}>⚠️</span>
            </div>

            <h3 style={{
              color: theme === 'dark' ? "#fff" : "#111",
              margin: "0 0 10px 0",
              fontSize: "1.3rem",
              fontWeight: "800",
            }}>Xác nhận hủy đơn?</h3>

            <p style={{
              color: theme === 'dark' ? "#a1a1aa" : "#6b7280",
              marginBottom: "25px",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}>
              Đơn hàng sẽ bị xóa vĩnh viễn.<br/>
              Bạn không thể hoàn tác thao tác này.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: theme === 'dark' ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
                  backgroundColor: theme === 'dark' ? "rgba(255,255,255,0.06)" : "#f3f4f6",
                  color: theme === 'dark' ? "#d4d4d8" : "#374151",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                ✋ Giữ lại
              </button>
              <button
                onClick={async () => {
                  const orderId = confirmDelete;
                  setConfirmDelete(null);
                  const toastId = toast.loading("Đang hủy đơn...");
                  const res = await deletePendingOrder(orderId);
                  if (res.success) {
                    toast.success("✅ Hủy đơn thành công!", { id: toastId });
                    setOrderHistory((prev) => prev.filter((o) => o.id !== orderId));
                  } else {
                    toast.error("❌ Hủy thất bại: " + res.error, { id: toastId });
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                🗑️ Hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation cho Modal */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ========== BOTTOM NAVIGATION ========== */}
      <nav style={currentStyles.bottomNav}>
        <button onClick={() => { setActiveTab("menu"); setOrderCreated(null); }} style={currentStyles.navItem(activeTab === "menu" && !orderCreated)}>
          <span style={{ fontSize: "1.3rem" }}>📋</span>
          <span>Menu</span>
        </button>
        <button onClick={() => { setActiveTab("cart"); setOrderCreated(null); }} style={{ ...currentStyles.navItem(activeTab === "cart" && !orderCreated), position: "relative" as const }}>
          <span style={{ fontSize: "1.3rem", position: "relative" as const }}>
            🛒
            {cartCount > 0 && <span style={currentStyles.badge}>{cartCount}</span>}
          </span>
          <span>Giỏ hàng</span>
        </button>
        <button onClick={() => { setActiveTab("history"); setOrderCreated(null); }} style={currentStyles.navItem(activeTab === "history" && !orderCreated)}>
          <span style={{ fontSize: "1.3rem" }}>📜</span>
          <span>Lịch sử</span>
        </button>
        <button onClick={() => { setActiveTab("chat"); setOrderCreated(null); }} style={{ ...currentStyles.navItem(activeTab === "chat" && !orderCreated), position: "relative" as const }}>
          <span style={{ fontSize: "1.3rem", position: "relative" as const }}>
            💬
            {chatUnreadCount > 0 && <span style={currentStyles.badge}>{chatUnreadCount}</span>}
          </span>
          <span>Chat</span>
        </button>
      </nav>
    </div>
  );
}

export default function CustomerOrderPage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff", padding: "20px" }}>Đang tải menu...</div>}>
      <CustomerOrderContent />
    </Suspense>
  );
}

