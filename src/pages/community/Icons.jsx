// 커뮤니티 화면에서 공통으로 쓰는 아이콘 모음
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Pin = ({ size = 12 }) => (
  <svg width={size} height={size} {...base}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const Thumb = ({ size = 14 }) => (
  <svg width={size} height={size} {...base}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

export const Chat = ({ size = 14 }) => (
  <svg width={size} height={size} {...base}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);

export const Check = ({ size = 12 }) => (
  <svg width={size} height={size} {...base} strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ChevDown = ({ size = 14 }) => (
  <svg width={size} height={size} {...base}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevRight = ({ size = 14 }) => (
  <svg width={size} height={size} {...base}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const Heart = ({ size = 14, filled = false }) => (
  <svg
    width={size}
    height={size}
    {...base}
    style={filled ? { fill: "#E8695A", stroke: "#E8695A" } : undefined}
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

// 사진이 들어갈 자리를 나타내는 아이콘 (실제 사진이 들어오면 교체)
export const ImageIcon = ({ size = 30 }) => (
  <svg
    width={size}
    height={size}
    {...base}
    strokeWidth={1.8}
    style={{ color: "rgba(255,255,255,.7)" }}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
