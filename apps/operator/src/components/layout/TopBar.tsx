"use client";

import { Wifi, WifiOff, RefreshCw, LogOut } from "lucide-react";
import Image from "next/image";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useQueueCount } from "@/hooks/useQueueCount";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { C } from "@/lib/utils/tokens";
import { shortId } from "@/lib/utils/shortId";

export const TopBar = () => {
  const { isOnline, isSyncing, triggerSync } = useOnlineStatus();
  const { count: queueCount } = useQueueCount(isSyncing);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div
      style={{
        background: "#1B3829",
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left — Logo + App name + operator info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image
          src="/RENEW_HOPE_LOGO.png"
          alt="Renew Hope Logo"
          width={48}
          height={48}
          style={{ flexShrink: 0 }}
        />
        <div>
          <div
            style={{
              fontFamily: C.display,
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            THE RENEW HOPE INITIATIVE · MRV
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#9DC0AB",
              fontFamily: C.mono,
              marginTop: 3,
            }}
          >
            {user?.id ? shortId(user.id) : "—"} ·{" "}
            {user?.digesterId ? shortId(user.digesterId) : "—"}
          </div>
          {isSyncing && queueCount > 0 && (
            <div
              style={{
                display: "inline-block",
                background: "#CF8025",
                borderRadius: 12,
                padding: "2px 9px",
                fontSize: 11,
                color: "#fff",
                fontFamily: C.mono,
                fontWeight: 700,
                marginTop: 4,
                whiteSpace: "nowrap",
              }}
            >
              {queueCount} pending
            </div>
          )}
        </div>
      </div>

      {/* Right — Status + logout */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Pending queue badge — shown on right when not syncing */}
        {queueCount > 0 && !isSyncing && (
          <div
            style={{
              background: "#CF8025",
              borderRadius: 20,
              padding: "4px 11px",
              fontSize: 13,
              color: "#fff",
              fontFamily: C.mono,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {queueCount} pending
          </div>
        )}

        {/* Syncing indicator */}
        {isSyncing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#2D5A3F",
              borderRadius: 20,
              padding: "4px 11px",
              color: "#9DC0AB",
              fontSize: 13,
              fontFamily: C.mono,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />
            Syncing...
          </div>
        )}

        {/* Online / Offline toggle */}
        <button
          onClick={() => isOnline && triggerSync()}
          style={{
            background: isOnline ? "#2D5A3F" : "#B54343",
            border: "none",
            borderRadius: 9,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            color: "#fff",
            fontSize: 14,
            fontFamily: C.mono,
            fontWeight: 600,
          }}
        >
          {isOnline ? (
            <>
              <Wifi size={15} /> Online
            </>
          ) : (
            <>
              <WifiOff size={15} /> Offline
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9DC0AB",
            display: "flex",
            padding: 6,
          }}
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
