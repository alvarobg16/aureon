import { createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth/verify-pending")({
  component: VerifyPending,
});

function VerifyPending() {
  return (
    <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center">
        <MailCheck className="w-12 h-12 mx-auto text-aureon-orange" />
        <h1 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">Cuenta creada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          1. Verifica tu email haciendo clic en el enlace que te hemos enviado.<br/><br/>
          2. Tu cuenta quedará <span className="text-aureon-orange font-semibold">pendiente de aprobación</span> por el administrador. Recibirás acceso cuando sea revisada manualmente.
        </p>
        <a href="/auth" className="mt-6 inline-flex px-4 py-2 rounded-md bg-aureon-orange text-black text-sm font-display tracking-[0.15em]">VOLVER AL LOGIN</a>
      </div>
    </div>
  );
}
