export const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export type ColorOption = { id: string; label: string; bg: string; text: string; border: string; };

export const AVAILABLE_COLORS: ColorOption[] = [
  // Column 1: Rojo
  { id: 'gs-red-1',     label: 'Rojo Pastel Muy Claro',   bg: 'bg-[#f4cccc]', text: 'text-[#660000]', border: 'border-[#e06666]' },
  { id: 'gs-red-2',     label: 'Rojo Pastel Claro',       bg: 'bg-[#ea9999]', text: 'text-[#660000]', border: 'border-[#cc0000]' },
  { id: 'gs-red-3',     label: 'Rojo Medio',              bg: 'bg-[#e06666]', text: 'text-[#ffffff]', border: 'border-[#990000]' },
  { id: 'gs-red-4',     label: 'Rojo Vibrante',           bg: 'bg-[#cc0000]', text: 'text-[#ffffff]', border: 'border-[#990000]' },
  { id: 'gs-red-5',     label: 'Rojo Oscuro',             bg: 'bg-[#990000]', text: 'text-[#ffffff]', border: 'border-[#660000]' },
  { id: 'gs-red-6',     label: 'Rojo Muy Oscuro',         bg: 'bg-[#660000]', text: 'text-[#ffffff]', border: 'border-[#3c0000]' },

  // Column 2: Naranja
  { id: 'gs-orange-1',  label: 'Naranja Pastel Muy Claro', bg: 'bg-[#fce5cd]', text: 'text-[#783f04]', border: 'border-[#f6b26b]' },
  { id: 'gs-orange-2',  label: 'Naranja Pastel Claro',     bg: 'bg-[#f9cb9c]', text: 'text-[#783f04]', border: 'border-[#e69138]' },
  { id: 'gs-orange-3',  label: 'Naranja Medio',            bg: 'bg-[#f6b26b]', text: 'text-[#ffffff]', border: 'border-[#b45f06]' },
  { id: 'gs-orange-4',  label: 'Naranja Vibrante',         bg: 'bg-[#e69138]', text: 'text-[#ffffff]', border: 'border-[#b45f06]' },
  { id: 'gs-orange-5',  label: 'Naranja Oscuro',           bg: 'bg-[#b45f06]', text: 'text-[#ffffff]', border: 'border-[#783f04]' },
  { id: 'gs-orange-6',  label: 'Naranja Muy Oscuro',       bg: 'bg-[#783f04]', text: 'text-[#ffffff]', border: 'border-[#3c1f02]' },

  // Column 3: Amarillo
  { id: 'gs-yellow-1',  label: 'Amarillo Pastel Muy Claro', bg: 'bg-[#fff2cc]', text: 'text-[#7f6000]', border: 'border-[#ffd966]' },
  { id: 'gs-yellow-2',  label: 'Amarillo Pastel Claro',     bg: 'bg-[#ffe599]', text: 'text-[#7f6000]', border: 'border-[#f1c232]' },
  { id: 'gs-yellow-3',  label: 'Amarillo Medio',            bg: 'bg-[#ffd966]', text: 'text-[#4e3b00]', border: 'border-[#bf9000]' },
  { id: 'gs-yellow-4',  label: 'Amarillo Vibrante',         bg: 'bg-[#f1c232]', text: 'text-[#ffffff]', border: 'border-[#bf9000]' },
  { id: 'gs-yellow-5',  label: 'Amarillo Oscuro',           bg: 'bg-[#bf9000]', text: 'text-[#ffffff]', border: 'border-[#7f6000]' },
  { id: 'gs-yellow-6',  label: 'Amarillo Muy Oscuro',       bg: 'bg-[#7f6000]', text: 'text-[#ffffff]', border: 'border-[#4e3b00]' },

  // Column 4: Verde
  { id: 'gs-green-1',   label: 'Verde Pastel Muy Claro',  bg: 'bg-[#d9ead3]', text: 'text-[#274e13]', border: 'border-[#93c47d]' },
  { id: 'gs-green-2',   label: 'Verde Pastel Claro',      bg: 'bg-[#b6d7a8]', text: 'text-[#274e13]', border: 'border-[#6aa84f]' },
  { id: 'gs-green-3',   label: 'Verde Medio',             bg: 'bg-[#93c47d]', text: 'text-[#ffffff]', border: 'border-[#38761d]' },
  { id: 'gs-green-4',   label: 'Verde Vibrante',          bg: 'bg-[#6aa84f]', text: 'text-[#ffffff]', border: 'border-[#38761d]' },
  { id: 'gs-green-5',   label: 'Verde Oscuro',            bg: 'bg-[#38761d]', text: 'text-[#ffffff]', border: 'border-[#274e13]' },
  { id: 'gs-green-6',   label: 'Verde Muy Oscuro',        bg: 'bg-[#274e13]', text: 'text-[#ffffff]', border: 'border-[#152a0a]' },

  // Column 5: Cian
  { id: 'gs-cyan-1',    label: 'Cian Pastel Muy Claro',   bg: 'bg-[#d0e0e3]', text: 'text-[#0c343d]', border: 'border-[#76a5af]' },
  { id: 'gs-cyan-2',    label: 'Cian Pastel Claro',       bg: 'bg-[#a2c4c9]', text: 'text-[#0c343d]', border: 'border-[#45818e]' },
  { id: 'gs-cyan-3',    label: 'Cian Medio',              bg: 'bg-[#76a5af]', text: 'text-[#ffffff]', border: 'border-[#134f5c]' },
  { id: 'gs-cyan-4',    label: 'Cian Vibrante',           bg: 'bg-[#45818e]', text: 'text-[#ffffff]', border: 'border-[#134f5c]' },
  { id: 'gs-cyan-5',    label: 'Cian Oscuro',             bg: 'bg-[#134f5c]', text: 'text-[#ffffff]', border: 'border-[#0c343d]' },
  { id: 'gs-cyan-6',    label: 'Cian Muy Oscuro',         bg: 'bg-[#0c343d]', text: 'text-[#ffffff]', border: 'border-[#061a1e]' },

  // Column 6: Azul Aciano (Cornflower)
  { id: 'gs-corn-1',    label: 'Azul Aciano Pastel Muy Claro', bg: 'bg-[#c9daf8]', text: 'text-[#1c4587]', border: 'border-[#8ea9db]' },
  { id: 'gs-corn-2',    label: 'Azul Aciano Pastel Claro',     bg: 'bg-[#a4c2f4]', text: 'text-[#1c4587]', border: 'border-[#6d9eeb]' },
  { id: 'gs-corn-3',    label: 'Azul Aciano Medio',            bg: 'bg-[#8ea9db]', text: 'text-[#ffffff]', border: 'border-[#3c78d8]' },
  { id: 'gs-corn-4',    label: 'Azul Aciano Vibrante',         bg: 'bg-[#3c78d8]', text: 'text-[#ffffff]', border: 'border-[#1155cc]' },
  { id: 'gs-corn-5',    label: 'Azul Aciano Oscuro',           bg: 'bg-[#1155cc]', text: 'text-[#ffffff]', border: 'border-[#1c4587]' },
  { id: 'gs-corn-6',    label: 'Azul Aciano Muy Oscuro',       bg: 'bg-[#1c4587]', text: 'text-[#ffffff]', border: 'border-[#0e2243]' },

  // Column 7: Azul
  { id: 'gs-blue-1',    label: 'Azul Pastel Muy Claro',   bg: 'bg-[#cfe2f3]', text: 'text-[#073763]', border: 'border-[#9fc5e8]' },
  { id: 'gs-blue-2',    label: 'Azul Pastel Claro',       bg: 'bg-[#9fc5e8]', text: 'text-[#073763]', border: 'border-[#6fa8dc]' },
  { id: 'gs-blue-3',    label: 'Azul Medio',              bg: 'bg-[#6fa8dc]', text: 'text-[#ffffff]', border: 'border-[#3d85c6]' },
  { id: 'gs-blue-4',    label: 'Azul Vibrante',           bg: 'bg-[#3d85c6]', text: 'text-[#ffffff]', border: 'border-[#0b5394]' },
  { id: 'gs-blue-5',    label: 'Azul Oscuro',             bg: 'bg-[#0b5394]', text: 'text-[#ffffff]', border: 'border-[#073763]' },
  { id: 'gs-blue-6',    label: 'Azul Muy Oscuro',         bg: 'bg-[#073763]', text: 'text-[#ffffff]', border: 'border-[#031b31]' },

  // Column 8: Púrpura
  { id: 'gs-purple-1',  label: 'Púrpura Pastel Muy Claro', bg: 'bg-[#d9d2e9]', text: 'text-[#20124d]', border: 'border-[#8e7cc3]' },
  { id: 'gs-purple-2',  label: 'Púrpura Pastel Claro',     bg: 'bg-[#b4a7d6]', text: 'text-[#20124d]', border: 'border-[#674ea7]' },
  { id: 'gs-purple-3',  label: 'Púrpura Medio',            bg: 'bg-[#8e7cc3]', text: 'text-[#ffffff]', border: 'border-[#351c75]' },
  { id: 'gs-purple-4',  label: 'Púrpura Vibrante',         bg: 'bg-[#674ea7]', text: 'text-[#ffffff]', border: 'border-[#351c75]' },
  { id: 'gs-purple-5',  label: 'Púrpura Oscuro',           bg: 'bg-[#351c75]', text: 'text-[#ffffff]', border: 'border-[#20124d]' },
  { id: 'gs-purple-6',  label: 'Púrpura Muy Oscuro',       bg: 'bg-[#20124d]', text: 'text-[#ffffff]', border: 'border-[#100926]' },

  // Column 9: Magenta
  { id: 'gs-magenta-1', label: 'Magenta Pastel Muy Claro', bg: 'bg-[#ead1dc]', text: 'text-[#4c1130]', border: 'border-[#c27ba0]' },
  { id: 'gs-magenta-2', label: 'Magenta Pastel Claro',     bg: 'bg-[#d5a6bd]', text: 'text-[#4c1130]', border: 'border-[#a64d79]' },
  { id: 'gs-magenta-3', label: 'Magenta Medio',            bg: 'bg-[#c27ba0]', text: 'text-[#ffffff]', border: 'border-[#741b47]' },
  { id: 'gs-magenta-4', label: 'Magenta Vibrante',         bg: 'bg-[#a64d79]', text: 'text-[#ffffff]', border: 'border-[#741b47]' },
  { id: 'gs-magenta-5', label: 'Magenta Oscuro',           bg: 'bg-[#741b47]', text: 'text-[#ffffff]', border: 'border-[#4c1130]' },
  { id: 'gs-magenta-6', label: 'Magenta Muy Oscuro',       bg: 'bg-[#4c1130]', text: 'text-[#ffffff]', border: 'border-[#260818]' },

  // Column 10: Gris
  { id: 'gs-gray-1',    label: 'Gris Pastel Muy Claro',   bg: 'bg-[#f3f3f3]', text: 'text-[#434343]', border: 'border-[#d9d9d9]' },
  { id: 'gs-gray-2',    label: 'Gris Pastel Claro',       bg: 'bg-[#d9d9d9]', text: 'text-[#222222]', border: 'border-[#b7b7b7]' },
  { id: 'gs-gray-3',    label: 'Gris Medio',              bg: 'bg-[#b7b7b7]', text: 'text-[#ffffff]', border: 'border-[#808080]' },
  { id: 'gs-gray-4',    label: 'Gris Vibrante',           bg: 'bg-[#808080]', text: 'text-[#ffffff]', border: 'border-[#434343]' },
  { id: 'gs-gray-5',    label: 'Gris Oscuro',             bg: 'bg-[#434343]', text: 'text-[#ffffff]', border: 'border-[#222222]' },
  { id: 'gs-gray-6',    label: 'Negro / Gris Muy Oscuro', bg: 'bg-[#000000]', text: 'text-[#ffffff]', border: 'border-[#222222]' }
];

const FALLBACK_COLOR: ColorOption = { id: 'gs-gray-1', label: 'Gris Pastel Muy Claro', bg: 'bg-[#f3f3f3]', text: 'text-[#434343]', border: 'border-[#d9d9d9]' };

/** Resuelve un colorId al objeto ColorOption completo. */
export const getColor = (colorId: string): ColorOption => {
  // Backward compatibility maps
  let idToFind = colorId;
  if (idToFind === 'gs-red') idToFind = 'gs-red-1';
  else if (idToFind === 'gs-orange') idToFind = 'gs-orange-1';
  else if (idToFind === 'gs-yellow') idToFind = 'gs-yellow-1';
  else if (idToFind === 'gs-green') idToFind = 'gs-green-1';
  else if (idToFind === 'gs-cyan') idToFind = 'gs-cyan-1';
  else if (idToFind === 'gs-corn') idToFind = 'gs-corn-1';
  else if (idToFind === 'gs-blue') idToFind = 'gs-blue-1';
  else if (idToFind === 'gs-purple') idToFind = 'gs-purple-1';
  else if (idToFind === 'gs-magenta') idToFind = 'gs-magenta-1';
  else if (idToFind === 'gs-gray') idToFind = 'gs-gray-1';

  const found = AVAILABLE_COLORS.find(c => c.id === idToFind);
  if (found) return found;

  // Fallback seguro si la base de datos tiene una cadena de clases Tailwind (datos históricos)
  if (colorId && colorId.includes(' ')) {
    const parts = colorId.split(' ');
    const bg = parts.find(p => p.startsWith('bg-')) ?? 'bg-slate-100';
    const text = parts.find(p => p.startsWith('text-')) ?? 'text-slate-800';
    const border = parts.find(p => p.startsWith('border-')) ?? 'border-slate-200';
    return { id: colorId, label: 'Personalizado', bg, text, border };
  }

  return FALLBACK_COLOR;
};
