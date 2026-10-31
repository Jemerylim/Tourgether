import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Map, User } from "lucide-react";
import logo from "../../assets/Tourgether-Logo.png";

const navLinkClass = ({ isActive }) =>
  ["btn-ghost", isActive ? "bg-ink/5" : ""].join(" ");

// `overlay` lets the navbar sit transparently on a Scene until the page scrolls.
const Navbar = ({ overlay = false }) => {
  const navigate = useNavigate();
  // Logged in when an authToken is present in localStorage. Read it up front so the first
  // paint doesn't flash the signed-out links.
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("authToken"));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    navigate("/", { replace: true });
  };

  const solid = !overlay || scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1000] h-[76px] transition-colors duration-300 ${
        solid ? "bg-paper/90 shadow-float backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="flex h-full items-center justify-between px-4 sm:px-8" aria-label="Main">
        <Link to={isLoggedIn ? "/dashboard" : "/"} aria-label="Tourgether home" className="shrink-0">
          <img src={logo} alt="Tourgether" className="-my-3 h-[72px] w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isLoggedIn ? (
            <>
              <NavLink to="/my-trips" className={navLinkClass}>
                <Map size={16} aria-hidden="true" />
                <span className="hidden sm:inline">My trips</span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                <User size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Profile</span>
              </NavLink>
              <button onClick={handleLogout} className="btn-dark ml-1">
                <LogOut size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
