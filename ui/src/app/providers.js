"use client"
import { DesignSystemProvider } from 'janus-ds';

export default function Providers({ children }) {
  return <DesignSystemProvider>{children}</DesignSystemProvider>
}
