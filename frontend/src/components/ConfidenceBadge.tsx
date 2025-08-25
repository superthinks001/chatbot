import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number;
  size: 'small' | 'medium' | 'large';
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, size }) => {
  const percentage = Math.round(confidence * 100);
  
  // Color coding based on confidence level
  let color = '#388e3c'; // Darker green for high confidence
  if (confidence < 0.7) color = '#f57c00'; // Darker orange for medium confidence
  if (confidence < 0.5) color = '#b71c1c'; // Dark red for low confidence
  
  const sizeStyles = {
    small: { fontSize: '10px', padding: '2px 6px' },
    medium: { fontSize: '12px', padding: '4px 8px' },
    large: { fontSize: '14px', padding: '6px 12px' }
  };
  
  return (
    <span
      style={{
        backgroundColor: color,
        color: 'white',
        borderRadius: '12px',
        padding: sizeStyles[size].padding,
        fontSize: sizeStyles[size].fontSize,
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '40px',
        textAlign: 'center'
      }}
      aria-label={`Confidence level: ${percentage}%`}
      title={`Confidence: ${percentage}%`}
      role="status"
    >
      {percentage}%
    </span>
  );
};

export default ConfidenceBadge;
