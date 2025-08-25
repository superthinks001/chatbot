import React, { useEffect, useState } from 'react';

const BiasLogsAdmin: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/bias-logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError('Failed to fetch bias/fairness logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Bias/Fairness Log (Last 100 Entries)</h2>
      <button onClick={fetchLogs} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid #ccc', padding: 12 }}>
        {logs.length === 0 && !loading && <div>No bias/fairness log entries found.</div>}
        {logs.map((log, idx) => (
          <pre key={idx} style={{ background: '#f9f9f9', margin: '8px 0', padding: 8, borderRadius: 4, fontSize: 12 }}>
            {log}
          </pre>
        ))}
      </div>
    </div>
  );
};

export default BiasLogsAdmin; 