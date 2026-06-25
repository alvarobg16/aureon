import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset")({
  component: Reset,
});

function Reset() {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando el usuario llega desde el email de recuperación, Supabase coloca
  // los tokens en el hash de la URL (#access_token=...&type=recovery).
  // El cliente JS los detecta automáticamente al cargar y dispara
  // onAuthStateChange con el evento PASSWORD_RECOVERY. Aquí esperamos a que
  // exista una sesión válida antes de permitir cambiar la contraseña.
  useEffect(() => {
    let active = true;

    const init = async () => {
      // Esperamos un tick para que supabase-js procese el hash
      await new Promise((r) => setTimeout(r, 200));
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
      } else {
        setError(
          "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde 'Olvidé mi contraseña'."
        );
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setError(null);
      }
    });

    init();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (pwd !== pwd2) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Contraseña actualizada. Inicia sesión de nuevo.");
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8">
        <h1 className="font-display text-2xl tracking-[0.1em] text-white text-center">Nueva contraseña</h1>

        {error ? (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <a
              href="/auth/forgot"
              className="inline-block text-xs text-aureon-orange hover:underline underline-offset-4"
            >
              Solicitar un nuevo enlace
            </a>
          </div>
        ) : !ready ? (
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Validando enlace de recuperación…
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nueva contraseña
              </Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                minLength={6}
                className="mt-1 bg-background/50 border-white/20 text-white"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Repetir contraseña
              </Label>
              <Input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                required
                minLength={6}
                className="mt-1 bg-background/50 border-white/20 text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-aureon-orange text-black hover:bg-aureon-orange/90"
            >
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <a href="/auth" className="text-xs text-muted-foreground hover:text-white">
            Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}
