// Link de búsqueda de Google Maps (formato oficial "Maps URLs", no requiere API key).
// Con un barrio o una localidad, Maps muestra la zona marcada; en el celular abre la app de Maps.
export const getMapsSearchUrl = (area) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area.trim())}`;
