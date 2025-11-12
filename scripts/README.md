# Scripts de Teste

Scripts auxiliares para testar conexões e funcionalidades do Smart Bell.

## Teste de Conexão com Supabase

### Opção 1: Script Node.js

```bash
# No Windows (PowerShell)
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
node scripts/test-supabase-connection.js

# No Linux/Mac
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
node scripts/test-supabase-connection.js
```

### Opção 2: Script Bash (curl)

```bash
# No Windows (Git Bash ou WSL)
export SUPABASE_URL="https://your-project.supabase.co"
export ANON_KEY="eyJ..."
bash scripts/test-supabase-curl.sh

# No Linux/Mac
export SUPABASE_URL="https://your-project.supabase.co"
export ANON_KEY="eyJ..."
bash scripts/test-supabase-curl.sh
```

### Opção 3: Comandos curl diretos

```bash
# Substitua pelos valores reais
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="eyJ..."

# Teste 1: Listar chamadas
curl -X GET "$SUPABASE_URL/rest/v1/calls?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json"

# Teste 2: Verificar tabela users
curl -X GET "$SUPABASE_URL/rest/v1/users?select=id,email&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json"
```

## O que esperar

- **200 OK**: Conexão funcionando, dados retornados (ou array vazio `[]`)
- **401 Unauthorized**: ANON_KEY inválida ou expirada
- **403 Forbidden**: RLS (Row Level Security) bloqueando acesso anônimo
- **404 Not Found**: Tabela não existe ou URL incorreta

## Verificar Realtime no Browser

1. Abra DevTools (F12)
2. Vá para a aba **Network**
3. Filtre por **WS** (WebSocket)
4. Acesse `/dashboard` ou `/bell/[houseId]`
5. Procure por conexões `wss://your-project.supabase.co/realtime/v1/websocket`
6. Verifique mensagens `phx_join` ou logs do cliente Supabase

