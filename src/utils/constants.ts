export const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export type ColorOption = { id: string; label: string; bg: string; text: string; border: string; };

export const AVAILABLE_COLORS: ColorOption[] = [
  // Rojos
  { id: 'red-light',   label: 'Rojo claro',     bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200'    },
  { id: 'red-mid',     label: 'Rojo',            bg: 'bg-red-200',    text: 'text-red-900',    border: 'border-red-300'    },
  // Rosas
  { id: 'pink-light',  label: 'Rosa claro',      bg: 'bg-pink-100',   text: 'text-pink-800',   border: 'border-pink-200'   },
  { id: 'pink-mid',    label: 'Rosa',            bg: 'bg-pink-200',   text: 'text-pink-900',   border: 'border-pink-300'   },
  // Morados
  { id: 'purple-light',label: 'Morado claro',    bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { id: 'purple-mid',  label: 'Morado',          bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-300' },
  // Violeta
  { id: 'violet-light',label: 'Violeta',         bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
  // Índigo
  { id: 'indigo-light',label: 'Índigo claro',    bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { id: 'indigo-mid',  label: 'Índigo',          bg: 'bg-indigo-200', text: 'text-indigo-900', border: 'border-indigo-300' },
  // Azul
  { id: 'blue-light',  label: 'Azul claro',      bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  { id: 'blue-mid',    label: 'Azul',            bg: 'bg-blue-200',   text: 'text-blue-900',   border: 'border-blue-300'   },
  // Celeste
  { id: 'sky-light',   label: 'Celeste',         bg: 'bg-sky-100',    text: 'text-sky-800',    border: 'border-sky-200'    },
  // Cian
  { id: 'cyan-light',  label: 'Cian claro',      bg: 'bg-cyan-100',   text: 'text-cyan-800',   border: 'border-cyan-200'   },
  { id: 'cyan-mid',    label: 'Cian',            bg: 'bg-cyan-200',   text: 'text-cyan-900',   border: 'border-cyan-300'   },
  // Verde azulado
  { id: 'teal-light',  label: 'Verde azulado',   bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-200'   },
  { id: 'teal-mid',    label: 'Verde oscuro',    bg: 'bg-teal-200',   text: 'text-teal-900',   border: 'border-teal-300'   },
  // Verde
  { id: 'green-light', label: 'Verde claro',     bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200'  },
  { id: 'green-mid',   label: 'Verde',           bg: 'bg-green-200',  text: 'text-green-900',  border: 'border-green-300'  },
  { id: 'emerald',     label: 'Esmeralda',       bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200'},
  // Lima
  { id: 'lime-light',  label: 'Lima claro',      bg: 'bg-lime-100',   text: 'text-lime-800',   border: 'border-lime-200'   },
  { id: 'lime-mid',    label: 'Lima',            bg: 'bg-lime-200',   text: 'text-lime-900',   border: 'border-lime-300'   },
  // Amarillo
  { id: 'yellow-light',label: 'Amarillo claro',  bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  { id: 'yellow-mid',  label: 'Amarillo',        bg: 'bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-300' },
  // Ámbar
  { id: 'amber-light', label: 'Ámbar claro',     bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200'  },
  { id: 'amber-mid',   label: 'Ámbar',           bg: 'bg-amber-200',  text: 'text-amber-900',  border: 'border-amber-300'  },
  // Naranja
  { id: 'orange-light',label: 'Naranja claro',   bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { id: 'orange-mid',  label: 'Naranja',         bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-300' },
  // Rosa oscuro / Coral
  { id: 'rose-light',  label: 'Coral claro',     bg: 'bg-rose-100',   text: 'text-rose-800',   border: 'border-rose-200'   },
  { id: 'rose-mid',    label: 'Coral',           bg: 'bg-rose-200',   text: 'text-rose-900',   border: 'border-rose-300'   },
  // Fucsia
  { id: 'fuchsia',     label: 'Fucsia',          bg: 'bg-fuchsia-100',text: 'text-fuchsia-800',border: 'border-fuchsia-200'},
  // Neutros
  { id: 'slate',       label: 'Gris azulado',    bg: 'bg-slate-100',  text: 'text-slate-800',  border: 'border-slate-200'  },
  { id: 'gray',        label: 'Gris',            bg: 'bg-gray-200',   text: 'text-gray-800',   border: 'border-gray-300'   },
];

const FALLBACK_COLOR: ColorOption = { id: 'slate', label: 'Gris', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };

/** Resuelve un colorId (p.ej. 'blue-light') al objeto ColorOption completo. */
export const getColor = (colorId: string): ColorOption =>
  AVAILABLE_COLORS.find(c => c.id === colorId) ?? FALLBACK_COLOR;
