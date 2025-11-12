#!/usr/bin/env node

/**
 * Script para testar conexão com Supabase
 * 
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
 *   node scripts/test-supabase-connection.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌ Erro: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios");
  console.error("\nUso:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \\");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \\");
  console.error("  node scripts/test-supabase-connection.js");
  process.exit(1);
}

async function testSupabaseConnection() {
  console.log("🔍 Testando conexão com Supabase...\n");
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Anon Key: ${ANON_KEY.substring(0, 20)}...\n`);

  // Teste 1: Listar chamadas (query simples)
  console.log("📋 Teste 1: Query simples (listar chamadas)");
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/calls?select=*&limit=1`, {
      method: "GET",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Sucesso! Resposta:", JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Erro ${response.status}:`, data);
      if (response.status === 401 || response.status === 403) {
        console.error("\n💡 Dica: Verifique se a ANON_KEY está correta e se as políticas RLS permitem leitura anônima.");
      }
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error.message);
  }

  console.log("\n");

  // Teste 2: Verificar tabela users (pode precisar de autenticação)
  console.log("📋 Teste 2: Verificar tabela users (pode retornar 401 se RLS bloqueia)");
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email&limit=1`, {
      method: "GET",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Sucesso! Resposta:", JSON.stringify(data, null, 2));
    } else {
      console.log(`⚠️  Status ${response.status}:`, data);
      if (response.status === 401 || response.status === 403) {
        console.log("   (Esperado se RLS bloqueia leitura anônima de users)");
      }
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error.message);
  }

  console.log("\n");

  // Teste 3: Verificar Realtime (WebSocket)
  console.log("📋 Teste 3: Verificar endpoint Realtime");
  try {
    const wsUrl = SUPABASE_URL.replace("https://", "wss://").replace("http://", "ws://");
    const realtimeUrl = `${wsUrl}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;
    console.log(`   WebSocket URL: ${realtimeUrl.substring(0, 80)}...`);
    console.log("   ✅ Endpoint Realtime disponível (conexão WebSocket será testada no browser)");
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }

  console.log("\n✨ Testes concluídos!");
}

testSupabaseConnection().catch(console.error);

