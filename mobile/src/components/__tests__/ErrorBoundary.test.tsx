import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ErrorBoundary } from '../ErrorBoundary';

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('hidden render failure');
  }
  return <Text>Loaded</Text>;
};

describe('ErrorBoundary', () => {
  it('shows a retryable fallback without exposing the raw error', () => {
    const view = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('app-error-fallback')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText('hidden render failure')).toBeNull();

    view.rerender(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.press(screen.getByText('Retry'));

    expect(screen.getByText('Loaded')).toBeTruthy();
  });
});
