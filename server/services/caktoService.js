const axios = require("axios");

/**
 * Serviço de integração com a API Cakto
 */
class CaktoService {
  constructor() {
    this.clientId = process.env.CAKTO_CLIENT_ID;
    this.clientSecret = process.env.CAKTO_CLIENT_SECRET;
    this.baseUrl = "https://api.cakto.com.br/public_api";
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Obter token de acesso OAuth2
   */
  async getAccessToken() {
    // Se já temos um token válido, retornar
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/token/`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      });

      this.accessToken = response.data.access_token;
      // Token expira em X segundos (geralmente 3600)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      return this.accessToken;
    } catch (error) {
      console.error("Erro ao obter token Cakto:", error.response?.data || error.message);
      throw new Error("Falha na autenticação com Cakto");
    }
  }

  /**
   * Fazer requisição autenticada à API Cakto
   */
  async makeRequest(method, endpoint, data = null) {
    const token = await this.getAccessToken();

    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição Cakto (${method} ${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Buscar detalhes de um pedido
   */
  async getOrder(orderId) {
    try {
      return await this.makeRequest("GET", `/orders/${orderId}/`);
    } catch (error) {
      console.error(`Erro ao buscar pedido ${orderId}:`, error.message);
      return null;
    }
  }

  /**
   * Listar pedidos com filtros
   */
  async listOrders(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/orders/${queryParams ? `?${queryParams}` : ""}`;
    
    try {
      return await this.makeRequest("GET", endpoint);
    } catch (error) {
      console.error("Erro ao listar pedidos:", error.message);
      return { results: [] };
    }
  }

  /**
   * Validar assinatura do webhook
   * A Cakto envia um header "X-Cakto-Signature" para validar a origem
   */
  validateWebhookSignature(payload, signature) {
    const crypto = require("crypto");
    const secret = process.env.CAKTO_WEBHOOK_SECRET;

    if (!secret) {
      console.warn("CAKTO_WEBHOOK_SECRET não configurado - webhook não será validado");
      return true; // Aceitar em dev/test
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === expectedSignature;
  }
}

module.exports = new CaktoService();
