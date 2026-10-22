import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Airpulse ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 24px',
          margin: '20px auto',
          maxWidth: '800px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          color: '#F87171',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', marginBottom: '16px' }}>
            <AlertTriangle size={32} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>
            {this.props.title || 'Component Error Encountered'}
          </h3>
          <p style={{ fontSize: '14px', color: '#E2E8F0', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#FF5722',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

