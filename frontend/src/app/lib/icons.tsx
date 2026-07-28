import React from 'react';

type P = { size?: number; className?: string };
const base = (size = 18): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconDashboard = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const IconUsers = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.8" />
    <path d="M18 20a6 6 0 0 0-3-5.2" />
  </svg>
);
export const IconBot = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 8V4M9 4h6" />
    <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <path d="M2 13v2M22 13v2" />
  </svg>
);
export const IconMemory = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.8V17a3 3 0 0 0 5 2 3 3 0 0 0 5-2v-3.2A3.5 3.5 0 0 0 16 7a4 4 0 0 0-4-4Z" />
    <path d="M12 8v9" />
  </svg>
);
export const IconProvider = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2 3 7l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
  </svg>
);
export const IconPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconSun = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
);
export const IconMoon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
);
export const IconLogout = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M15 12H4M8 8l-4 4 4 4" />
    <path d="M11 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
  </svg>
);
export const IconRepo = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3h9a2 2 0 0 1 2 2v15l-5-3-5 3V5a2 2 0 0 1 2-2Z" />
  </svg>
);
export const IconTrash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);
export const IconX = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconChat = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.8A8 8 0 1 1 21 12Z" />
  </svg>
);
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconWhatsApp = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z" />
    <path d="M8.5 9c0 3 2.5 5.5 5.5 5.5.6-.9.3-1.4-.4-1.8l-1-.5c-.4-.2-.7 0-.9.3-.5-.2-1.2-.8-1.5-1.5.3-.2.5-.5.3-.9l-.5-1c-.4-.7-.9-1-1.8-.4A1.4 1.4 0 0 0 8.5 9Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconWallet = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2Z" />
    <rect x="3" y="8" width="18" height="12" rx="2.5" />
    <circle cx="16.5" cy="14" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
// Brand mark: crescent moon + spark ("Noonight")
export const IconLogo = ({ size = 20, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z" fill="currentColor" />
    <path d="M17.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" fill="currentColor" />
  </svg>
);
export const IconSync = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.6-4.2M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.6 4.2" />
    <path d="M21 4v4.2h-4.2M3 20v-4.2h4.2" />
  </svg>
);
export const IconAlert = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);
