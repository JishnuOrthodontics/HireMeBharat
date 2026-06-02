import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    
    // Automatically intercept chunk loading errors (Vite production bundle upgrades) and reload the page
    const errorStr = ((error?.toString() || '') + ' ' + (error?.message || '') + ' ' + (error?.stack || '')).toLowerCase();
    if (
      errorStr.includes('failed to fetch dynamically imported module') ||
      errorStr.includes('chunkloaderror') ||
      errorStr.includes('loading chunk') ||
      errorStr.includes('failed to fetch')
    ) {
      console.warn('Chunk loading error detected! Force-reloading the platform...');
      window.location.reload();
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#131313',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '32px' }}>
                warning
              </span>
            </div>
            
            <h1 style={{
              color: '#ffffff',
              fontSize: '22px',
              fontWeight: 600,
              marginBottom: '12px',
            }}>
              Something went wrong
            </h1>
            
            <p style={{
              color: '#bbcbb8',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}>
              An unexpected system error occurred. We have logged this issue and our team is on it.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'left',
                marginBottom: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                maxHeight: '120px',
                overflowY: 'auto',
              }}>
                <code style={{
                  color: '#ef4444',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(90deg, #50fa7b, #d4af37)',
                color: '#131313',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                boxShadow: '0 4px 12px rgba(80, 250, 123, 0.2)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
