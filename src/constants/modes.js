export const MODES = [
  { id: 'ingreso',   label: 'Ingreso Bodega',        icon: '📥', color: '#10b981', action: 'add' },
  { id: 'venta',     label: 'Salida Venta',           icon: '🛒', color: '#f59e0b', action: 'subtract' },
  { id: 'traslado',  label: 'Salida Traslado',        icon: '🚚', color: '#8b5cf6', action: 'subtract' },
  { id: 'consulta',  label: 'Consulta',               icon: '🔍', color: '#3b82f6', action: 'query' },
];

export const WHISPER_API = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo';
