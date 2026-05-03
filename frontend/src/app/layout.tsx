import "../styles/globals.css";
import "../styles/calls.css";
import { AppShell } from "../app/components/AppShell";
import { UiPrefsProvider } from "../state/uiPrefs";
import { AuthProvider } from "../state/auth";
import { CallsProvider } from "../state/calls";
import GlobalErrorHandlers from '../app/components/GlobalErrorHandlers';
import { ActiveCallOverlay } from "../components/calls/CallShell";

export const metadata = {
  title: "Neonix",
  description: "Neonix prototype (Next + Nest)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UiPrefsProvider>
          <AuthProvider>
            <CallsProvider>
              <GlobalErrorHandlers />
              <AppShell>{children}</AppShell>
              <ActiveCallOverlay />
            </CallsProvider>
          </AuthProvider>
        </UiPrefsProvider>
      </body>
    </html>
  );
}
