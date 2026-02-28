// js/suporte.js

import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.getElementById('form-suporte').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const descricao = document.getElementById('descricao-suporte').value;
    const nomeUsuario = localStorage.getItem('honda_user_name') || 'Usuário Não Identificado';
    const emailUsuario = localStorage.getItem('honda_user_email') || 'Sem e-mail';

    try {
        // Grava o chamado no Firebase
        await addDoc(collection(db, "honda_chamados_ti"), {
            solicitante: nomeUsuario,
            email: emailUsuario,
            descricao: descricao,
            dataHora: new Date().toLocaleString(),
            status: "Aberto"
        });

        alert("✅ Chamado de TI aberto com sucesso na nuvem!\nA nossa equipe entrará em contato em breve.");
        
        // Redireciona de volta para a tela de seleção de perfis
        window.location.href = 'index.html';

    } catch (error) {
        alert("Erro ao enviar chamado de suporte: " + error);
        console.error(error);
    }
});