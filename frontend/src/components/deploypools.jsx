import React, { useState } from 'react';
import { ethers } from 'ethers';
import '../css/deploypools.css';

const CreateUniswapPool = () => {
  const [formData, setFormData] = useState({
    BaseTokenAddress: '',
    CollateralTokenAddress: '',
    BaseTokenDecimals: '',
    CollateralTokenDecimals: '',
    PoolFee: '',
    BaseTokenAmount: '',
    QuoteTokenAmount: '',
    PriceToken1: '',
    PriceToken0: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/createUniswapPools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      alert(`Pool created successfully at address: ${data.poolAddress}`);
    } catch (error) {
      console.error('Error creating pool:', error);
      alert('Failed to create pool. Check console for details.');
    }
  };

  return (
    <div className="container">
      <div className="glass-tile">
        <h1>Create Uniswap Pool</h1>
        <form onSubmit={handleSubmit}>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input
                type="text"
                name={key}
                value={value}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          ))}
          <button type="submit" className="deploy-button">Create Pool</button>
        </form>
      </div>
    </div>
  );
};

export default CreateUniswapPool;
