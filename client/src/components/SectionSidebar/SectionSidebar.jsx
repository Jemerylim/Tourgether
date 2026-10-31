// Layout adapted from https://21st.dev/@manuarora700/components/sidebar (desktop rail that
// collapses to icons, slide-in drawer on mobile) and the hamburger from
// https://21st.dev/@efferd/components/menu-toggle. framer-motion swapped for CSS transitions.
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const COLLAPSED_KEY = "sectionSidebarCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (collapsed) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage can be unavailable (private windows); the sidebar just starts expanded.
  }
};

// Hamburger whose top and bottom lines fold into an X when `open`
const MenuIcon = ({ open }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn("h-5 w-5 transition-transform duration-500 ease-out motion-reduce:transition-none", open && "-rotate-45")}
  >
    <path
      className={cn(
        "transition-all duration-500 ease-out motion-reduce:transition-none",
        open ? "[stroke-dasharray:20_300] [stroke-dashoffset:-32.42px]" : "[stroke-dasharray:12_63]"
      )}
      d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
    />
    <path d="M7 16 27 16" />
  </svg>
);

const NavItems = ({ items, value, onSelect, collapsed = false, firstRef }) => (
  <ul className="space-y-1">
    {items.map((item, index) => {
      const Icon = item.icon;
      const active = item.value === value;
      return (
        <li key={item.value}>
          <button
            ref={index === 0 ? firstRef : undefined}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            title={collapsed ? item.label : undefined}
            onClick={() => onSelect(item.value)}
            className={cn(
              "group/item flex w-full items-center gap-3 rounded-xl border-0 py-2.5 text-left text-sm font-extrabold transition",
              collapsed ? "justify-center px-0" : "px-3",
              active ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-lagoon-light"
            )}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate transition-transform duration-150 group-hover/item:translate-x-0.5">
                {item.label}
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);

// Section switcher for a page. From `lg` up it's a sticky rail beside the content that the
// hamburger collapses to icons; below that, the hamburger opens it as a drawer.
// `items`: [{ value, label, icon }]. Render the chosen section as `children`.
const SectionSidebar = ({ items, value, onChange, label, children }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef(null);
  const firstItemRef = useRef(null);
  const current = items.find((item) => item.value === value) || items[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!drawerOpen) return undefined;
    firstItemRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });
  };

  const selectFromDrawer = (next) => {
    onChange(next);
    setDrawerOpen(false);
  };

  return (
    <div className="lg:flex lg:items-start lg:gap-6">
      {/* Desktop rail */}
      <nav
        aria-label={label}
        className={cn(
          "sticky top-[96px] hidden shrink-0 rounded-3xl bg-white p-2 drop-shadow-ticket transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between pl-3")}>
          {!collapsed && <span className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</span>}
          <button
            type="button"
            aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
          >
            <MenuIcon open={!collapsed} />
          </button>
        </div>
        <NavItems items={items} value={value} onSelect={onChange} collapsed={collapsed} />
      </nav>

      {/* Mobile: hamburger bar showing the current section */}
      <div className="mb-5 lg:hidden">
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={drawerOpen}
          aria-controls="section-drawer"
          onClick={() => setDrawerOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-2xl border-0 bg-white px-4 py-3 text-left text-ink drop-shadow-ticket"
        >
          <MenuIcon open={drawerOpen} />
          <CurrentIcon size={18} aria-hidden="true" />
          <span className="flex-1 font-extrabold">{current.label}</span>
          <span className="text-xs font-bold text-ink-soft">{drawerOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {drawerOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-x-0 bottom-0 top-[76px] z-[900] animate-fade-in bg-ink-deep/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="section-drawer"
            aria-label={label}
            className="fixed bottom-0 left-0 top-[76px] z-[901] w-72 max-w-[85vw] animate-drawer-in overflow-y-auto rounded-r-3xl bg-white p-4 shadow-soft lg:hidden"
          >
            <p className="mb-3 px-3 text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</p>
            <NavItems items={items} value={value} onSelect={selectFromDrawer} firstRef={firstItemRef} />
          </nav>
        </>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default SectionSidebar;
