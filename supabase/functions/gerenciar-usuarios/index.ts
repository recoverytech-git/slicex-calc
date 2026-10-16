// Edge Function: ciclo de vida de usuários via Admin API do Supabase.
// Criar, suspender, reativar e excluir ficam aqui (a chave service_role só existe no servidor).
// Regras: admin_master faz tudo; proprietario só age sobre gerente e vendedor da própria loja.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PAPEIS = ["admin_master", "proprietario", "gerente", "vendedor"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quem pode agir sobre o alvo
function podeAlterar(me: any, alvo: any): boolean {
  if (me.papel === "admin_master") return true;
  return alvo.organizacao_id === me.organizacao_id && ["gerente", "vendedor"].includes(alvo.papel);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "Não autenticado." }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const { data: { user } } = await createClient(url, anon).auth.getUser(token);
  if (!user) return json({ error: "Sessão inválida." }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: me } = await admin.from("perfis").select("papel, organizacao_id, ativo").eq("id", user.id).single();
  if (!me || !me.ativo) return json({ error: "Conta inativa ou sem perfil." }, 403);
  if (!["admin_master", "proprietario"].includes(me.papel)) return json({ error: "Sem permissão." }, 403);

  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const acao = String(body.acao ?? "");

  if (acao === "criar") {
    const { email, senha, nome, papel, organizacao_id, nome_loja } = body;
    if (!EMAIL.test(email ?? "")) return json({ error: "E-mail inválido." }, 400);
    if (!senha || String(senha).length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
    if (!PAPEIS.includes(papel)) return json({ error: "Papel inválido." }, 400);

    let org: string | null = organizacao_id || null;
    let orgCriada: string | null = null;
    if (me.papel === "proprietario") {
      if (!["gerente", "vendedor"].includes(papel)) return json({ error: "O lojista só cria gerente ou vendedor." }, 403);
      org = me.organizacao_id;
    } else if (papel === "admin_master") {
      org = null;
    } else if (papel === "proprietario" && !org) {
      if (!nome_loja?.trim()) return json({ error: "Informe o nome da loja." }, 400);
      const { data: nova, error } = await admin.from("organizacoes").insert({ nome: nome_loja.trim() }).select("id").single();
      if (error) return json({ error: error.message }, 400);
      org = nova.id;
      orgCriada = nova.id;
    } else if (!org) {
      return json({ error: "Selecione a loja." }, 400);
    }

    const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { nome: nome ?? null },
    });
    if (erroAuth) {
      if (orgCriada) await admin.from("organizacoes").delete().eq("id", orgCriada);
      return json({ error: erroAuth.message }, 400);
    }

    const { error: erroPerfil } = await admin.from("perfis").insert({
      id: criado.user.id, organizacao_id: org, nome: nome ?? null, papel, ativo: true,
    });
    if (erroPerfil) {
      await admin.auth.admin.deleteUser(criado.user.id);
      if (orgCriada) await admin.from("organizacoes").delete().eq("id", orgCriada);
      return json({ error: erroPerfil.message }, 400);
    }
    return json({ ok: true, id: criado.user.id });
  }

  if (!["suspender", "reativar", "excluir"].includes(acao)) return json({ error: "Ação desconhecida." }, 400);
  const alvoId = body.id ? String(body.id) : "";
  if (!alvoId) return json({ error: "Usuário não informado." }, 400);
  if (alvoId === user.id) return json({ error: "Você não pode alterar a própria conta por aqui." }, 400);

  const { data: alvo } = await admin.from("perfis").select("id, papel, organizacao_id").eq("id", alvoId).single();
  if (!alvo) return json({ error: "Usuário não encontrado." }, 404);
  if (!podeAlterar(me, alvo)) return json({ error: "Sem permissão para alterar este usuário." }, 403);

  if (acao === "excluir") {
    const { error } = await admin.auth.admin.deleteUser(alvoId);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  const suspender = acao === "suspender";
  const { error: erroUpd } = await admin.from("perfis").update({ ativo: !suspender }).eq("id", alvoId);
  if (erroUpd) return json({ error: erroUpd.message }, 400);
  const { error } = await admin.auth.admin.updateUserById(alvoId, { ban_duration: suspender ? "876000h" : "none" });
  return error ? json({ error: error.message }, 400) : json({ ok: true });
});
