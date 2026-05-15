import React from "react";

const Header: React.FC = () => {
  return (
    <header
      style={{
        backgroundColor: "#1a2744",
        color: "#ffffff",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        minHeight: "72px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {/* JPJ Logo Placeholder */}
      <div
        style={{
          width: "52px",
          height: "52px",
          backgroundColor: "#6b7280",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontWeight: 700,
          fontSize: "14px",
          letterSpacing: "1px",
          color: "#ffffff",
          border: "1px solid #9ca3af",
        }}
        aria-label="JPJ Logo"
      >
        JPJ
      </div>

      {/* Bilingual Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span
          style={{
            fontSize: "16px",
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: "0.02em",
          }}
        >
          Penasihat Trafik &amp; Kemudahan Pejalan Kaki AI JPJ
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 400,
            color: "#cbd5e1",
            lineHeight: 1.3,
          }}
        >
          JPJ AI Traffic &amp; Walkability Advisor
        </span>
      </div>
    </header>
  );
};

export default Header;
