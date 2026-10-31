// Adapted from https://21st.dev/@arunjdass/components/file-upload
import React, { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

// Single-image drop zone. Calls `onFile(file)` for a picked or dropped image; the caller
// shows the preview (e.g. in an Avatar).
const PhotoDrop = ({ onFile, label = "Change photo" }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const accept = (file) => {
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files?.[0]);
      }}
      className={`rounded-2xl p-4 text-center transition ${dragging ? "bg-mustard/50" : "bg-lagoon-light/70"}`}
    >
      <button type="button" className="btn-dark" onClick={() => inputRef.current?.click()}>
        <ImagePlus size={16} aria-hidden="true" />
        {label}
      </button>
      <p className="mt-2 text-sm text-ink-soft">or drop an image here</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default PhotoDrop;
