// src/components/ui/RefreshButton.jsx
// Botão de refresh para atualizar dados do cache
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const RefreshButton = ({ 
  onRefresh, 
  label = "Atualizar", 
  showLabel = true,
  size = "medium",
  variant = "default" 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      // Delay mínimo para feedback visual
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const sizeClasses = {
    small: { button: 'px-2 py-1 text-xs', icon: 14 },
    medium: { button: 'px-3 py-2 text-sm', icon: 16 },
    large: { button: 'px-4 py-2.5 text-base', icon: 18 }
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
  };

  const { button: sizeClass, icon: iconSize } = sizeClasses[size] || sizeClasses.medium;
  const variantClass = variantClasses[variant] || variantClasses.default;

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClass}
        ${variantClass}
      `}
      title={isRefreshing ? "Atualizando..." : "Atualizar dados"}
    >
      <RefreshCw 
        size={iconSize} 
        className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
      />
      {showLabel && (
        <span>{isRefreshing ? "Atualizando..." : label}</span>
      )}
    </button>
  );
};

// Versão compacta para usar em headers
export const RefreshIconButton = ({ onRefresh, className = "" }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      className={`
        p-2 rounded-full
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-700 dark:hover:bg-gray-600
        text-gray-600 dark:text-gray-300
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isRefreshing ? "Atualizando..." : "Atualizar dados"}
    >
      <RefreshCw 
        size={18} 
        className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
      />
    </button>
  );
};

// Hook para gerenciar estado de refresh
export const useRefreshState = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = async (refreshFn) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshFn?.();
      setLastRefresh(new Date());
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return { isRefreshing, lastRefresh, refresh };
};

export default RefreshButton;
