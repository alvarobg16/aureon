import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Privacidad y seguridad — AUREON FUTSAL PRO SUITE" },
      {
        name: "description",
        content:
          "Información sobre cómo AUREON FUTSAL PRO SUITE gestiona el acceso, los datos, la privacidad y la seguridad de la plataforma.",
      },
      { property: "og:title", content: "Privacidad y seguridad — AUREON FUTSAL PRO SUITE" },
      {
        property: "og:description",
        content:
          "Contenido mantenido por el responsable de la aplicación con los controles de seguridad y privacidad actualmente activos.",
      },
    ],
  }),
  component: TrustPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Privacidad y seguridad</h1>
          <p className="text-sm text-muted-foreground">
            Esta página la mantiene el responsable de AUREON FUTSAL PRO SUITE para responder a las
            preguntas habituales sobre seguridad, privacidad y tratamiento de datos. Es contenido
            editable de la aplicación y <strong>no constituye una certificación ni una verificación
            independiente</strong>.
          </p>
        </header>

        <Section title="Responsabilidad compartida">
          <p>
            La plataforma se apoya en la infraestructura gestionada de Lovable Cloud para el
            alojamiento, la base de datos, la autenticación y el almacenamiento. El proveedor cubre
            la seguridad de la infraestructura subyacente; el responsable de la aplicación se
            encarga de la configuración, las reglas de acceso y el uso correcto por parte de los
            usuarios finales.
          </p>
        </Section>

        <Section title="Acceso y autenticación">
          <ul className="list-disc space-y-1 pl-5">
            <li>Acceso mediante cuentas individuales con correo electrónico y contraseña.</li>
            <li>Aprobación manual de nuevas cuentas por parte del administrador antes de poder usar la aplicación.</li>
            <li>Roles diferenciados (administrador / usuario) gestionados en el servidor.</li>
            <li>Las sesiones se mantienen únicamente en el dispositivo del usuario.</li>
          </ul>
        </Section>

        <Section title="Datos que se tratan">
          <p>
            La aplicación almacena la información que cada usuario introduce para gestionar su
            actividad deportiva: equipos, jugadores, tareas, entrenamientos, planificación, vídeos
            de scouting y análisis. Los datos quedan aislados por cuenta mediante reglas de acceso
            a nivel de fila.
          </p>
        </Section>

        <Section title="Almacenamiento de archivos">
          <p>
            Imágenes y vídeos se guardan en almacenamiento gestionado. Los recursos relacionados
            con scouting y análisis de vídeo se mantienen en contenedores privados; las imágenes
            asociadas a tareas, jugadores y equipos se sirven mediante URLs públicas para poder
            visualizarse dentro de la aplicación.
          </p>
        </Section>

        <Section title="Subencargados e integraciones">
          <p>
            Para funcionar, la aplicación utiliza Lovable Cloud (alojamiento, base de datos,
            autenticación y almacenamiento) y, opcionalmente, proveedores de IA contratados por el
            responsable de la aplicación para funciones concretas. Si quieres conocer el listado
            actualizado, contacta con el responsable.
          </p>
        </Section>

        <Section title="Conservación y eliminación">
          <p>
            Los datos se conservan mientras la cuenta esté activa. Para solicitar la eliminación
            de tu cuenta o de información concreta, contacta con el administrador de la
            aplicación.
          </p>
        </Section>

        <Section title="Contacto">
          <p>
            Para consultas sobre privacidad, seguridad o ejercicio de derechos sobre tus datos,
            escribe al responsable de la aplicación a través del canal habitual de contacto que te
            facilitó al darte de alta.
          </p>
        </Section>

        <p className="pt-4 text-xs text-muted-foreground">
          Última actualización: contenido editable por el responsable de la aplicación.
        </p>
      </div>
    </div>
  );
}
