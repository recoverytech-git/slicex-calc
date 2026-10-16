# Controle de acesso

Autorização fica no banco (RLS + funções `security definer`). O frontend só esconde botões; quem decide é o banco.

| Papel | Vê | Edita |
|---|---|---|
| admin_master | tudo, todas as lojas | tudo, inclusive usuários de qualquer loja |
| proprietario (lojista) | tudo da própria loja | veículos, custos, financiamento, checklist, fotos, vendas; cria/gerencia gerente e vendedor da loja |
| gerente | tudo da própria loja (inclusive financeiro) | nada (somente leitura) |
| vendedor | modelo, ano, km, valor de venda, status e fotos (view `v_veiculos_vendedor`) | nada |

Regras de gestão de usuários: aplicadas dentro das funções `admin_*` no banco. Ninguém altera o próprio papel nem suspende/exclui a própria conta.
