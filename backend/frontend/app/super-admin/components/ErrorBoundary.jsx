"use client";

import React from "react";
import {
  AlertTriangle,
  RefreshCcw,
  Home,
} from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("Error Boundary:", error);
    console.error(info);

    // TODO:
    // Send error to backend
    // POST /api/v1/system/error-log
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  goDashboard = () => {
    window.location.href = "/super-admin";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">

          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle
              size={40}
              className="text-red-400"
            />
          </div>

          <h1 className="text-3xl font-extrabold">
            Something went wrong
          </h1>

          <p className="text-slate-400 mt-4 leading-7">
            A system error occurred while rendering this page.
            The error has been logged for investigation.
          </p>

          {process.env.NODE_ENV === "development" &&
            this.state.error && (
              <pre className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left text-xs overflow-auto text-red-300">
                {this.state.error.toString()}
              </pre>
            )}

          <div className="grid grid-cols-2 gap-4 mt-8">

            <button
              onClick={this.retry}
              className="bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} />
              Retry
            </button>

            <button
              onClick={this.goDashboard}
              className="bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <Home size={18} />
              Dashboard
            </button>

          </div>

        </div>
      </div>
    );
  }
}