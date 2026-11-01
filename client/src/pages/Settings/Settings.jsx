import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { KeyRound, Mail, TriangleAlert } from "lucide-react";
import PageLayout from "../../components/PageLayout/PageLayout";
import Modal from "../../components/Modal/Modal";
import { ErrorState, LoadingState } from "../../components/PageState/PageState";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";

const MIN_PASSWORD = 8;

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });

// One settings card: icon, heading, a line of explanation, then the form
const Card = ({ icon: Icon, title, text, danger = false, children }) => (
  <section
    className={cn("rounded-3xl bg-white p-6 drop-shadow-ticket sm:p-8", danger && "ring-2 ring-plum/20")}
    aria-labelledby={`${title.replace(/\W+/g, "-").toLowerCase()}-heading`}
  >
    <div className="flex items-start gap-4">
      <span
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          danger ? "bg-plum/10 text-plum" : "bg-lagoon-light text-ink"
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={`${title.replace(/\W+/g, "-").toLowerCase()}-heading`} className="font-display text-2xl text-ink">
          {title}
        </h2>
        <p className="mt-1 text-ink-soft">{text}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  </section>
);

const PasswordField = ({ id, label, value, onChange, autoComplete, hint }) => (
  <div>
    <label htmlFor={id} className="field-label">
      {label}
    </label>
    <input
      id={id}
      type="password"
      className="field"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete={autoComplete}
    />
    {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
  </div>
);

const FormError = ({ message }) =>
  message ? (
    <p role="alert" className="text-sm font-bold text-plum">
      {message}
    </p>
  ) : null;

const EmailCard = ({ email, onChanged }) => {
  const { showToast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/users/email`,
        { email: newEmail.trim(), currentPassword: password },
        authHeaders()
      );
      localStorage.setItem("userEmail", data.user.email);
      onChanged(data.user.email);
      setNewEmail("");
      setPassword("");
      showToast("Email updated. Use it the next time you sign in.", "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't change your email"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon={Mail} title="Email" text="This is the address you sign in with and where trip invitations are sent.">
      <p className="mb-4 break-all rounded-xl bg-lagoon-light px-4 py-3 font-bold text-ink">{email}</p>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="new-email" className="field-label">
            New email
          </label>
          <input
            id="new-email"
            type="email"
            className="field"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <PasswordField
          id="email-password"
          label="Current password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          hint="We ask so nobody else can change your email from a signed-in device."
        />
        <FormError message={error} />
        <button
          type="submit"
          className="btn-dark"
          disabled={saving || !newEmail.trim() || !password}
          title={newEmail.trim() && password ? undefined : "Enter the new email and your password"}
        >
          {saving ? "Saving..." : "Change email"}
        </button>
      </form>
    </Card>
  );
};

const PasswordCard = () => {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (next.length < MIN_PASSWORD) return setError(`The new password needs at least ${MIN_PASSWORD} characters.`);
    if (next !== confirm) return setError("The two new passwords don't match.");
    setError("");
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/users/password`,
        { currentPassword: current, newPassword: next },
        authHeaders()
      );
      setCurrent("");
      setNext("");
      setConfirm("");
      showToast("Password updated", "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't change your password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon={KeyRound} title="Password" text="Pick something you don't use anywhere else.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PasswordField
          id="current-password"
          label="Current password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <FormError message={error} />
        <button
          type="submit"
          className="btn-dark"
          disabled={saving || !current || !next || !confirm}
          title={current && next && confirm ? undefined : "Fill in all three fields"}
        >
          {saving ? "Saving..." : "Change password"}
        </button>
      </form>
    </Card>
  );
};

const DeleteCard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [blockingTrips, setBlockingTrips] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword("");
    setError("");
    setBlockingTrips([]);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBlockingTrips([]);
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/users/me`, { ...authHeaders(), data: { password } });
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      showToast("Your account has been deleted.", "success");
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't delete your account"));
      setBlockingTrips(err.response?.data?.trips || []);
      setDeleting(false);
    }
  };

  return (
    <Card
      danger
      icon={TriangleAlert}
      title="Delete account"
      text="This can't be undone. Trips only you are on are deleted with your account."
    >
      <button type="button" className="btn-ghost border-2 border-plum/30 text-plum hover:bg-plum/5 hover:text-plum" onClick={() => setOpen(true)}>
        Delete my account...
      </button>

      <Modal open={open} onClose={close} title="Delete your account?">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <ul className="list-disc space-y-1.5 pl-5 text-ink-soft">
            <li>Your profile, photo and sign-in are removed.</li>
            <li>Trips only you are on are deleted.</li>
            <li>On trips you share, your name becomes "Former traveller" so the group's expenses still add up.</li>
            <li>A trip you organise with other people on it has to be deleted first.</li>
          </ul>
          <PasswordField
            id="delete-password"
            label="Enter your password to confirm"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <FormError message={error} />
          {blockingTrips.length > 0 && (
            <ul className="list-disc pl-5 font-bold text-ink">
              {blockingTrips.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>
              Keep my account
            </button>
            <button
              type="submit"
              className="btn border-0 bg-plum text-white hover:bg-plum/90 hover:text-white"
              disabled={deleting || !password}
              title={password ? undefined : "Enter your password first"}
            >
              {deleting ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    axios
      .get(`${API_URL}/api/users/profile`, authHeaders())
      .then(({ data }) => setEmail(data.user.email))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err, "Couldn't load your settings"));
      });
  }, [navigate]);

  let content;
  if (error) {
    content = <ErrorState message={error} onRetry={() => window.location.reload()} />;
  } else if (email === null) {
    content = <LoadingState message="Loading your settings..." />;
  } else {
    content = (
      <div className="space-y-8">
        <EmailCard email={email} onChanged={setEmail} />
        <PasswordCard />
        <DeleteCard />
      </div>
    );
  }

  return (
    <PageLayout
      maxWidth="max-w-3xl"
      back={{ to: "/profile", label: "Profile" }}
      title="Settings"
      subtitle="Your sign-in details and account."
    >
      {content}
    </PageLayout>
  );
};

export default Settings;
