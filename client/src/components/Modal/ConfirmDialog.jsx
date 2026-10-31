import React from "react";
import Modal from "./Modal";

// "Are you sure?" built on Modal. The confirm label names the action ("Delete event").
const ConfirmDialog = ({ open, title, message, confirmLabel, cancelLabel = "Keep it", onConfirm, onCancel }) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <p className="text-ink-soft">{message}</p>
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <button type="button" className="btn-ghost" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="button" className="btn-dark" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
