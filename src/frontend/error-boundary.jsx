import React from "react";
import { SectionMessage, Button, Text, Stack } from "@forge/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log error for debugging
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SectionMessage appearance="error" title="Something went wrong">
          <Stack space="space.200">
            <Text>
              The Team Capacity Dashboard encountered an unexpected error.
              Please try refreshing the page or contact support if the problem
              persists.
            </Text>
            <Button
              appearance="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            {process.env.NODE_ENV === "development" && (
              <details style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
                <summary>Error Details (Development Only)</summary>
                <Text size="small">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </Text>
              </details>
            )}
          </Stack>
        </SectionMessage>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
