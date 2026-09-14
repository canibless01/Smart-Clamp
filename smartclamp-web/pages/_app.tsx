import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FeatureFlagsProvider>
      <Component {...pageProps} />
    </FeatureFlagsProvider>
  );
}
