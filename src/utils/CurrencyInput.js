import React, { useState, useEffect } from "react";

const CurrencyInput = ({
  value,
  onChange,
  placeholder = "0,00",
  disabled = false,
  className = "",
  showPrefix = true
}) => {
  const [inputValue, setInputValue] = useState("");

  // sempre que o `value` mudar, refazemos a exibição
  useEffect(() => {
    if (value === "" || value == null) {
      setInputValue("");
    } else {
      setInputValue(formatCurrency(value));
    }
  }, [value]);

  // agora assumimos que `value` é um número de REAIS (ex: 3000)
  const formatCurrency = (value) => {
    // aceita string ou número
    const num = typeof value === "string"
      ? parseInt(value.replace(/\D/g, ""), 10) || 0
      : value;
    
    // se for zero ou string vazia, retorna vazio
    if (num === 0 || num === "") return "";
    
    // usa toLocaleString pra agrupar e criar duas casas decimais
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    
    // se estiver vazio, limpa o input
    if (raw === "") {
      setInputValue("");
      onChange("");
      return;
    }

    // Converte para número e divide por 100 para tratar como centavos
    const numericValue = Number(raw) / 100;
    
    // atualiza o estado de exibição
    setInputValue(formatCurrency(numericValue));
    // avisa o pai com o valor em reais
    onChange(numericValue);
  };

  return (
    <div className={`currency-input-wrapper ${className}`}>
      {showPrefix && <div className="currency-prefix">R$</div>}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`currency-input ${showPrefix ? "with-prefix" : ""}`}
      />
    </div>
  );
};

export default CurrencyInput;
