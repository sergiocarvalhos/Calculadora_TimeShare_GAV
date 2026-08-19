import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  LogIn,
  Shield,
  AlertCircle,
} from "lucide-react";
import { loginConsultant, getConsultantSession } from "../lib/consultant-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Login — Calculadora Time Share GAV" },
      {
        name: "description",
        content:
          "Acesse a Calculadora de Conversão com suas credenciais de consultor GAV Resorts.",
      },
    ],
  }),
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // SSR-safe mount + session check
  useEffect(() => {
    setMounted(true);
    const session = getConsultantSession();
    if (session) {
      router.navigate({ to: "/" });
    }
  }, [router]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    setPin(value);
    setError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || pin.length < 6 || loading) return;
    setLoading(true);

    // Small delay for UX feedback
    setTimeout(() => {
      const session = loginConsultant(email.trim(), pin);
      if (session) {
        router.navigate({ to: "/" });
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPin("");
        setLoading(false);
      }
    }, 300);
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #001f42 0%, #002B5C 60%, #004080 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(96,165,250,0.18), transparent 70%)",
          transform: "translate(30%, -30%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(96,165,250,0.12), transparent 70%)",
          transform: "translate(-30%, 30%)",
          pointerEvents: "none",
        }}
      />

      {/* Center container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              background: "rgba(255,255,255,0.14)",
              borderRadius: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Shield style={{ width: "34px", height: "34px", color: "white" }} />
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "white",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            GAV Resorts
          </h1>
          <p
            style={{
              color: "rgba(147,197,253,1)",
              fontSize: "14px",
              marginTop: "6px",
            }}
          >
            Calculadora de Conversão Time Share
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "100px",
              padding: "5px 14px",
              fontSize: "11px",
              color: "rgba(196,225,255,1)",
              letterSpacing: "0.03em",
            }}
          >
            <Sparkles style={{ width: "11px", height: "11px" }} />
            Acesso exclusivo para consultores
          </div>
        </div>

        {/* Login card */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "24px",
            padding: "32px",
            boxShadow:
              "0 25px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
            animation: shake
              ? "shake 0.5s cubic-bezier(.36,.07,.19,.97)"
              : undefined,
          }}
        >
          <style>{`
            @keyframes shake {
              10%, 90%  { transform: translateX(-2px); }
              20%, 80%  { transform: translateX(4px); }
              30%, 50%, 70% { transform: translateX(-6px); }
              40%, 60%  { transform: translateX(6px); }
            }
            .login-input:focus {
              border-color: rgba(147,197,253,0.7) !important;
              background: rgba(255,255,255,0.12) !important;
              box-shadow: 0 0 0 3px rgba(96,165,250,0.2) !important;
            }
            .login-input::placeholder { color: rgba(147,197,253,0.45); }
            .login-btn:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            }
            .login-btn:active:not(:disabled) { transform: translateY(0); }
          `}</style>

          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "white",
              margin: "0 0 24px",
            }}
          >
            Entrar no sistema
          </h2>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(196,225,255,0.9)",
                  marginBottom: "8px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                E-mail
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    color: "rgba(147,197,253,0.6)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(false);
                  }}
                  placeholder="seu@email.com"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.08)",
                    border: `1.5px solid ${error ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.18)"}`,
                    borderRadius: "12px",
                    padding: "13px 14px 13px 44px",
                    color: "white",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s",
                  }}
                />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(196,225,255,0.9)",
                  marginBottom: "8px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                PIN de Acesso
              </label>
              <div style={{ position: "relative" }}>
                <KeyRound
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    color: "rgba(147,197,253,0.6)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="login-input"
                  type={showPin ? "text" : "password"}
                  autoComplete="current-password"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
                  maxLength={20}
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.08)",
                    border: `1.5px solid ${error ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.18)"}`,
                    borderRadius: "12px",
                    padding: "13px 48px 13px 44px",
                    color: "white",
                    fontSize: "16px",
                    letterSpacing: showPin ? "0.1em" : "0.35em",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(147,197,253,0.7)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {showPin ? (
                    <EyeOff style={{ width: "16px", height: "16px" }} />
                  ) : (
                    <Eye style={{ width: "16px", height: "16px" }} />
                  )}
                </button>
              </div>
              {/* PIN dots indicator */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: "8px",
                  justifyContent: "center",
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background:
                        i < pin.length
                          ? "rgba(147,197,253,0.9)"
                          : "rgba(255,255,255,0.15)",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(239,68,68,0.18)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "rgba(252,165,165,1)",
                }}
              >
                <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                E-mail ou PIN incorreto. Verifique e tente novamente.
              </div>
            )}

            {/* Submit */}
            <button
              className="login-btn"
              type="submit"
              disabled={!email.trim() || pin.length < 6 || loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "9px",
                width: "100%",
                background: loading ? "rgba(255,255,255,0.85)" : "white",
                color: "#002B5C",
                border: "none",
                borderRadius: "12px",
                padding: "15px",
                fontSize: "15px",
                fontWeight: 700,
                cursor:
                  loading || !email.trim() || pin.length < 6
                    ? "not-allowed"
                    : "pointer",
                opacity: !email.trim() || pin.length < 6 ? 0.55 : 1,
                transition: "all 0.2s",
                marginTop: "4px",
              }}
            >
              <LogIn style={{ width: "17px", height: "17px" }} />
              {loading ? "Verificando..." : "Acessar Calculadora"}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "12px", color: "rgba(147,197,253,0.65)", margin: "0 0 10px" }}>
              Problemas com o acesso? Contate o administrador.
            </p>
            <Link
              to="/admin"
              style={{
                fontSize: "11px",
                color: "rgba(196,225,255,0.75)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(196,225,255,0.3)",
                paddingBottom: "1px",
                transition: "color 0.2s",
              }}
            >
              Acessar painel administrativo →
            </Link>
          </div>
        </div>

        {/* Bottom hint */}
        <p
          style={{
            marginTop: "24px",
            fontSize: "11px",
            color: "rgba(147,197,253,0.45)",
            textAlign: "center",
          }}
        >
          Sessão válida por 8 horas · GAV Resorts © 2025
        </p>
      </div>
    </div>
  );
}
