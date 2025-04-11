import React, { useState } from 'react';
import axios from 'axios';
import { isAddress } from 'ethers';
import "../css/deploypools.css"

export function SetupUniswapForm() {
  const [formData, setFormData] = useState({
    token0Address: '',
    token1Address: '',
    token0Decimals: '',
    token1Decimals: '',
    token0Amount: '',
    token1Amount: '',
    token0Price: '',
    token1Price: '',
    fee: '',
    chain: 'celo',
    chainId: ''
  });

  const [errors, setErrors] = useState({});

  const isValidAddress = (address) => isAddress(address);
  const isValidNumber = (value, allowFloat = false) =>
    allowFloat ? !isNaN(parseFloat(value)) && parseFloat(value) > 0
               : !isNaN(parseInt(value)) && parseInt(value) > 0;
  const isValidFee = (fee) => [500, 3000, 10000, 100].includes(parseFloat(fee));

  const validateField = (name, value) => {
    switch (name) {
      case 'token0Address':
      case 'token1Address':
        return isValidAddress(value) ? '' : 'Invalid Ethereum address';
      case 'token0Decimals':
      case 'token1Decimals':
      case 'chainId':
        return isValidNumber(value) ? '' : 'Enter a valid integer > 0';
      case 'token0Amount':
      case 'token1Amount':
      case 'token0Price':
      case 'token1Price':
        return isValidNumber(value, true) ? '' : 'Enter a valid number > 0';
      case 'fee':
        return isValidFee(value) ? '' : 'Fee must be 0.01, 0.05, 0.3 or 1';
      case 'chain':
        return value ? '' : 'Chain is required';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  const isFormValid = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      alert('Please fix the errors before submitting.');
      return;
    }

    try {
      const payload = {
        token0Address: formData.token0Address,
        token1Address: formData.token1Address,
        token0Decimals: parseInt(formData.token0Decimals),
        token1Decimals: parseInt(formData.token1Decimals),
        token0Amount: formData.token0Amount,
        token1Amount: formData.token1Amount,
        token0Price: formData.token0Price,
        token1Price: formData.token1Price,
        fee: parseFloat(formData.fee),
        chain: formData.chain,
        chainId: parseInt(formData.chainId)
      };

      const response = await axios.post('http://localhost:5000/setup-uniswap', payload);
      alert(`Success! Pool Address: ${response.data.poolAddress}`);
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form-box">
        <h2 className="form-title">Uniswap Pool Setup</h2>

        {[
          ['token0Address', 'Token 0 Address'],
          ['token1Address', 'Token 1 Address'],
          ['token0Decimals', 'Token 0 Decimals'],
          ['token1Decimals', 'Token 1 Decimals'],
          ['token0Amount', 'Token 0 Amount (raw)'],
          ['token1Amount', 'Token 1 Amount (raw)'],
          ['token0Price', 'Token 0 Price'],
          ['token1Price', 'Token 1 Price'],
          ['fee', 'Uniswap Fee Tier (0.01, 0.05, 0.3, 1)'],
          ['chain', 'Chain (celo or arbSepolia)'],
          ['chainId', 'Chain ID (e.g., 42220 for Celo)']
        ].map(([name, label]) => (
          <div key={name} className="form-group">
            <label className="form-label">{label}</label>
            <input
              type="text"
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className={`form-input ${errors[name] ? 'input-error' : ''}`}
              required
            />
            {errors[name] && <p className="error-msg">{errors[name]}</p>}
          </div>
        ))}

        <button type="submit" className="submit-button">
          Setup Uniswap Pool & Add Liquidity
        </button>
      </form>
    </div>
  );
}
