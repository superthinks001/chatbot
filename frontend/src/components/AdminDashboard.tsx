import React, { useEffect, useState } from 'react';

const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, usersRes, logsRes, documentsRes] = await Promise.all([
          fetch('/api/chat/admin/analytics').then(r => r.json()),
          fetch('/api/chat/admin/users').then(r => r.json()),
          fetch('/api/chat/bias-logs').then(r => r.json()),
          fetch('/api/chat/admin/documents').then(r => r.json()),
        ]);
        setAnalytics(analyticsRes.summary || []);
        setUsers(usersRes.users || []);
        setLogs(logsRes.logs || []);
        setDocuments(documentsRes.documents || []);
      } catch (err) {
        setError('Failed to fetch admin data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await fetch('/api/chat/admin/documents/reindex', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Reindexing triggered');
    } catch (err) {
      alert('Failed to trigger reindexing');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1>Admin Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {/* Analytics */}
      <section style={{ marginBottom: 32 }}>
        <h2>Analytics</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Event Type</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((row, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{row.event_type}</td>
                <td style={{ padding: 8 }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Users */}
      <section style={{ marginBottom: 32 }}>
        <h2>Users</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'left', padding: 8 }}>County</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Language</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{user.name}</td>
                <td style={{ padding: 8 }}>{user.county}</td>
                <td style={{ padding: 8 }}>{user.email}</td>
                <td style={{ padding: 8 }}>{user.language}</td>
                <td style={{ padding: 8 }}>{user.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Bias/Fairness Logs */}
      <section style={{ marginBottom: 32 }}>
        <h2>Bias/Fairness Logs</h2>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', padding: 12, background: '#fafafa' }}>
          {logs.length === 0 && <div>No bias/fairness log entries found.</div>}
          {logs.map((log, idx) => (
            <pre key={idx} style={{ background: '#f9f9f9', margin: '8px 0', padding: 8, borderRadius: 4, fontSize: 12 }}>
              {log}
            </pre>
          ))}
        </div>
      </section>
      {/* Document Management */}
      <section style={{ marginBottom: 32 }}>
        <h2>Document Management</h2>
        <div style={{ marginBottom: 16 }}>
          <button 
            onClick={handleReindex} 
            disabled={reindexing}
            style={{ 
              padding: '8px 16px', 
              background: '#764ba2', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4,
              cursor: reindexing ? 'not-allowed' : 'pointer'
            }}
          >
            {reindexing ? 'Reindexing...' : 'Reindex All Documents'}
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'left', padding: 8 }}>County</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Path</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{doc.name}</td>
                <td style={{ padding: 8 }}>{doc.county}</td>
                <td style={{ padding: 8 }}>
                  <span style={{ 
                    color: doc.indexed ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {doc.indexed ? 'Indexed' : 'Not Indexed'}
                  </span>
                </td>
                <td style={{ padding: 8, fontSize: 12, color: '#666' }}>{doc.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Advanced Testing Placeholder */}
      <section style={{ marginBottom: 32 }}>
        <h2>Advanced Testing & QA</h2>
        <div style={{ color: '#888' }}>[Test harness and QA tools coming soon]</div>
      </section>
    </div>
  );
};

export default AdminDashboard; 