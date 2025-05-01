import React, { useState, useEffect } from "react";

/**
 * Componente para entrada de valores monetários
 * @param {Object} props - Propriedades do componente
 * @param {number|string} props.value - Valor atual
 * @param {Function} props.onChange - Função a ser chamada quando o valor mudar
 * @param {string} props.placeholder - Texto de placeholder
 * @param {boolean} props.disabled - Se o input está desabilitado
 * @param {string} props.className - Classes CSS adicionais
 * @returns {JSX.Element} Componente CurrencyInput
 */
const CurrencyInput = ({ 
  value, 
  onChange, 
  placeholder = "0,00", 
  disabled = false,
  className = "",
  showPrefix = true
}) => {
  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    if (value !== undefined && value !== null) {
      // Formata o valor apenas para exibição, sem conversões que possam perder precisão
      const formattedValue = formatCurrency(value);
      setInputValue(formattedValue);
    } else {
      setInputValue('');
    }
  }, [value]);

  /**
   * Formata um valor para moeda brasileira (R$)
   * @param {number|string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    
    // Converter string para número preservando todos os dígitos
    // Não dividimos por 100 para preservar o valor exato
    let numericValue = value.toString().replace(/\D/g, '');
    
    // Se for zero, retorne zero formatado
    if (parseInt(numericValue) === 0) return '0,00';
    
    // Formata o valor para exibição
    // Para números inteiros, adiciona decimais
    if (numericValue.length === 1) numericValue = '0,0' + numericValue;
    else if (numericValue.length === 2) numericValue = '0,' + numericValue;
    else {
      // Insere a vírgula no lugar correto para valores maiores
      const intPart = numericValue.slice(0, numericValue.length - 2);
      const decPart = numericValue.slice(numericValue.length - 2);
      
      // Formata a parte inteira com pontos para milhares
      let formattedIntPart = '';
      for (let i = intPart.length - 1, count = 0; i >= 0; i--, count++) {
        if (count !== 0 && count % 3 === 0) {
          formattedIntPart = '.' + formattedIntPart;
        }
        formattedIntPart = intPart[i] + formattedIntPart;
      }
      
      numericValue = formattedIntPart + ',' + decPart;
    }
    
    return numericValue;
  };

  /**
   * Manipula a mudança no input
   * @param {Event} e - Evento do input
   */
  const handleChange = (e) => {
    const rawValue = e.target.value;
    // Remove todos os caracteres não numéricos
    const numericValue = rawValue.replace(/\D/g, '');
    
    if (numericValue === '') {
      setInputValue('');
      onChange('');
      return;
    }
    
    // Armazena o valor numérico para o modelo de dados
    onChange(numericValue);
    
    // Formata o valor para exibição
    const formattedValue = formatCurrency(numericValue);
    setInputValue(formattedValue);
  };

  /**
   * Manipula o foco no input
   * @param {Event} e - Evento de foco
   */
  const handleFocus = (e) => {
    // Seleciona todo o texto ao focar
    e.target.select();
  };

  /**
   * Manipula a tecla pressionada
   * @param {Event} e - Evento de keydown
   */
  const handleKeyDown = (e) => {
    // Permite navegação com setas, backspace, delete, tab, etc.
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    
    // Permite dígitos numéricos e teclado numérico
    const isNumeric = /^\d$/.test(e.key) || (e.key >= 'Numpad0' && e.key <= 'Numpad9');
    
    if (!isNumeric && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`currency-input-wrapper ${className}`}>
      {showPrefix && <div className="currency-prefix">R$</div>}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`currency-input ${showPrefix ? 'with-prefix' : ''}`}
        aria-label="Valor em reais"
      />
    </div>
  );
};

export default CurrencyInput;