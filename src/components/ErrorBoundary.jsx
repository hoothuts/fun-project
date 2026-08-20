import { Component } from 'react';

export default function ErrorBoundary({ children }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p className="eyebrow" style={{ color: 'var(--red)' }}>TIMING SCREEN RECOVERY</p>
          <h1 className="display" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>SIGNAL LOST</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontFamily: 'var(--font-mono)' }}>
            {this.state.error?.message || 'An unexpected telemetry error occurred.'}
          </p>
          <button
            className="season-pill active"
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = 'teams';
            }}
          >
            RETURN TO GRID
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
