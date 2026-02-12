const axios = require("axios");

// NVIDIA NIM API Configuration
// Usando Llama 3.1 70B que é um modelo robusto disponível no NVIDIA NIM
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
const MODEL_NAME = "meta/llama-3.1-70b-instruct"; 

/**
 * Gera resposta do chat focada APENAS em futebol
 */
async function getFootballChatResponse(message, history = []) {
  try {
    const systemPrompt = `Você é o Guru do Futebol, um assistente virtual especializado EXCLUSIVAMENTE em futebol.

    REGRA FUNDAMENTAL (BLOCKING):
    - Você DEVE RECUSAR responder qualquer pergunta que não seja sobre futebol ou assuntos diretamente relacionados (estádios, torcidas, história do esporte, regras, estatísticas, etc).
    - Se o usuário perguntar sobre "quem descobriu o Brasil", "receita de bolo", "política", "código", "matemática", ou qualquer outro tema aleatório, você deve responder com uma variação de: "Desculpe, meu conhecimento se limita aos gramados! ⚽ Pergunte-me sobre seu time ou campeonato favorito."
    - Não tente responder a pergunta proibida. Apenas recuse educadamente e traga o assunto de volta para o futebol.

    PERSONALIDADE:
    - Amigável, fanático por futebol, imparcial mas apaixonado.
    - Use emojis de futebol (⚽, 🥅, 🏆, 🧤, 🏟️) mas sem exagerar.
    - Respostas formatadas em Markdown (negrito para times/nomes importantes, listas para estatísticas).
    - Seja conciso. Evite textos muito longos a menos que pedido.

    CONTEXTO ATUAL:
    O usuário está no app FutScore.
    `;

    // Preparar mensagens
    // Converter histórico simples para formato API (role: assistant/user)
    const apiHistory = history.map(msg => ({
      role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...apiHistory,
      { role: "user", content: message }
    ];

    console.log(`[AIChat] Enviando mensagem para ${MODEL_NAME}...`);

    const response = await axios.post(
      `${NVIDIA_API_BASE}/chat/completions`,
      {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7, // Criatividade moderada
        top_p: 1,
        max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Resposta vazia da IA");

    return reply;

  } catch (error) {
    console.error("[AIChat] Erro:", error.response?.data || error.message);
    
    // Tratamento de erro amigável
    if (error.response?.status === 401) {
      return "Estou com problemas para acessar meus dados táticos (Erro de Autenticação). Verifique a chave da API.";
    }
    if (error.response?.status === 429) {
      return "Muitas requisições! A torcida está agitada. Tente novamente em alguns segundos.";
    }
    
    return "O árbitro parou o jogo! Tive um problema técnico. Tente perguntar novamente.";
  }
}

module.exports = { getFootballChatResponse };
