import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('Frontdesk render failed', error, errorInfo.componentStack);
    }
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={[styles.title, frontdeskTextAlign.ltr]}>Something went wrong</Text>
        <Text style={[styles.message, frontdeskTextAlign.ltr]}>Reload this screen and try again.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={this.retry}
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: frontdeskTheme.spacing.md,
    padding: frontdeskTheme.spacing.xxl,
    backgroundColor: frontdeskTheme.colors.background,
  },
  title: {
    ...frontdeskTheme.typography.titleMd,
    color: frontdeskTheme.colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...frontdeskTheme.typography.body,
    color: frontdeskTheme.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    minHeight: frontdeskTheme.touch.large,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: frontdeskTheme.radius.sm,
    backgroundColor: frontdeskTheme.colors.primary,
    paddingHorizontal: frontdeskTheme.spacing.xl,
  },
  buttonPressed: {
    backgroundColor: frontdeskTheme.colors.primaryPressed,
  },
  buttonText: {
    ...frontdeskTheme.typography.button,
    color: frontdeskTheme.colors.onPrimary,
  },
});
