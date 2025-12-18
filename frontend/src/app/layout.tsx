import "../styles/globals.css";
import { AppShell } from "../app/components/AppShell";
import { UiPrefsProvider } from "../state/uiPrefs";
import { AuthProvider } from "../state/auth";

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
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </UiPrefsProvider>
      </body>
    </html>
  );
}
