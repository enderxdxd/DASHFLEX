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
    // se for zero, exibe "0,00"
    if (num === 0) return "0,00";
    // usa toLocaleString pra agrupar e criar duas casas decimais
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e) => {
    // tira tudo que não é dígito
    const raw = e.target.value.replace(/\D/g, "");
    // atualiza o estado de exibição
    setInputValue(formatCurrency(raw));
    // avisa o pai com o número inteiro de reais
    onChange(raw === "" ? "" : Number(raw));
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
