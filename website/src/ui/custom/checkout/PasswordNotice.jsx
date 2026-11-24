// src/ui/custom/checkout/PasswordNotice.jsx
//
// Shown once, right after checkout created an account with a generated password.
// It cannot be dismissed with Esc, the backdrop or the X: the user must press
// the button, so the password is not missed.
import { useState } from "react";
import Modal from "../modal/Modal";

export default function PasswordNotice({ open, email, password, orderPlaced = true, onDone }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the password is still visible to copy by hand */
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      busy
      layer="z-[60]"
      title="Save your password"
      description={orderPlaced ? "Your order is placed and your account is ready." : "Your account was created, but the order did not go through."}
      footer={(
        <button
          type="button"
          onClick={onDone}
          className="h-11 w-full rounded-md bg-accent px-4 font-semibold text-on-accent transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          I have saved my password
        </button>
      )}
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          We created an account for <span className="font-medium text-text">{email}</span> and generated this password for it.
        </p>

        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-alt p-3">
          <code className="min-w-0 flex-1 select-all break-all text-lg font-semibold tracking-wider text-text">{password}</code>
          <button
            type="button"
            onClick={copy}
            className="min-h-9 shrink-0 rounded-md border border-border px-3 text-sm font-medium text-text hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="text-muted">
          Save it somewhere safe now: we cannot show it again. You can change it any time from your profile settings.
        </p>
      </div>
    </Modal>
  );
}