import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabase";

const AuthCtx = createContext(null);

/**
 * perfil: undefined = carregando, null = sem perfil cadastrado, objeto = perfil.
 * A autorização real é feita pelo RLS no banco; este estado só controla a interface.
 */
export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(undefined);
  const [carregando, setCarregando] = useState(supabaseConfigurado);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setCarregando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!sessao) { setPerfil(null); return; }
    setPerfil(undefined);
    supabase.from("perfis").select("papel, organizacao_id, ativo, nome").eq("id", sessao.user.id).maybeSingle()
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
