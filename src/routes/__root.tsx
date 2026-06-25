import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth";
import { ScopeProvider } from "@/lib/scope";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AUREON FUTSAL PRO SUITE V1.0" },
      { name: "description", content: "Crea, organiza y consulta tareas de entrenamiento de fútbol sala con imágenes y búsqueda rápida." },
      { name: "author", content: "Pista 5" },
      { property: "og:title", content: "AUREON FUTSAL PRO SUITE V1.0" },
      { property: "og:description", content: "Crea, organiza y consulta tareas de entrenamiento de fútbol sala con imágenes y búsqueda rápida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "AUREON FUTSAL PRO SUITE V1.0" },
      { name: "twitter:description", content: "Crea, organiza y consulta tareas de entrenamiento de fútbol sala con imágenes y búsqueda rápida." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a71ba262-476a-41be-a98e-161da76e7933/id-preview-fe266c31--35294241-4ad3-409c-af02-31f43357d834.lovable.app-1777838006941.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a71ba262-476a-41be-a98e-161da76e7933/id-preview-fe266c31--35294241-4ad3-409c-af02-31f43357d834.lovable.app-1777838006941.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Oswald:wght@500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <ScopeProvider>
        <SettingsProvider>
          <Outlet />
          <Toaster richColors position="top-center" />
        </SettingsProvider>
      </ScopeProvider>
    </AuthProvider>
  );
}
