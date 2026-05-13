export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const DEFAULT_CATEGORIES = [
  { id: 'super', name: 'Super', emoji: '🛒', color: '#84cc16' },
  { id: 'comida', name: 'Comida', emoji: '🍕', color: '#fb923c' },
  { id: 'transporte', name: 'Transporte', emoji: '🚗', color: '#60a5fa' },
  { id: 'entretenimiento', name: 'Entretenimiento', emoji: '🎬', color: '#a78bfa' },
  { id: 'indumentaria', name: 'Indumentaria', emoji: '👕', color: '#f472b6' },
  { id: 'salud', name: 'Salud', emoji: '💊', color: '#34d399' },
  { id: 'hogar', name: 'Hogar', emoji: '🏠', color: '#fbbf24' },
  { id: 'tecnologia', name: 'Tecno', emoji: '💻', color: '#22d3ee' },
  { id: 'suscripciones', name: 'Suscripciones', emoji: '📺', color: '#c084fc' },
  { id: 'otros', name: 'Otros', emoji: '📦', color: '#9ca3af' },
];

export const DEFAULT_CARDS = [
  { id: 'card-1', name: 'Visa', closingDay: 15, color: '#3b82f6' },
  { id: 'card-2', name: 'Mastercard', closingDay: 22, color: '#ef4444' },
];

export const CUOTA_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

export const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#84cc16', '#f59e0b', '#a855f7',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#8b5cf6',
];

export const EMOJI_OPTIONS = [
  '🛒', '🍕', '🍔', '🍣', '☕', '🚗', '🚌', '✈️', '🎬', '🎮',
  '🎵', '📚', '👕', '👟', '💄', '💊', '🏠', '🛏️', '🔧', '💻',
  '📱', '🎧', '📺', '💳', '🎁', '🎂', '💰', '📦', '🐕', '🌱',
];

export const STORAGE_KEYS = {
  expenses: 'finanzas:expenses:v2',
  cards: 'finanzas:cards:v2',
  categories: 'finanzas:categories:v2',
  recurring: 'finanzas:recurring:v2',
  budget: 'finanzas:budget:v2',
};
