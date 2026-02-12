const axios = require("axios");

// Perplexity API Configuration
const PERPLEXITY_API_BASE = "https://api.perplexity.ai";
// "sonar" é o modelo mais econômico e atual (baseado no Llama 3.3 70B com acesso à internet)
const MODEL_NAME = "sonar"; 

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
    - NÃO inclua citações ou referências bibliográficas (como [1], [2], etc) na resposta.

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
      `${PERPLEXITY_API_BASE}/chat/completions`,
      {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7, // Criatividade moderada
        // top_p: 1, // Perplexity often handles this
        // max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Resposta vazia da IA");

    // Limpar citações no formato [1], [2], [1, 2], [1][2] etc que o Perplexity costuma enviar
    const cleanReply = reply.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "").trim();

    return cleanReply;

  } catch (error) {
    console.error("[AIChat] Erro:", error.response?.data || error.message);
    
    const err = new Error("AI Service Error");
    
    // Tratamento de erro amigável para ser usado no Controller
    if (error.response?.status === 401) {
      err.userMessage = "Estou com problemas para acessar meus dados táticos (Erro de Autenticação). Verifique a chave da API.";
    } else if (error.response?.status === 429) {
      err.userMessage = "Muitas requisições! A torcida está agitada. Tente novamente em alguns segundos.";
    } else {
      err.userMessage = "O árbitro parou o jogo! Tive um problema técnico. Tente perguntar novamente.";
    }
    
    // Relançar erro para que o Controller saiba que falhou e NÃO conte a requisição
    throw err;
  }
}

module.exports = { getFootballChatResponse };
