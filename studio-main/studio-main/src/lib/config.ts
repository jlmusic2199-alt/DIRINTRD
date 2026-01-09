import { Pencil, Banknote, Printer, Scissors, PackageCheck, Truck, Building, ShieldAlert, ChevronUp, ChevronsUp, Minus } from 'lucide-react';

type StatusConfig = { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  name: string;
};

export const getStatusConfig = (status?: string): StatusConfig => {
  if (!status) return { icon: Building, color: 'bg-gray-500', label: 'Desconocido', name: 'Desconocido' };
  
  const statusMap: { [key: string]: Omit<StatusConfig, 'name'> } = {
    'Diseño/Atencion al cliente': { icon: Pencil, color: 'bg-blue-500', label: 'Diseño y Atención' },
    'Facturacion': { icon: Banknote, color: 'bg-red-500', label: 'Facturación' },
    'Impresion': { icon: Printer, color: 'bg-yellow-500', label: 'Impresión' },
    'Terminacion': { icon: Scissors, color: 'bg-purple-500', label: 'Terminación' },
    'Listo para entregar': { icon: PackageCheck, color: 'bg-cyan-500', label: 'Listo para entregar' },
    'Entregado': { icon: Truck, color: 'bg-green-500', label: 'Entregado' },
  };
  
  const config = statusMap[status] || { icon: Building, color: 'bg-gray-500', label: status };

  return { ...config, name: status };
};

export const getPriorityConfig = (priority?: 'Urgente' | 'Alta' | 'Normal' | 'Baja') => {
  if (!priority) return null;
  
  const priorityMap: { [key in typeof priority]: { icon: React.ElementType; color: string; bgColor: string } } = {
    'Urgente': { icon: ShieldAlert, color: 'text-red-400', bgColor: 'bg-red-900/30' },
    'Alta': { icon: ChevronsUp, color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
    'Normal': { icon: ChevronUp, color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
    'Baja': { icon: Minus, color: 'text-gray-400', bgColor: 'bg-gray-700/30' },
  };
  
  return priorityMap[priority];
};
