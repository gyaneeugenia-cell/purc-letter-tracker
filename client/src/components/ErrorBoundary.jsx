import { Component } from 'react';

// Catches any rendering error in the tree below it and shows a friendly
// fallback instead of a blank white screen — important after deployment.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong' };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-white p-6 text-center dark:bg-slate-900">
          <div className="max-w-md">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
              <span className="text-2xl font-black">!</span>
            </div>
            <h1 className="text-xl font-black text-ink dark:text-white">Something went wrong</h1>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-300">
              The page hit an unexpected error. You can return to the dashboard and try again.
            </p>
            <button onClick={this.handleReset} className="primary-button mx-auto mt-5">Back to dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
