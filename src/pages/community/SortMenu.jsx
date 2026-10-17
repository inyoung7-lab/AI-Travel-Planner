import { useEffect, useState } from "react";
import { ChevDown } from "./Icons.jsx";

// 정렬 선택 칸 (누르면 선택지가 펼쳐져요)
export default function SortMenu({ className, value, options, onChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const cur = options.find((o) => o.key === value) ?? options[0];

  return (
    <span
      className={className}
      style={{ position: "relative", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
    >
      {cur.label} <ChevDown />
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30, minWidth: 110,
            background: "#fff", border: "1px solid #E7E1D4", borderRadius: 12, padding: 6,
            boxShadow: "0 8px 24px rgba(30,48,66,.12)",
          }}
        >
          {options.map((o) => (
            <div
              key={o.key}
              onClick={(e) => {
                e.stopPropagation();
                onChange(o.key);
                setOpen(false);
              }}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 14, whiteSpace: "nowrap",
                fontWeight: o.key === value ? 700 : 500, color: "#1E3042", cursor: "pointer",
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
