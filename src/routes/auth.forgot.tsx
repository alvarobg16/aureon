import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot")({
  component: Forgot,
});

function Forgot() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) { toast.error(error); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen aureon-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-8">
        <h1 className="font-display text-2xl tracking-[0.1em] text-white text-center">Recuperar contraseña</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground text-center">Si la dirección existe, recibirás un email con instrucciones.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 bg-background/50 border-white/20 text-white" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-aureon-orange text-black hover:bg-aureon-orange/90">
              {loading ? "Enviando..." : "Enviar enlace"}
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <a href="/auth" className="text-xs text-muted-foreground hover:text-white">Volver al login</a>
        </div>
      </div>
    </div>
  );
}
