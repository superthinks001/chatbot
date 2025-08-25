import React from 'react';

interface BiasWarningProps {
  bias?: boolean;
  uncertainty?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const BiasWarning: React.FC<BiasWarningProps> = ({ bias, uncertainty, size = 'medium' }) => {
  if (!bias && !uncertainty) return null;
  
  const sizeStyles = {
    small: { fontSize: '10px', padding: '2px 6px' },
    medium: { fontSize: '12px', padding: '4px 8px' },
    large: { fontSize: '14px', padding: '6px 12px' }
  };
  
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {bias && (
        <span
          style={{
            backgroundColor: '#ff9800',
            color: 'white',
            borderRadius: '12px',
            padding: sizeStyles[size].padding,
            fontSize: sizeStyles[size].fontSize,
            fontWeight: 'bold',
            display: 'inline-block'
          }}
          aria-label="Bias warning detected"
          title="This response may contain bias"
        >
          ⚠️ Bias
        </span>
      )}
      {uncertainty && (
        <span
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '12px',
            padding: sizeStyles[size].padding,
            fontSize: sizeStyles[size].fontSize,
            fontWeight: 'bold',
            display: 'inline-block'
          }}
          aria-label="Uncertainty warning"
          title="This response has low confidence"
        >
          ❓ Uncertainty
        </span>
      )}
    </div>
  );
};

export default BiasWarning;
