import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Title block shared by the inner pages: optional back link, a small `kicker` node above
// the title (e.g. quiz progress), subtitle and actions.
const PageHeader = ({ title, subtitle, kicker, back, actions }) => (
  <header>
    {back && (
      <Link to={back.to} className="btn-ghost -ml-3 mb-3">
        <ArrowLeft size={16} aria-hidden="true" />
        {back.label}
      </Link>
    )}
    {kicker && <div className="mb-4">{kicker}</div>}
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;
