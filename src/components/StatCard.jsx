import React from 'react';

const StatCard = ({ icon, label, value, trend, trendValue, colorClass, iconColorClass }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconColorClass}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-details">
        <h6>{label}</h6>
        <h3>{value}</h3>
        <span className={`trend ${trend}`}>
          <i className={`bi ${trend === 'up' ? 'bi-arrow-up-short' : 'bi-arrow-down-short'}`}></i> 
          {trendValue}
        </span>
      </div>
    </div>
  );
};

export default StatCard;
