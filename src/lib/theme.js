// Valeurs extraites telles quelles du fichier exporté par Claude Design
// (Dofus MMS.dc.html) — ne pas improviser d'autres teintes à côté.

export const ACCENT = 'oklch(0.55 0.15 125)'
export const GREEN = ACCENT
export const AMBER = 'oklch(0.72 0.14 75)'
export const RED = 'oklch(0.58 0.19 25)'
export const SIDEBAR_BG = 'oklch(0.19 0.015 150)'

export const LIGHT = {
  pageBg: 'oklch(0.975 0.004 150)',
  panel: '#fff',
  panel2: 'oklch(0.96 0.006 150)',
  border: 'oklch(0.9 0.006 150)',
  borderLight: 'oklch(0.93 0.006 150)',
  text: 'oklch(0.22 0.01 150)',
  textSecondary: 'oklch(0.55 0.01 150)',
  hover: 'oklch(0.97 0.02 150)',
  input: '#fff',
  softAccentBg: 'oklch(0.93 0.09 120)',
  accentText: 'oklch(0.55 0.15 125)',
}

export const DARK = {
  pageBg: 'oklch(0.20 0.004 250)',
  panel: 'oklch(0.24 0.004 250)',
  panel2: 'oklch(0.28 0.005 250)',
  border: 'oklch(0.34 0.005 250)',
  borderLight: 'oklch(0.30 0.005 250)',
  text: 'oklch(0.93 0.003 250)',
  textSecondary: 'oklch(0.68 0.006 250)',
  hover: 'oklch(0.31 0.008 250)',
  input: 'oklch(0.26 0.004 250)',
  softAccentBg: 'oklch(0.32 0.08 125)',
  accentText: 'oklch(0.82 0.13 125)',
}

export function priorityColor(score) {
  if (score >= 66) return GREEN
  if (score >= 33) return AMBER
  return RED
}

// Styles partagés entre écrans — repris à l'identique du design.
export function sharedStyles(T) {
  return {
    panel: `background:${T.panel}; border:1px solid ${T.border}; border-radius:12px; overflow:hidden;`,
    panelPad: `background:${T.panel}; border:1px solid ${T.border}; border-radius:12px; padding:18px;`,
    segmented: `display:flex; gap:2px; background:${T.panel2}; border-radius:8px; padding:2px;`,
    accentBtn: `font-size:13px; font-weight:600; padding:8px 14px; border-radius:8px; cursor:pointer; color:#fff; background:${ACCENT};`,
    inputSmall: `font-size:13px; padding:8px; border-radius:8px; border:1px solid ${T.border}; outline:none; width:100%; background:${T.input}; color:${T.text}; box-sizing:border-box;`,
  }
}
