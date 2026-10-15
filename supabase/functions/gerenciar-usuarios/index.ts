// Edge Function: criação, suspensão, reativação e exclusão de usuários.
// Usa a service_role somente aqui no servidor. Nunca chega ao navegador.
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const PAPEIS = ["admin_master", "proprietario", "gerente", "vendedor"];
const SITE = Deno.env.get("SITE_URL") ?? "https://slicex-calc.vercel.app";
const SUSPENSO = "876000h"; // ~100 anos

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Quem está chamando (token do usuário)
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Não autenticado" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: me } = await admin.from("perfis").select("papel, organizacao_id, ativo").eq("id", user.id).maybeSingle();
  if (!me || !me.ativo || !["admin_master", "proprietario"].includes(me.papel)) {
    return json({ error: "Sem permissão" }, 403);
  }
  const souAdmin = me.papel === "admin_master";

  // Escopo: admin mexe em qualquer um; lojista só em gerentes e vendedores da própria loja
  const alvoPermitido = async (alvoId: string) => {
    const { data: alvo } = await admin.from("perfis").select("papel, organizacao_id").eq("id", alvoId).maybeSingle();
    if (!alvo) return { ok: false, msg: "Usuário não encontrado" };
    if (souAdmin) return { ok: true };
    if (alvo.organizacao_id !== me.organizacao_id) return { ok: false, msg: "Usuário de outra loja" };
    if (!["gerente", "vendedor"].includes(alvo.papel)) return { ok: false, msg: "Você só gerencia gerentes e vendedores" };
    return { ok: true };
  };

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { return json({ error: "Corpo inválido" }, 400); }

  try {
    if (body.acao === "criar") {
      const { email, nome, papel } = body;
      if (!email || !PAPEIS.includes(papel)) return json({ error: "Dados inválidos" }, 400);
      if (!souAdmin && !["gerente", "vendedor"].includes(papel)) {
        return json({ error: "Você só pode criar gerentes e vendedores" }, 403);
      }

      let organizacaoId: string | null;
      if (papel === "proprietario") {
        if (!body.nome_loja) return json({ error: "Informe o nome da loja" }, 400);
        const { data: org, error } = await admin.from("organizacoes").insert({ nome: body.nome_loja }).select("id").single();
        if (error) return json({ error: error.message }, 400);
        organizacaoId = org.id;
      } else {
        organizacaoId = souAdmin ? (body.organizacao_id ?? null) : me.organizacao_id;
        if (!organizacaoId) return json({ error: "Informe a loja do usuário" }, 400);
      }

      // Convite por e-mail: o próprio usuário define a senha
      const { data: convite, error: eConvite } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { nome: nome ?? null },
        redirectTo: `${SITE}/login`,
      });
      if (eConvite) return json({ error: eConvite.message }, 400);

      const { error: ePerfil } = await admin.from("perfis").upsert({
        id: convite.user.id, organizacao_id: organizacaoId, nome: nome ?? null, papel, ativo: true,
      });
      if (ePerfil) return json({ error: ePerfil.message }, 400);
      return json({ ok: true, user_id: convite.user.id });
    }

    if (body.acao === "suspender" || body.acao === "reativar") {
      const r = await alvoPermitido(body.user_id);
      if (!r.ok) return json({ error: r.msg }, 403);
      const ativo = body.acao === "reativar";
      await admin.from("perfis").update({ ativo }).eq("id", body.user_id);
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { ban_duration: ativo ? "none" : SUSPENSO });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.acao === "excluir") {
      const r = await alvoPermitido(body.user_id);
      if (!r.ok) return json({ error: r.msg }, 403);
      // Remove o acesso e mantém a conta em auth.users, para preservar o histórico ligado a ela
      await admin.from("perfis").delete().eq("id", body.user_id);
      await admin.auth.admin.updateUserById(body.user_id, { ban_duration: SUSPENSO });
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
