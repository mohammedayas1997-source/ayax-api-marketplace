import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PricingTable = () => {
  const [plans, setPlans] = useState([]);
  const [isVipMember, setIsVipMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/services/pricing', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPlans(response.data.data);
        setIsVipMember(response.data.isVipMember);
      }
    } catch (err) {
      console.error("Failed to load prices", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading prices...</div>;

  return (
    <div className="pricing-container">
      {/* Sanarwa ta musamman ga shi kadai idan Admin ya kunna masa */}
      {isVipMember && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          <span>⚡</span>
          <span>Dedicated Private API Bandwidth Active: Exclusive wholesale rates applied to your terminal.</span>
        </div>
      )}

      {/* Teburin Farashi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((item) => (
          <div key={item.id} className="price-card" style={{
            border: item.isCustomRate ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            background: '#ffffff'
          }}>
            <h4>{item.serviceName}</h4>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: item.isCustomRate ? '#0284c7' : '#0f172a' }}>
              ₦{item.sellingPrice.toLocaleString()}
            </div>
            
            {item.isCustomRate && (
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                marginTop: '6px'
              }}>
                CUSTOM RATE
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingTable;