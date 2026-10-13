import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabase";

const AuthCtx = createContext(null);

/**
 * Sessão do usuário. Sem Supabase configurado, o app continua funcionando
 * com as calculadoras (que não dependem de login) — só as rotas privadas
 * ficam bloqueadas.
 */
export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(supabaseConfigurado);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setCarregando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !sessao) { setPerfil(null); return; }
    // Papel vem da tabela perfis (fonte confiável), nunca de user_metadata editável.
    supabase.from("perfis").select("papel, organizacao_id, ativo").eq("id", sessao.user.id).single()
      .then(({ data }) => setPerfil(data ?? null));
  }, [sessao]);

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha });
  const sair = () => supabase?.auth.signOut();
  const recuperarSenha = (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });

  return (
    <AuthCtx.Provider value={{ sessao, perfil, carregando, entrar, sair, recuperarSenha, supabaseConfigurado }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
