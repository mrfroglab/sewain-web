// Versions of the draft legal pages shipped with this build (/syarat, /privasi). Plain module (no "use client") so
// server pages can read it. A v2 server announces the versions it records consent for via GET /api/v1/config.
export const LEGAL_DRAFT = {
  termsVersion: "0.1-draf",
  privacyVersion: "0.1-draf",
  /** last edit of the draft text */
  date: "16 November 2026",
} as const;
