"use client";

import { useState } from "react";
import Logo from "./Logo";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header>
      <div className="wrap nav">
        <a href="#top" className="logo" aria-label="Westward Property Care home">
          <Logo />
          Westward Property Care
        </a>
        <button
          className="menu-btn"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <ul className={`nav-links${open ? " open" : ""}`}>
          <li><a href="#services" onClick={close}>Services</a></li>
          <li><a href="#why" onClick={close}>Why Us</a></li>
          <li><a href="#process" onClick={close}>How It Works</a></li>
          <li><a href="/login" onClick={close}>Customer Login</a></li>
          <li><a href="#quote" className="btn btn-primary" onClick={close}>Free Estimate</a></li>
        </ul>
      </div>
    </header>
  );
}
