// js/login.js

// 1. Importar as ferramentas do nosso ficheiro de configuração
import { auth, googleProvider, signInWithPopup } from './firebase-config.js';

// 2. Selecionar o botão de Login do HTML
const btnGoogle = document.getElementById('btn-login-google');

// 3. Criar a função que abre a janela do Google
btnGoogle.addEventListener('click', async () => {
    try {
        // O Firebase faz a mágica de abrir o Pop-up seguro
        const resultado = await signInWithPopup(auth, googleProvider);
        const usuario = resultado.user;

        // Sucesso! Vamos guardar o nome e a foto dele temporariamente no navegador
        // para as nossas telas (Técnico, Gestor, etc.) poderem ler facilmente!
        localStorage.setItem('honda_user_name', usuario.displayName);
        localStorage.setItem('honda_user_photo', usuario.photoURL || '');
        localStorage.setItem('honda_user_email', usuario.email);

        alert(`Bem-vindo ao Sistema Honda, ${usuario.displayName}!`);
        
        // Redireciona para o nosso "Hub" de Apresentação (A tela de escolha de perfil)
        window.location.href = 'perfis.html';

    } catch (error) {
        console.error("Erro na autenticação:", error);
        alert("Ocorreu um erro ao tentar fazer login com o Google. Verifica a tua ligação.");
    }
});