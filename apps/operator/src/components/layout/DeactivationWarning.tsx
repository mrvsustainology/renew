"use client";

import { AlertTriangle } from "lucide-react";
import { C } from "@/lib/utils/tokens";

interface Props {
  remainingHours: number;
  onDismiss: () => void;
}

export const DeactivationWarning = ({ remainingHours, onDismiss }: Props) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 24px",
        maxWidth: 380,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          background: "#FEF3CD",
          borderRadius: 50,
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <AlertTriangle size={28} color="#D97706" />
      </div>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: C.display,
          color: "#B45309",
          marginBottom: 10,
        }}
      >
        Account Deactivated
      </h2>

      <p
        style={{
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          marginBottom: 6,
          fontFamily: C.sans,
        }}
      >
        Your account has been deactivated by the admin. You have{" "}
        <strong style={{ color: "#B45309" }}>
          {remainingHours > 0
            ? `~${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`
            : "less than 1 hour"}
        </strong>{" "}
        left before access is removed.
      </p>

      <p
        style={{
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.5,
          marginBottom: 20,
          fontFamily: C.sans,
        }}
      >
        Please contact your administrator to resolve this issue. After 24 hours
        you will be logged out automatically.
      </p>

      <button
        onClick={onDismiss}
        style={{
          background: "#D97706",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: C.sans,
          cursor: "pointer",
          width: "100%",
        }}
      >
        I Understand
      </button>
    </div>
  </div>
);
