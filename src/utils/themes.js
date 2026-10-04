// Cada tema define las clases de Tailwind de la tienda pública y del panel del vendedor.
// Las clases van completas y literales: Tailwind solo genera las que encuentra escritas en el código.
//   bg / header / text  → fondo de página, encabezado y color del texto del encabezado
//   muted / surface     → texto secundario y paneles translúcidos sobre el encabezado (panel del vendedor)
//   heading / label     → título "Catálogo de Productos" y etiquetas ("Ordenar por") sobre el fondo
//   badge / backButton  → círculo del ícono de tienda y botón "Volver" del encabezado
//   pill / pillAlt      → pastilla activa de categoría y de orden/vista/paginación
//   ring                → anillo de la card expandida
//   snow / leaf         → efecto animado del encabezado
//   badgeEmoji          → adorno sobre el ícono/logo del encabezado de la tienda (opcional)
//   special             → tema de temporada/evento (ver getSpecialWindow). Sin `special`, el tema está siempre disponible:
//                           { month: 12 }                   → todos los años, solo durante ese mes
//                           { from?: 'YYYY-MM-DD', until }  → evento único, fechas inclusive
export const DEFAULT_THEME = 'classic';

export const themes = {
  classic: {
    name: "Original",
    bg: "bg-gray-50",
    header: "bg-gradient-to-r from-blue-600 to-purple-600 border-b-0",
    text: "text-white",
    muted: "text-white/80",
    surface: "bg-white/10 border-white/10",
    heading: "text-gray-800",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/20 hover:bg-black/30 text-white border-white/10",
    pill: "bg-[#252D61] text-white border-[#252D61]",
    pillAlt: "bg-[#5A99CB] text-white border-[#5A99CB]",
    ring: "ring-blue-500",
    snow: false
  },
  dark: {
    name: "Oscuro",
    bg: "bg-gray-900",
    header: "bg-gradient-to-r from-gray-800 to-black border-b border-gray-700",
    text: "text-gray-100",
    muted: "text-gray-400",
    surface: "bg-white/5 border-white/10",
    heading: "text-white",
    label: "text-gray-400",
    badge: "bg-white/10 text-white",
    backButton: "bg-white/10 hover:bg-white/20 text-white border-white/10",
    pill: "bg-indigo-500 text-white border-indigo-500",
    pillAlt: "bg-gray-600 text-white border-gray-500",
    ring: "ring-indigo-400",
    snow: false
  },
  christmas: {
    name: "Navidad 🎄",
    bg: "bg-red-50",
    header: "bg-gradient-to-b from-red-600 to-red-800 border-b-4 border-green-700",
    text: "text-white",
    muted: "text-red-100",
    surface: "bg-white/10 border-white/15",
    heading: "text-gray-800",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/20 hover:bg-black/30 text-white border-white/10",
    pill: "bg-red-600 text-white border-red-600",
    pillAlt: "bg-green-700 text-white border-green-700",
    ring: "ring-red-500",
    snow: true,
    badgeEmoji: "🎅",
    special: { month: 12 }
  },
  nature: {
    name: "Naturaleza 🌿",
    bg: "bg-stone-50",
    header: "bg-gradient-to-r from-green-600 to-emerald-700 border-b-4 border-stone-300",
    text: "text-white",
    muted: "text-green-100",
    surface: "bg-white/10 border-white/15",
    heading: "text-gray-800",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/20 hover:bg-black/30 text-white border-white/10",
    pill: "bg-green-700 text-white border-green-700",
    pillAlt: "bg-emerald-500 text-white border-emerald-500",
    ring: "ring-green-500",
    snow: false,
    leaf: true,
    badgeEmoji: "🌻"
  },
  pink: {
    name: "Rosa 🌸",
    bg: "bg-pink-50",
    header: "bg-gradient-to-r from-pink-400 via-pink-500 to-rose-400 border-b-0",
    text: "text-white",
    muted: "text-pink-50",
    surface: "bg-white/15 border-white/25",
    heading: "text-pink-900",
    label: "text-pink-700/70",
    badge: "bg-white/25 text-white",
    backButton: "bg-white/20 hover:bg-white/30 text-white border-white/20",
    pill: "bg-pink-600 text-white border-pink-600",
    pillAlt: "bg-pink-400 text-white border-pink-400",
    ring: "ring-pink-400",
    snow: false
  },
  sunset: {
    name: "Atardecer 🌅",
    bg: "bg-orange-50",
    header: "bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 border-b-0",
    text: "text-white",
    muted: "text-white/85",
    surface: "bg-white/15 border-white/20",
    heading: "text-gray-900",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/15 hover:bg-black/25 text-white border-white/20",
    pill: "bg-violet-600 text-white border-violet-600",
    pillAlt: "bg-pink-500 text-white border-pink-500",
    ring: "ring-pink-500",
    snow: false
  },
  minimal: {
    name: "Minimalista",
    bg: "bg-white",
    header: "bg-white border-b border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    surface: "bg-gray-50 border-gray-200",
    heading: "text-gray-900",
    label: "text-gray-400",
    badge: "bg-gray-900 text-white",
    backButton: "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200",
    pill: "bg-gray-900 text-white border-gray-900",
    pillAlt: "bg-gray-600 text-white border-gray-600",
    ring: "ring-gray-900",
    snow: false
  },
  // Visita del Papa León XIV a la Argentina (8 al 11/11/2026): disponible hasta una semana después.
  // Celeste y blanco de la bandera argentina con el dorado del Vaticano (el "sol" del ícono).
  pope: {
    name: "Visita del Papa 🕊️",
    bg: "bg-sky-50",
    header: "bg-gradient-to-b from-sky-300 via-white to-sky-300 border-b-4 border-amber-400",
    text: "text-sky-950",
    muted: "text-sky-800/80",
    surface: "bg-white/60 border-white",
    heading: "text-sky-900",
    label: "text-sky-700/70",
    badge: "bg-amber-400 text-white",
    backButton: "bg-white/70 hover:bg-white text-sky-900 border-sky-200",
    pill: "bg-sky-500 text-white border-sky-500",
    pillAlt: "bg-amber-400 text-sky-950 border-amber-400",
    ring: "ring-amber-400",
    snow: false,
    badgeEmoji: "🕊️",
    special: { until: "2026-11-18" }
  }
};

// Fecha de hoy en Argentina como 'YYYY-MM-DD': las ventanas de los temas especiales siguen el calendario
// argentino, sin importar la zona horaria del navegador.
export const todayInArgentina = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

// Ventana vigente de un tema especial como { start, end } ('YYYY-MM-DD', inclusive),
// o null si el tema no es especial o hoy no está disponible.
export const getSpecialWindow = (key, today = todayInArgentina()) => {
  const special = themes[key]?.special;
  if (!special) return null;

  if (special.month) {
    const [year, month] = today.split('-').map(Number);
    if (month !== special.month) return null;
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${lastDay}` };
  }

  const start = special.from || '0000-01-01';
  if (today < start || today > special.until) return null;
  return { start, end: special.until };
};

// Temas que el vendedor puede elegir hoy: los regulares siempre, los especiales solo dentro de su ventana
export const isThemeAvailable = (key, today = todayInArgentina()) =>
  Boolean(themes[key]) && (!themes[key].special || getSpecialWindow(key, today) !== null);

// Tema efectivo de una tienda. Un tema especial vale solo si se eligió dentro de su ventana vigente
// (shop.themeSelectedOn): al caducar, la tienda vuelve al tema por defecto y no revive la temporada siguiente.
export const resolveThemeKey = (shop, today = todayInArgentina()) => {
  const key = shop?.theme;
  if (!themes[key]) return DEFAULT_THEME;
  if (!themes[key].special) return key;

  const activeWindow = getSpecialWindow(key, today);
  const chosenInThisWindow = Boolean(activeWindow && shop.themeSelectedOn && shop.themeSelectedOn >= activeWindow.start);
  return chosenInThisWindow ? key : DEFAULT_THEME;
};

export const resolveTheme = (shop, today = todayInArgentina()) => themes[resolveThemeKey(shop, today)];
