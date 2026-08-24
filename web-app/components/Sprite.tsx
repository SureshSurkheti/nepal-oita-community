/* Generated from the static site's inline sprite by tools/. One <symbol>
   per icon, rendered once in the root layout; every <Icon name="…"/> below
   is a <use> pointing at it. */

export const ICONS = [
  'menu', 'close', 'arrow-right', 'arrow-down', 'arrow-up', 'chevron-left', 'chevron-right', 'chevron-down', 'check', 'copy', 'users', 'calendar', 'clock', 'pin', 'mail', 'phone', 'images', 'graduate', 'briefcase', 'home', 'globe', 'star', 'heart', 'shield', 'network', 'expand', 'user-plus', 'qr', 'send', 'search', 'facebook', 'instagram', 'tiktok', 'youtube', 'log-out', 'user'
] as const

export type IconName = (typeof ICONS)[number]

export function Icon({ name, className = 'icon', flip = false }:
  { name: IconName; className?: string; flip?: boolean }) {
  return (
    <svg className={flip ? `${className} icon--flip` : className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

export function Sprite() {
  return (
    <svg className="u-sprite" width={0} height={0} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
        <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
        <symbol id="i-arrow-down" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></symbol>
        <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
        <symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
        <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></symbol>
        <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11.5" height="11.5" rx="2.2"/><path d="M6.2 15H5a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 015 3h9A1.5 1.5 0 0115.5 4.5v1.2"/></symbol>
        <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20.5c0-3.7 3-5.8 6.5-5.8s6.5 2.1 6.5 5.8M17.2 11.4a3.1 3.1 0 100-6.2M18.4 14.8c2.3.6 3.6 2.4 3.6 5.5"/></symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10.5h17"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21.5S19 15 19 10a7 7 0 10-14 0c0 5 7 11.5 7 11.5z"/><circle cx="12" cy="10" r="2.6"/></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3.2 7.2l8.8 6 8.8-6"/></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.4 3.5h3l1.6 4-2.1 1.6a12.4 12.4 0 006 6l1.6-2.1 4 1.6v3a2 2 0 01-2.2 2C10.4 19 5 13.6 4.4 5.7a2 2 0 012-2.2z"/></symbol>
        <symbol id="i-images" viewBox="0 0 24 24"><path d="M7.5 5.5h12A1.5 1.5 0 0121 7v10"/><rect x="3" y="8.5" width="14.5" height="12" rx="2.2"/><circle cx="8" cy="13" r="1.4"/><path d="M3.4 18.6l4.1-3.6 3.4 2.9 2.6-2.3 3.9 3.4"/></symbol>
        <symbol id="i-graduate" viewBox="0 0 24 24"><path d="M12 4L2.5 9 12 14l9.5-5L12 4z"/><path d="M6.6 11.3V16c0 1.8 2.4 3 5.4 3s5.4-1.2 5.4-3v-4.7M21.5 9.2v5.3"/></symbol>
        <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3" y="7.5" width="18" height="12.5" rx="2.2"/><path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5M3 13.2h18"/></symbol>
        <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 10.6L12 4l8 6.6V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8.4z"/><path d="M9.5 20.5V14.2h5v6.3"/></symbol>
        <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.2 12h17.6M12 3a15.5 15.5 0 010 18M12 3a15.5 15.5 0 000 18"/></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.8l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 16.7 6.7 19.8 8 13.9l-4.5-4 6-.6L12 3.8z"/></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.6S3.4 15 3.4 9.2A4.8 4.8 0 0112 7a4.8 4.8 0 018.6 2.2c0 5.8-8.6 11.4-8.6 11.4z"/></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3.2l7.5 2.9v5.4c0 4.6-3.1 8.2-7.5 9.7-4.4-1.5-7.5-5.1-7.5-9.7V6.1L12 3.2z"/><path d="M9 12.2l2.2 2.2 4-4.3"/></symbol>
        <symbol id="i-network" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M10.4 6.9L6.3 15.8M13.6 6.9l4.1 8.9M7.4 18h9.2"/></symbol>
        <symbol id="i-expand" viewBox="0 0 24 24"><path d="M4 9.2V5.6A1.6 1.6 0 015.6 4H9.2M14.8 4h3.6A1.6 1.6 0 0120 5.6v3.6M20 14.8v3.6a1.6 1.6 0 01-1.6 1.6h-3.6M9.2 20H5.6A1.6 1.6 0 014 18.4v-3.6"/></symbol>
        <symbol id="i-user-plus" viewBox="0 0 24 24"><circle cx="9.5" cy="8" r="3.4"/><path d="M3 20.5c0-3.6 2.9-5.8 6.5-5.8 1 0 2 .2 2.9.5M18 13.8v6.4M14.8 17h6.4"/></symbol>
        <symbol id="i-qr" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4"/><path d="M14 14h3v3h-3zM20.5 14v3M17.5 20.5h3M14 20.5h.5"/></symbol>
        <symbol id="i-send" viewBox="0 0 24 24"><path d="M21.5 3.2L10.4 14.3M21.5 3.2l-7.1 18.3-4.1-7.3-7.3-4.1L21.5 3.2z"/></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.6"/><path d="M15.8 15.8l4.6 4.6"/></symbol>
        <symbol id="i-facebook" viewBox="0 0 24 24"><path className="icon--solid" fill="currentColor" stroke="none" d="M13.6 21.9v-8.1h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.6 1.6-1.6h1.7V4.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.2H7.4v3.2h2.8v8.1h3.4z"/></symbol>
        {/* Instagram: drawn as strokes, not a filled glyph, because it sits in
            the same row as the phone and Facebook marks and a solid square of
            colour there outweighs both. Rounded square, lens, and the flash dot. */}
        {/* A door with an arrow leaving it. Drawn open on the exit side so the
            direction reads at 19px, which a closed rectangle does not. */}
        {/* One person. `user-plus` was standing in for this and it means "add a
            person", which is not what "My profile" is. */}
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2a7.4 7.4 0 0114.4 0"/></symbol>
        <symbol id="i-log-out" viewBox="0 0 24 24"><path d="M14.5 4.5h-6a2 2 0 00-2 2v11a2 2 0 002 2h6"/><path d="M12.5 12h8.5"/><path d="M18 8.8l3.2 3.2-3.2 3.2"/></symbol>
        <symbol id="i-instagram" viewBox="0 0 24 24"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none"/></symbol>
        <symbol id="i-tiktok" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M16.65 5.82A4.28 4.28 0 0115.54 3h-2.9v11.42a2.6 2.6 0 11-1.86-2.5V9.03a5.5 5.5 0 104.42 5.39V8.2a7.07 7.07 0 004.1 1.31V6.62a4.29 4.29 0 01-2.65-.8z"/></symbol>
        <symbol id="i-youtube" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 001.76-1.77C22 15.2 22 12 22 12s0-3.2-.4-4.8zM10 15.2V8.8l5.2 3.2z"/></symbol>
      </defs>
    </svg>
  )
}
