// js/app.js

function iniciarLogin() {
    const loginForm = document.getElementById('login-form');
    const loadingState = document.getElementById('loading-state');

    loginForm.classList.add('hidden');
    loadingState.classList.remove('hidden');

    // Simula 1.5s de loading e vai para a tela de perfis
    setTimeout(() => {
        window.location.href = 'perfis.html';
    }, 1500);
}

function fazerLogout() {
    if(confirm('Tem certeza que deseja encerrar a sessão?')) {
        window.location.href = 'index.html'; // Volta para a nova landing page
    }
}

function toggleOsDetails(detailsId) {
    const detailsElement = document.getElementById(detailsId);
    if(detailsElement.classList.contains('hidden')) {
        detailsElement.classList.remove('hidden');
    } else {
        detailsElement.classList.add('hidden');
    }
}

function mudarStatus(idOs, novoStatus) {
    const badge = document.getElementById(`badge-status-${idOs}`);
    badge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors duration-300";

    if(novoStatus === 'andamento') {
        badge.classList.add('bg-blue-100', 'text-blue-800');
        badge.innerText = "Em Andamento";
    } else if(novoStatus === 'peca') {
        badge.classList.add('bg-orange-100', 'text-orange-800');
        badge.innerText = "Aguardando Peça";
    } else if(novoStatus === 'finalizada') {
        badge.classList.add('bg-green-100', 'text-green-800');
        badge.innerText = "Finalizada";
    }
}