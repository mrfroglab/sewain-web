// "Foto contoh" for the simulated eKYC, so the flow works on a laptop without a camera.
// Inline SVG data URLs (no network, no real identity data). Neutral grays to match the design system.

const svg = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

const FONT = "Arial, Helvetica, sans-serif";

const row = (y: number, label: string, width: number) => `
  <text x="64" y="${y}" font-family="${FONT}" font-size="20" fill="#444">${label}</text>
  <text x="250" y="${y}" font-family="${FONT}" font-size="20" fill="#444">:</text>
  <rect x="270" y="${y - 16}" width="${width}" height="18" rx="9" fill="#c9c9c9"/>`;

/** KTP-shaped card (ID-1 ratio 1.586), number partly hidden. */
export const DEMO_KTP = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540">
  <rect width="856" height="540" fill="#e7e7e7"/>
  <rect x="24" y="22" width="808" height="496" rx="26" fill="#fff" stroke="#d6d6d6" stroke-width="2"/>
  <text x="428" y="74" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="#171717">PROVINSI DAERAH ISTIMEWA YOGYAKARTA</text>
  <text x="428" y="106" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="#171717">KABUPATEN SLEMAN</text>
  <text x="64" y="160" font-family="monospace" font-size="30" font-weight="700" fill="#171717">NIK  : 3404 **** **** ****</text>
  ${row(206, "Nama", 250)}
  ${row(244, "Tempat/Tgl Lahir", 220)}
  ${row(282, "Jenis Kelamin", 120)}
  ${row(320, "Alamat", 260)}
  ${row(358, "Agama", 110)}
  ${row(396, "Pekerjaan", 200)}
  ${row(434, "Kewarganegaraan", 70)}
  <rect x="618" y="140" width="170" height="214" rx="10" fill="#e7e7e7"/>
  <circle cx="703" cy="222" r="42" fill="#c9c9c9"/>
  <path d="M640 354c0-46 28-74 63-74s63 28 63 74z" fill="#c9c9c9"/>
  <text x="703" y="392" text-anchor="middle" font-family="${FONT}" font-size="16" fill="#777">SLEMAN</text>
  <rect x="648" y="404" width="110" height="34" rx="6" fill="#f5f5f5" stroke="#d6d6d6"/>
  <text x="428" y="494" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#a0a0a0">FOTO CONTOH · BUKAN KTP ASLI</text>
</svg>`);

/** Selfie holding the card next to the face. */
export const DEMO_SELFIE = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#e7e7e7"/>
  <path d="M90 800c0-170 90-270 210-270s210 100 210 270z" fill="#bdbdbd"/>
  <rect x="262" y="440" width="76" height="100" rx="30" fill="#c9c9c9"/>
  <ellipse cx="300" cy="340" rx="112" ry="132" fill="#c9c9c9"/>
  <path d="M188 318c4-92 54-136 112-136s108 44 112 136c-30-46-66-64-112-64s-82 18-112 64z" fill="#444"/>
  <circle cx="258" cy="350" r="9" fill="#444"/>
  <circle cx="342" cy="350" r="9" fill="#444"/>
  <path d="M268 412q32 22 64 0" stroke="#777" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g transform="rotate(-8 470 470)">
    <rect x="380" y="400" width="196" height="124" rx="12" fill="#fff" stroke="#a0a0a0" stroke-width="2"/>
    <rect x="394" y="414" width="168" height="14" rx="7" fill="#171717"/>
    <rect x="394" y="442" width="96" height="10" rx="5" fill="#a0a0a0"/>
    <rect x="394" y="462" width="80" height="10" rx="5" fill="#c9c9c9"/>
    <rect x="394" y="482" width="104" height="10" rx="5" fill="#c9c9c9"/>
    <rect x="512" y="440" width="40" height="52" rx="6" fill="#e7e7e7"/>
  </g>
  <ellipse cx="398" cy="540" rx="34" ry="44" fill="#bdbdbd"/>
  <text x="300" y="770" text-anchor="middle" font-family="${FONT}" font-size="22" fill="#777">Foto contoh · selfie memegang KTP</text>
</svg>`);
