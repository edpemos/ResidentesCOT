export const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export type ColorOption = { id: string; label: string; bg: string; text: string; border: string; };

export const AVAILABLE_COLORS: ColorOption[] = [
  { id: 'gs-red',     label: 'Rojo (Google Sheets)',      bg: 'bg-[#f4cccc]', text: 'text-[#990000]', border: 'border-[#e06666]' },
  { id: 'gs-orange',  label: 'Naranja (Google Sheets)',   bg: 'bg-[#fce5cd]', text: 'text-[#b45f06]', border: 'border-[#f6b26b]' },
  { id: 'gs-yellow',  label: 'Amarillo (Google Sheets)',  bg: 'bg-[#fff2cc]', text: 'text-[#7f6000]', border: 'border-[#ffd966]' },
  { id: 'gs-green',   label: 'Verde (Google Sheets)',     bg: 'bg-[#d9ead3]', text: 'text-[#274e13]', border: 'border-[#93c47d]' },
  { id: 'gs-cyan',    label: 'Cian (Google Sheets)',      bg: 'bg-[#d0e0e3]', text: 'text-[#0c343d]', border: 'border-[#76a5af]' },
  { id: 'gs-corn',    label: 'Azul Aciano (Google)',      bg: 'bg-[#c9daf8]', text: 'text-[#1c4587]', border: 'border-[#8ea9db]' },
  { id: 'gs-blue',    label: 'Azul (Google Sheets)',      bg: 'bg-[#cfe2f3]', text: 'text-[#073763]', border: 'border-[#9fc5e8]' },
  { id: 'gs-purple',  label: 'Púrpura (Google Sheets)',   bg: 'bg-[#d9d2e9]', text: 'text-[#20124d]', border: 'border-[#8e7cc3]' },
  { id: 'gs-magenta', label: 'Magenta (Google Sheets)',   bg: 'bg-[#ead1dc]', text: 'text-[#4c1130]', border: 'border-[#c27ba0]' },
  { id: 'gs-gray',    label: 'Gris (Google Sheets)',      bg: 'bg-[#efefef]', text: 'text-[#434343]', border: 'border-[#cccccc]' }
];

const FALLBACK_COLOR: ColorOption = { id: 'gs-gray', label: 'Gris', bg: 'bg-[#efefef]', text: 'text-[#434343]', border: 'border-[#cccccc]' };

/** Resuelve un colorId (p.ej. 'gs-red' o string de clases) al objeto ColorOption completo. */
export const getColor = (colorId: string): ColorOption => {
  const found = AVAILABLE_COLORS.find(c => c.id === colorId);
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
