import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const rawRedirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/plataforma";
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, status } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      if (status && status !== "approved") {
        window.location.href = `/auth/pending-approval?status=${status}`;
        return;
      }
      toast.error(error);
      return;
    }
    window.location.href = redirectTo;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (error) {
      // Mensaje amable independientemente del texto técnico devuelto
      const friendly = /password/i.test(error)
        ? "La contraseña no cumple los requisitos (mínimo 8 caracteres)."
        : /registered|exists/i.test(error)
          ? "Ya existe una cuenta con ese email."
          : error;
      toast.error(friendly);
      return;
    }
    setSignupDone(email);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { toast.error(error); setLoading(false); }
  };

  if (signupDone) {
    return (
      <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 text-2xl">✓</div>
          <h1 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">Cuenta creada correctamente</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Tu cuenta <span className="text-white">{signupDone}</span> ha sido creada y está
            <span className="text-aureon-orange font-semibold"> pendiente de aprobación </span>
            por el administrador. Recibirás acceso una vez se habiliten tus permisos.
          </p>
          <a href="/auth" className="mt-6 inline-flex px-4 py-2 rounded-md bg-aureon-orange text-black text-sm font-display tracking-[0.15em]">VOLVER AL LOGIN</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8">
        <h1 className="font-display text-3xl tracking-[0.1em] text-center aureon-title-gradient">AUREON</h1>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Acceso a la plataforma</p>

        <div className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-lg bg-white/5">
          <button onClick={() => setTab("login")} className={`py-2 rounded-md text-xs font-display tracking-[0.2em] ${tab === "login" ? "bg-aureon-orange text-black" : "text-white/70"}`}>ENTRAR</button>
          <button onClick={() => setTab("signup")} className={`py-2 rounded-md text-xs font-display tracking-[0.2em] ${tab === "signup" ? "bg-aureon-orange text-black" : "text-white/70"}`}>REGISTRARSE</button>
        </div>

        <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="mt-6 space-y-3">
          {tab === "signup" && (
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 bg-background/50 border-white/20 text-white" />
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 bg-background/50 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={tab === "signup" ? 8 : 6} className="mt-1 bg-background/50 border-white/20 text-white" />
            {tab === "signup" && <p className="mt-1 text-[10px] text-muted-foreground">Mínimo 8 caracteres.</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-aureon-orange text-black hover:bg-aureon-orange/90">
            {loading ? "..." : tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" /> o <div className="h-px flex-1 bg-white/10" />
        </div>
        <Button onClick={handleGoogle} variant="outline" className="w-full">Continuar con Google</Button>

        {tab === "login" && (
          <div className="mt-4 text-center">
            <a href="/auth/forgot" className="text-xs text-muted-foreground hover:text-white underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</a>
          </div>
        )}
      </div>
    </div>
  );
}
