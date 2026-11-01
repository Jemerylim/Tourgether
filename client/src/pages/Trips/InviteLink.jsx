// Layout adapted from https://21st.dev/@sean0205/components/c-input-group-40 (link field
// with copy button) and the copy -> check swap from https://21st.dev/@uiable/components/button-copy,
// without Radix or framer-motion.
import React, { useEffect, useRef, useState } from "react";
import axios from "../../api/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Check, Copy, Link2, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";
import { getToken } from "../../api/session";

dayjs.extend(relativeTime);

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "never", label: "Never expires" },
];

const joinUrl = (token) => `${window.location.origin}/join/${token}`;

// The organiser's shareable invite link: create it, copy or share it, reset or switch it off.
const InviteLink = ({ tripId, tripName }) => {
  const { showToast } = useToast();
  const [link, setLink] = useState(undefined); // undefined = loading, null = none
  const [expiry, setExpiry] = useState("7");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const copiedTimer = useRef(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/trips/${tripId}/invite-link`)
      .then(({ data }) => setLink(data.data))
      .catch((error) => {
        setLink(null);
        showToast(apiErrorMessage(error, "Couldn't load the invite link"), "error");
      });
    return () => clearTimeout(copiedTimer.current);
  }, [tripId, showToast]);

  const createLink = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/trips/${tripId}/invite-link`,
        { expiresInDays: expiry === "never" ? null : Number(expiry) }
      );
      const wasReset = Boolean(link);
      setLink(data.data);
      showToast(wasReset ? "New link made. The old one no longer works." : "Invite link ready to share", "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't create the link"), "error");
    } finally {
      setBusy(false);
    }
  };

  const disableLink = async () => {
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/api/trips/${tripId}/invite-link`);
      setLink(null);
      showToast("Invite link switched off", "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't switch the link off"), "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl(link.token));
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Couldn't copy automatically. Select the link and copy it.", "error");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: tripName, text: `Join "${tripName}" on Tourgether`, url: joinUrl(link.token) });
    } catch {
      // Closing the share sheet rejects too; nothing to report
    }
  };

  const expired = link?.expiresAt && dayjs(link.expiresAt).isBefore(dayjs());

  return (
    <section aria-labelledby="invite-link-heading" className="mt-6 rounded-2xl bg-paper p-4">
      <h3 id="invite-link-heading" className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Link2 size={16} aria-hidden="true" />
        Invite with a link
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Anyone with the link can join after signing in. Handy for group chats.
      </p>

      {link === undefined ? (
        <p className="mt-3 text-sm text-ink-soft">Loading...</p>
      ) : link ? (
        <>
          <div className="mt-3 flex items-center gap-1 rounded-xl bg-white p-1 pl-3 ring-2 ring-lagoon-light focus-within:ring-lagoon">
            <Link2 size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
            <input
              readOnly
              aria-label="Invite link"
              value={joinUrl(link.token)}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-ink-deep focus:outline-none"
            />
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Copied" : "Copy link"}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border-0 px-3 py-2 text-sm font-extrabold transition",
                copied ? "bg-lagoon text-white" : "bg-ink text-white hover:bg-ink-deep"
              )}
            >
              <span className="relative h-4 w-4" aria-hidden="true">
                <Copy size={16} className={cn("absolute inset-0 transition duration-150", copied ? "scale-50 opacity-0" : "scale-100 opacity-100")} />
                <Check size={16} className={cn("absolute inset-0 transition duration-150", copied ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
              </span>
              {copied ? "Copied" : "Copy"}
            </button>
            {typeof navigator.share === "function" && (
              <button
                type="button"
                onClick={share}
                aria-label="Share link"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
              >
                <Share2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <p className={cn("mt-2 text-sm", expired ? "font-bold text-plum" : "text-ink-soft")}>
            {!link.expiresAt && "This link never expires."}
            {link.expiresAt && !expired && `Expires ${dayjs(link.expiresAt).fromNow()}.`}
            {expired && "This link has expired. Make a new one to keep inviting people."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="invite-link-expiry" className="sr-only">New link lasts</label>
            <select id="invite-link-expiry" className="field w-auto py-2 text-sm" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="button" className="btn-ghost px-3" onClick={createLink} disabled={busy}>
              <RefreshCw size={16} aria-hidden="true" />
              Reset link
            </button>
            <button
              type="button"
              className="ml-auto border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline disabled:opacity-60"
              onClick={disableLink}
              disabled={busy}
            >
              Switch off
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="invite-link-expiry" className="sr-only">Link lasts</label>
          <select id="invite-link-expiry" className="field w-auto py-2 text-sm" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" className="btn-dark" onClick={createLink} disabled={busy}>
            Create invite link
          </button>
        </div>
      )}
    </section>
  );
};

export default InviteLink;
