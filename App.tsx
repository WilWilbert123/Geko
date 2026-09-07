import React, { useEffect, useState, Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initDb } from './src/database/sqlite';
import { initUserStore } from './src/store/userStore';
import { useTheme } from './src/hooks/useTheme';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Error boundary to catch silent render crashes that cause blank screens
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>🐛 Render Error</Text>
          <Text style={styles.errorMessage}>{String(this.state.error)}</Text>
          <Text style={styles.errorHint}>{(this.state.error as any)?.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { theme, colors } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await Promise.all([initDb(), initUserStore()]);
        setDbReady(true);
      } catch (err) {
        console.error('DB init failed:', err);
        setDbError(String(err));
      }
    };
    setup();
  }, []);

  if (dbError) {
    return (
      <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
        <Text style={styles.errorTitle}>🐛 DB Init Error</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
      </ScrollView>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading Geko...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a0000',
  },
  errorContent: {
    padding: 20,
    paddingTop: 60,
  },
  errorTitle: {
    color: '#ff6b6b',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#ffaaaa',
    fontSize: 14,
    marginBottom: 12,
  },
  errorHint: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
