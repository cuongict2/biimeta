"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { updateOrderStatusToPaid, syncVCBTransactions, getAdminSession, logoutAdmin } from "./actions";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  table_id: string;
  items: Array<{ name: string; quantity: number; price: number }> | any;
  total_amount: number;
  status: "pending" | "paid" | "completed";
  created_at: string;
}

// Helper: Thời gian tương đối
const timeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

type FilterType = "all" | "pending" | "paid" | "completed";

export default function CoffeeOrderDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [syncing, setSyncing] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmResetTable, setConfirmResetTable] = useState<string | null>(null);
  const [resettingTable, setResettingTable] = useState(false);
  const [tableResets, setTableResets] = useState<{ [tableId: string]: string }>({}); // tableId -> reset_at

  const TOTAL_TABLES = 20;

  // Lấy thông tin admin đang đăng nhập
  useEffect(() => {
    const loadSession = async () => {
      const session = await getAdminSession();
      setAdminUser(session);
    };
    loadSession();
  }, []);

  // Lấy thời gian reset gần nhất của mỗi bàn
  const fetchTableResets = async () => {
    const resets: { [tableId: string]: string } = {};
    for (let i = 1; i <= TOTAL_TABLES; i++) {
      const { data } = await supabase
        .from("table_resets")
        .select("reset_at")
        .eq("table_id", String(i))
        .order("reset_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.reset_at) resets[String(i)] = data.reset_at;
    }
    setTableResets(resets);
  };

  useEffect(() => {
    fetchTableResets();
  }, []);

  // Đăng xuất
  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAdmin();
    router.push("/coffee/login");
    router.refresh();
  };

  // 1. Tải danh sách đơn hàng ban đầu
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lỗi lấy đơn hàng:", error.message);
      } else if (data) {
        setOrders(data as Order[]);

      }
      setLoading(false);
    };

    fetchOrders();

    // 2. Kích hoạt Supabase Realtime Lắng nghe bảng `orders` thay đổi
    // Đảm bảo rằng bạn đã Enable Realtime cho bảng `orders` trong database Supabase
    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          console.log("Real-time change detected:", payload);
          
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            setOrders((prev) =>
              prev.map((order) =>
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedOrder = payload.old as { id: string };
            setOrders((prev) =>
              prev.filter((order) => order.id !== deletedOrder.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription khi unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hủy đơn hàng
  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      alert("Lỗi khi hủy đơn: " + error.message);
    }
    setConfirmDelete(null); // Đóng modal
  };

  // Thanh toán nhanh qua Server Action
  const handlePayViaAction = async (orderId: string) => {
    const response = await updateOrderStatusToPaid(orderId);
    if (!response.success) alert("Lỗi: " + response.error);
  };

  // Đồng bộ VCB
  const handleSyncVCB = async () => {
    setSyncing(true);
    try {
      const res = await syncVCBTransactions();
      alert(res.success ? res.message : "Lỗi: " + res.error);
    } catch { alert("Lỗi kết nối!"); }
    setSyncing(false);
  };

  // Thống kê
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const mondayDist = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayDist);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const calc = (start: Date) => {
      const r = orders.filter(o => new Date(o.created_at) >= start);
      return {
        total: r.length,
        pending: r.filter(o => o.status === "pending").length,
        paid: r.filter(o => o.status === "paid" || o.status === "completed").length,
        revenue: r.filter(o => o.status === "paid" || o.status === "completed").reduce((s, o) => s + o.total_amount, 0),
        items: r.filter(o => o.status === "paid" || o.status === "completed").reduce((s, o) => s + (Array.isArray(o.items) ? o.items.reduce((a: number, i: any) => a + i.quantity, 0) : 0), 0),
      };
    };
    return { today: calc(todayStart), week: calc(weekStart), month: calc(monthStart) };
  }, [orders]);

  // Lọc đơn hàng
  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  // Thông tin các bàn
  const tableData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return Array.from({ length: TOTAL_TABLES }, (_, i) => {
      const tableId = String(i + 1);
      const resetAt = tableResets[tableId] ? new Date(tableResets[tableId]) : null;

      // Tất cả đơn của bàn
      const tableOrders = orders.filter(o => o.table_id === tableId);

      // Đơn trong phiên hiện tại (sau reset gần nhất)
      const sessionOrders = resetAt
        ? tableOrders.filter(o => new Date(o.created_at) > resetAt)
        : tableOrders;

      // Đơn trong ngày (không phụ thuộc reset)
      const todayOrders = tableOrders.filter(o => new Date(o.created_at) >= todayStart);

      const pendingOrders = sessionOrders.filter(o => o.status === "pending");
      const paidOrders = sessionOrders.filter(o => o.status === "paid");
      const completedOrders = sessionOrders.filter(o => o.status === "completed");

      // Doanh thu phiên hiện tại
      const sessionRevenue = sessionOrders
        .filter(o => o.status === "paid" || o.status === "completed")
        .reduce((s, o) => s + o.total_amount, 0);

      // Doanh thu trong ngày
      const todayRevenue = todayOrders
        .filter(o => o.status === "paid" || o.status === "completed")
        .reduce((s, o) => s + o.total_amount, 0);

      // Trạng thái dựa trên phiên hiện tại
      let status: "empty" | "pending" | "paid" | "completed" = "empty";
      if (pendingOrders.length > 0) status = "pending";
      else if (paidOrders.length > 0) status = "paid";
      else if (completedOrders.length > 0) status = "completed";

      // Đơn hàng đang hoạt động gần nhất (pending hoặc paid)
      const activeSessionOrders = sessionOrders.filter(o => o.status === "pending" || o.status === "paid");
      const latestActiveOrder = activeSessionOrders.length > 0 ? activeSessionOrders[0] : null;

      return { tableId, status, orderCount: sessionOrders.length, pendingCount: pendingOrders.length, paidCount: paidOrders.length, completedCount: completedOrders.length, sessionRevenue, todayRevenue, latestActiveOrder };
    });
  }, [orders, tableResets]);

  // Reset bàn: KHÔNG xóa đơn, chỉ ghi thời gian reset
  // Trang order khách sẽ chỉ hiển thị đơn sau thời gian reset
  const handleResetTable = async (tableId: string) => {
    setResettingTable(true);
    
    // Ghi thời gian reset vào bảng table_resets
    const { error } = await supabase
      .from("table_resets")
      .insert({ table_id: tableId });
    
    if (error) {
      alert("Lỗi reset bàn: " + error.message);
    } else {
      // Cập nhật lại tableResets
      setTableResets(prev => ({ ...prev, [tableId]: new Date().toISOString() }));
      alert(`Đã reset Bàn ${tableId} thành công! Khách mới sẽ không thấy lịch sử cũ.`);
    }
    setConfirmResetTable(null);
    setResettingTable(false);
  };


  const filterButtons: { label: string; value: FilterType; icon: string; color: string }[] = [
    { label: "Tất cả", value: "all", icon: "📋", color: "#8b5cf6" },
    { label: "Chờ TT", value: "pending", icon: "⏳", color: "#eab308" },
    { label: "Đã TT", value: "paid", icon: "✅", color: "#4ade80" },
    { label: "Hoàn thành", value: "completed", icon: "🎉", color: "#3b82f6" },
  ];

  return (
    <div className="dashboard-container" style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)", color: "#fff" }}>
      {/* CSS Responsive Styles */}
      <style>{`
        .dashboard-container {
          padding: 30px 40px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-wrap: wrap;
          gap: 15px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }
        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .tables-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 20px 15px;
          }
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          .tables-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .tables-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, fontSize: "2rem", fontWeight: 800 }}>☕ Coffee Dashboard</h1>
          <p style={{ color: "#71717a", marginTop: "5px", fontSize: "0.9rem" }}>Giám sát đơn hàng & Thống kê doanh thu Real-time</p>
        </div>
        <div className="header-actions">
          {adminUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", padding: "8px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, color: "#000" }}>
                {adminUser.full_name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e4e4e7" }}>{adminUser.full_name}</div>
                <div style={{ fontSize: "0.7rem", color: "#71717a" }}>{adminUser.role === "admin" ? "Quản trị viên" : "Quản lý"}</div>
              </div>
            </div>
          )}
          <button onClick={handleSyncVCB} disabled={syncing} style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 15px rgba(16,185,129,0.3)", opacity: syncing ? 0.6 : 1 }}>
            {syncing ? "⏳ Đồng bộ..." : "🔄 Đồng bộ VCB"}
          </button>
          <button onClick={handleLogout} disabled={loggingOut} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", opacity: loggingOut ? 0.6 : 1 }}>
            {loggingOut ? "⏳" : "🚪 Đăng xuất"}
          </button>
        </div>
      </header>

      {/* Thẻ thống kê tổng quan */}
      <div className="stats-grid">
        {[
          { label: "Doanh thu hôm nay", value: stats.today.revenue.toLocaleString("vi-VN") + "đ", icon: "💰", color: "#4ade80", sub: `${stats.today.items} món` },
          { label: "Đơn hôm nay", value: stats.today.total, icon: "📦", color: "#3b82f6", sub: `${stats.today.pending} chờ TT` },
          { label: "Doanh thu tuần", value: stats.week.revenue.toLocaleString("vi-VN") + "đ", icon: "📊", color: "#8b5cf6", sub: `${stats.week.total} đơn` },
          { label: "Doanh thu tháng", value: stats.month.revenue.toLocaleString("vi-VN") + "đ", icon: "📈", color: "#f59e0b", sub: `${stats.month.total} đơn` },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", transition: "all 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.8rem", color: "#a1a1aa", fontWeight: 600 }}>{card.label}</span>
              <span style={{ fontSize: "1.5rem" }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, marginBottom: "4px" }}>{card.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#71717a" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Monitor các bàn */}
      <div style={{ marginBottom: "30px" }}>
        <div className="monitor-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>☕</span>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#e4e4e7", fontWeight: 800 }}>Table Monitoring</h2>
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#52525b" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3f3f46", display: "inline-block" }}></span> Trống</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#eab308" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#eab308", display: "inline-block" }}></span> Chờ TT</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4ade80" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }}></span> Đã TT</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#3b82f6" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}></span> Hoàn thành</span>
          </div>
        </div>
        <div className="tables-grid">
          {tableData.map((table) => {
            const isActive = table.status !== "empty";
            const statusColor = table.status === "pending" ? "#eab308" : table.status === "paid" ? "#4ade80" : table.status === "completed" ? "#3b82f6" : "#3f3f46";
            const statusBg = table.status === "pending" ? "rgba(234,179,8,0.1)" : table.status === "paid" ? "rgba(74,222,128,0.1)" : table.status === "completed" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)";
            const statusIcon = table.status === "pending" ? "⏳" : table.status === "paid" ? "💳" : table.status === "completed" ? "✅" : "";
            const statusText = table.status === "empty" ? "Trống" : table.status === "pending" ? `${table.pendingCount} đơn chờ thanh toán` : table.status === "paid" ? `${table.paidCount} đơn đã thanh toán` : `${table.completedCount} đơn hoàn thành`;

            return (
              <div
                key={table.tableId}
                style={{
                  background: statusBg,
                  border: `2px solid ${statusColor}`,
                  borderRadius: "16px",
                  padding: "16px",
                  cursor: "default",
                  transition: "all 0.25s ease",
                  animation: table.status === "pending" ? "pulse 2s infinite" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Header: Số bàn + Icon trạng thái */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: isActive ? statusColor : "rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem", fontWeight: 800,
                      color: isActive ? "#000" : "#52525b",
                    }}>
                      {table.tableId}
                    </div>
                    <span style={{ fontSize: "1.2rem" }}>{statusIcon || "☕"}</span>
                  </div>
                  {isActive && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setConfirmResetTable(table.tableId); }}
                      style={{
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", color: "#ef4444", fontWeight: 800,
                        cursor: "pointer", transition: "all 0.2s ease",
                      }}
                      title="Reset bàn"
                    >
                      ↺
                    </div>
                  )}
                </div>

                {/* Trạng thái */}
                <div style={{ fontSize: "0.78rem", color: isActive ? statusColor : "#52525b", fontWeight: 600, marginBottom: "8px" }}>
                  {statusText}
                </div>

                {/* Doanh thu */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#71717a", marginBottom: "2px" }}>Phiên</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: table.sessionRevenue > 0 ? "#4ade80" : "#3f3f46" }}>
                      {table.sessionRevenue > 0 ? `${(table.sessionRevenue / 1000).toFixed(0)}k` : "—"}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#71717a", marginBottom: "2px" }}>Hôm nay</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: table.todayRevenue > 0 ? "#f59e0b" : "#3f3f46" }}>
                      {table.todayRevenue > 0 ? `${(table.todayRevenue / 1000).toFixed(0)}k` : "—"}
                    </div>
                  </div>
                </div>

                {/* Nút hành động nhanh trên bàn */}
                {table.latestActiveOrder && (
                  <div style={{ marginTop: "10px" }} onClick={(e) => e.stopPropagation()}>
                    {table.latestActiveOrder.status === "pending" ? (
                      <button
                        onClick={() => handlePayViaAction(table.latestActiveOrder!.id)}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          border: "none",
                          color: "#fff",
                          padding: "6px 0",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(16,185,129,0.2)",
                        }}
                      >
                        ✅ Thanh toán
                      </button>
                    ) : table.latestActiveOrder.status === "paid" ? (
                      <button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("orders")
                            .update({ status: "completed" })
                            .eq("id", table.latestActiveOrder!.id);
                          if (error) alert("Lỗi: " + error.message);
                        }}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                          border: "none",
                          color: "#fff",
                          padding: "6px 0",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
                        }}
                      >
                        🎉 Hoàn thành
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Glow effect cho bàn active */}
                {isActive && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
                    opacity: 0.6,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal xác nhận reset bàn */}
      {confirmResetTable && (
        <div onClick={() => setConfirmResetTable(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1e1e24", borderRadius: "20px", padding: "35px 30px", textAlign: "center", maxWidth: "380px", width: "90%", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "2px solid rgba(59,130,246,0.3)" }}>
              <span style={{ fontSize: "2.5rem" }}>☕</span>
            </div>
            <h3 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "1.3rem", fontWeight: 800 }}>Reset Bàn {confirmResetTable}?</h3>
            <p style={{ color: "#a1a1aa", marginBottom: "25px", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Ẩn lịch sử đơn hàng cũ của bàn này.<br/>Khách mới vào sẽ không thấy đơn hàng trước đó.<br/>Dữ liệu vẫn được lưu trữ.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => setConfirmResetTable(null)} style={{ flex: 1, padding: "12px 20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)", color: "#d4d4d8", cursor: "pointer", fontSize: "0.95rem", fontWeight: 700 }}>
                ✋ Hủy
              </button>
              <button onClick={() => handleResetTable(confirmResetTable)} disabled={resettingTable} style={{ flex: 1, padding: "12px 20px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", cursor: "pointer", fontSize: "0.95rem", fontWeight: 700, boxShadow: "0 4px 15px rgba(59,130,246,0.3)", opacity: resettingTable ? 0.6 : 1 }}>
                {resettingTable ? "⏳ Đang reset..." : "↺ Reset bàn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation cho pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Bộ lọc */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {filterButtons.map((btn) => (
          <button key={btn.value} onClick={() => setFilter(btn.value)} style={{ padding: "8px 16px", borderRadius: "20px", border: filter === btn.value ? `2px solid ${btn.color}` : "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontWeight: filter === btn.value ? 700 : 500, fontSize: "0.82rem", background: filter === btn.value ? `${btn.color}22` : "rgba(255,255,255,0.04)", color: filter === btn.value ? btn.color : "#a1a1aa", transition: "all 0.2s ease" }}>
            {btn.icon} {btn.label} {btn.value === "all" ? `(${orders.length})` : `(${orders.filter(o => o.status === btn.value).length})`}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
        {/* Danh sách orders */}
          {loading ? (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "40px", textAlign: "center" }}>
              <p style={{ color: "#a1a1aa" }}>⏳ Đang tải đơn hàng...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📋</div>
              <p style={{ color: "#71717a" }}>Không có đơn hàng nào.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", borderLeft: `4px solid ${order.status === "paid" ? "#4ade80" : order.status === "completed" ? "#3b82f6" : "#eab308"}`, transition: "all 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  {/* Thông tin đơn */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <span style={{ background: "rgba(255,255,255,0.08)", padding: "6px 12px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 700 }}>☕ Bàn {order.table_id}</span>
                      <span style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: order.status === "paid" ? "rgba(74,222,128,0.15)" : order.status === "completed" ? "rgba(59,130,246,0.15)" : "rgba(234,179,8,0.15)", color: order.status === "paid" ? "#4ade80" : order.status === "completed" ? "#3b82f6" : "#eab308", border: `1px solid ${order.status === "paid" ? "rgba(74,222,128,0.3)" : order.status === "completed" ? "rgba(59,130,246,0.3)" : "rgba(234,179,8,0.3)"}` }}>
                        {order.status === "paid" ? "✅ Đã thanh toán" : order.status === "completed" ? "🎉 Hoàn thành" : "⏳ Chờ thanh toán"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#71717a" }}>🕐 {timeAgo(order.created_at)}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#71717a", marginBottom: "8px" }}>Mã: <code style={{ color: "#22d3ee" }}>{order.id.slice(0, 8).toUpperCase()}</code></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                        <span key={index} style={{ background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", color: "#d4d4d8" }}>
                          {item.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Giá + Hành động */}
                  <div style={{ textAlign: "right", minWidth: "140px" }}>
                    <div style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "1.4rem", fontWeight: 800, marginBottom: "10px" }}>
                      {order.total_amount.toLocaleString("vi-VN")}đ
                    </div>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {order.status === "paid" && (
                        <button onClick={async () => { const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", order.id); if (error) alert("Lỗi: " + error.message); }} style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}>🎉 Hoàn thành</button>
                      )}
                      {order.status === "pending" && (
                        <>
                          <button onClick={() => handlePayViaAction(order.id)} style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}>✅ Thanh toán</button>
                          <button onClick={() => setConfirmDelete(order.id)} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "6px 14px", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>❌ Hủy</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
            </div>
            ))
          )}
        </div>

      {/* Modal xác nhận hủy đơn */}
      {confirmDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "#1e1e24",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
            maxWidth: "400px",
            width: "90%",
            border: "1px solid #333",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
          }}>
            {/* Icon cảnh báo */}
            <div style={{ fontSize: "4rem", marginBottom: "15px" }}>⚠️</div>
            <h3 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "1.4rem" }}>Xác nhận hủy đơn</h3>
            <p style={{ color: "#a1a1aa", marginBottom: "30px", fontSize: "0.95rem" }}>
              Bạn có chắc chắn muốn hủy đơn hàng này không?<br/>
              Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: "12px 30px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  backgroundColor: "#333",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🔙 Không, giữ lại
              </button>
              <button
                onClick={() => handleCancelOrder(confirmDelete)}
                style={{
                  padding: "12px 30px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🗑️ Có, hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}


