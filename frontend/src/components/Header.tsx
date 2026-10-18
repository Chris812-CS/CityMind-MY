import React from "react";
import logo from "../assets/logo.svg";

const Header: React.FC = () => (
  <header style={{ backgroundColor: "#1a2744", color: "#ffffff", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "64px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
    <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }} aria-label="CityMind MY — home">
      <img src={logo} alt="CityMind MY" style={{ height: "40px", width: "auto" }} />
    </a>
    <nav aria-label="Primary navigation" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <span style={{ fontSize: "12px", color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        JPJ AI Traffic &amp; Walkability Advisor
      </span>
    </nav>
  </header>
);

export default Header;
