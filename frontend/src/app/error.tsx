'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'var(--bg, #0a0a0f)',
      color: 'var(--text, #e0e0e0)',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 1rem' }}>Something went wrong</h1>
        <button 
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'var(--accent, #6366f1)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
