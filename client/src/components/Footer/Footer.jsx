import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="text-white">
    {/* Wave instead of a hard edge between the page and the footer */}
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full sm:h-16" aria-hidden="true">
      <path fill="#0F4C57" d="M0 40C240 0 480 0 720 30C960 60 1200 70 1440 30V80H0Z" />
    </svg>
    <div className="bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 pb-10 pt-4 sm:flex-row sm:items-center sm:px-6">
        <p className="font-display text-2xl">Tourgether</p>
        <nav aria-label="Footer" className="flex gap-5 text-sm font-bold">
          <Link to="/login" className="text-white hover:text-mustard">Log in</Link>
          <Link to="/register" className="text-white hover:text-mustard">Sign up</Link>
          <Link to="/quiz" className="text-white hover:text-mustard">Travel quiz</Link>
        </nav>
      </div>
    </div>
  </footer>
);

export default Footer;
