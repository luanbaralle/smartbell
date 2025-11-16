# Configuração do Supabase Realtime

## Problema: Realtime não está funcionando

Para que o Realtime funcione corretamente, você precisa habilitar a replicação da tabela `calls` no Supabase.

## Passos para habilitar o Realtime:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Database** → **Replication**
4. Procure pela tabela `calls`
5. Ative a replicação clicando no toggle ao lado da tabela
6. Certifique-se de que os eventos **INSERT**, **UPDATE** e **DELETE** estão habilitados

## Verificação:

Após habilitar, você deve ver nos logs do console (modo desenvolvimento):
- `[SmartBell] Realtime channel subscribed successfully`
- `[SmartBell] Realtime call update received` quando uma nova chamada é criada

## Se ainda não funcionar:

1. Verifique se você está usando a URL e chave corretas do Supabase no `.env.local`
2. Verifique se o usuário está autenticado (Realtime requer autenticação)
3. Verifique se há erros no console do navegador
4. Tente recarregar a página após habilitar o Realtime

