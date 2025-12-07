// Gerenciamento de autenticação
const API_URL = "http://localhost:3000";

// Salvar token no localStorage
function saveToken(token) {
  localStorage.setItem("auth_token", token);
}

// Obter token do localStorage
function getToken() {
  return localStorage.getItem("auth_token");
}

// Remover token
function clearToken() {
  localStorage.removeItem("auth_token");
}

// Verificar se está autenticado
function isAuthenticated() {
  return !!getToken();
}

// Redirecionar para login se não autenticado
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "/frontend/pages/login.html";
  }
}

// Fazer logout
async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_URL}/accounts/logout/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }
  clearToken();
  window.location.href = "/frontend/pages/login.html";
}

// Configurar interceptor HTMX para adicionar token
document.body.addEventListener("htmx:configRequest", (event) => {
  const token = getToken();
  if (token) {
    event.detail.headers["Authorization"] = `Bearer ${token}`;
  }
});

// Interceptor para tratar erros de autenticação
document.body.addEventListener("htmx:responseError", (event) => {
  if (event.detail.xhr.status === 401) {
    clearToken();
    window.location.href = "/frontend/pages/login.html";
  }
});
