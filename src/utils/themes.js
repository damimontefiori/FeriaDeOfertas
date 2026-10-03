// Cada tema define las clases de Tailwind de la tienda pública.
// Las clases van completas y literales: Tailwind solo genera las que encuentra escritas en el código.
//   bg / header / text  → fondo de página, encabezado y color del texto del encabezado
//   heading / label     → título "Catálogo de Productos" y etiquetas ("Ordenar por") sobre el fondo
//   badge / backButton  → círculo del ícono de tienda y botón "Volver" del encabezado
//   pill / pillAlt      → pastilla activa de categoría y de orden/vista/paginación
//   ring                → anillo de la card expandida
//   snow / leaf         → efecto animado del encabezado
export const themes = {
  classic: {
    name: "Original",
    bg: "bg-gray-50",
    header: "bg-gradient-to-r from-blue-600 to-purple-600 border-b-0",
    text: "text-white",
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
    heading: "text-gray-800",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/20 hover:bg-black/30 text-white border-white/10",
    pill: "bg-red-600 text-white border-red-600",
    pillAlt: "bg-green-700 text-white border-green-700",
    ring: "ring-red-500",
    snow: true
  },
  nature: {
    name: "Naturaleza 🌿",
    bg: "bg-stone-50",
    header: "bg-gradient-to-r from-green-600 to-emerald-700 border-b-4 border-stone-300",
    text: "text-white",
    heading: "text-gray-800",
    label: "text-gray-500",
    badge: "bg-white/20 text-white",
    backButton: "bg-black/20 hover:bg-black/30 text-white border-white/10",
    pill: "bg-green-700 text-white border-green-700",
    pillAlt: "bg-emerald-500 text-white border-emerald-500",
    ring: "ring-green-500",
    snow: false,
    leaf: true
  },
  pink: {
    name: "Rosa 🌸",
    bg: "bg-pink-50",
    header: "bg-gradient-to-r from-pink-400 via-pink-500 to-rose-400 border-b-0",
    text: "text-white",
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
    heading: "text-gray-900",
    label: "text-gray-400",
    badge: "bg-gray-900 text-white",
    backButton: "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200",
    pill: "bg-gray-900 text-white border-gray-900",
    pillAlt: "bg-gray-600 text-white border-gray-600",
    ring: "ring-gray-900",
    snow: false
  }
};
