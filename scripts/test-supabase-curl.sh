#!/bin/bash

# Script para testar conexão com Supabase via curl
# 
# Uso:
#   export SUPABASE_URL="https://your-project.supabase.co"
#   export ANON_KEY="eyJ..."
#   bash scripts/test-supabase-curl.sh

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "❌ Erro: Defina SUPABASE_URL e ANON_KEY"
  echo ""
  echo "Uso:"
  echo "  export SUPABASE_URL=\"https://your-project.supabase.co\""
  echo "  export ANON_KEY=\"eyJ...\""
  echo "  bash scripts/test-supabase-curl.sh"
  exit 1
fi

echo "🔍 Testando conexão com Supabase..."
echo "URL: $SUPABASE_URL"
echo "Anon Key: ${ANON_KEY:0:20}..."
echo ""

# Teste 1: Listar chamadas
echo "📋 Teste 1: Query simples (listar chamadas)"
curl -X GET "$SUPABASE_URL/rest/v1/calls?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""

# Teste 2: Verificar tabela users
echo "📋 Teste 2: Verificar tabela users (pode retornar 401 se RLS bloqueia)"
curl -X GET "$SUPABASE_URL/rest/v1/users?select=id,email&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "✨ Testes concluídos!"

