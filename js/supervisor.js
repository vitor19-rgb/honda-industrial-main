// js/supervisor.js

// 1. INICIALIZAÇÃO DE DADOS (Equipa e adequação das OS)
function inicializarDadosSupervisor() {
    // Lista de técnicos da equipa
    let equipe = localStorage.getItem('honda_equipe');
    if (!equipe) {
        const tecnicos = [
            { id: "T1", nome: "Roberto Mendes", especialidade: "Eletromecânica" },
            { id: "T2", nome: "Carlos Silva", especialidade: "Hidráulica" },
            { id: "T3", nome: "Ana Costa", especialidade: "Automação" }
        ];
        localStorage.setItem('honda_equipe', JSON.stringify(tecnicos));
    }

    // Adequar as OS existentes para terem os novos campos do Supervisor
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let atualizado = false;

    osLista.forEach(os => {
        if (!os.prioridade) { os.prioridade = "Média"; atualizado = true; }
        if (!os.tecnicoId) { os.tecnicoId = null; atualizado = true; }
        if (!os.sla) { os.sla = "No Prazo"; atualizado = true; }
        if (!os.tempoGasto) { os.tempoGasto = Math.floor(Math.random() * 60) + 30; atualizado = true; } // Tempo simulado
        if (!os.horasValidadas) { os.horasValidadas = false; atualizado = true; }
    });

    if (atualizado) {
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    }
}

// 2. RENDERIZAÇÃO DO PAINEL (Carga de trabalho e KPIs)
function renderizarDashboardSupervisor() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let equipe = JSON.parse(localStorage.getItem('honda_equipe')) || [];

    // KPI: SLAs
    let atrasadas = osLista.filter(os => os.sla === 'Atrasado' && os.status !== 'Finalizada').length;
    let emergencias = osLista.filter(os => os.prioridade === 'Emergência' && os.status !== 'Finalizada').length;
    
    document.getElementById('kpi-atrasadas').innerText = atrasadas;
    document.getElementById('kpi-emergencias').innerText = emergencias;

    // Carga de Trabalho da Equipa
    const listaEquipe = document.getElementById('lista-carga-equipe');
    listaEquipe.innerHTML = '';

    equipe.forEach(tec => {
        // Conta quantas OS ativas este técnico tem
        let osAtivas = osLista.filter(os => os.tecnicoId === tec.id && os.status !== 'Finalizada').length;
        
        // Define a cor da barra de carga (verde se poucas, amarelo/vermelho se muitas)
        let corBarra = 'bg-green-500';
        if (osAtivas >= 3) corBarra = 'bg-yellow-500';
        if (osAtivas >= 5) corBarra = 'bg-red-500';
        
        let percentagem = Math.min((osAtivas / 5) * 100, 100);

        listaEquipe.innerHTML += `
            <div class="mb-4">
                <div class="flex justify-between text-sm font-bold text-gray-700 mb-1">
                    <span>${tec.nome} (${tec.especialidade})</span>
                    <span>${osAtivas} OS ativas</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="${corBarra} h-2.5 rounded-full transition-all duration-500" style="width: ${percentagem}%"></div>
                </div>
            </div>
        `;
    });
}

// 3. GESTÃO E DISTRIBUIÇÃO DE TAREFAS (Aguardando Atribuição)
function renderizarDistribuicao() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let equipe = JSON.parse(localStorage.getItem('honda_equipe')) || [];
    const container = document.getElementById('lista-distribuicao');
    container.innerHTML = '';

    // Filtra OS que estão pendentes ou aguardando técnico
    let osPendentes = osLista.filter(os => os.status === 'Pendente' || os.tecnicoId === null);

    // Ordena por prioridade (Emergência > Alta > Média > Baixa)
    const pesoPrioridade = { "Emergência": 4, "Alta": 3, "Média": 2, "Baixa": 1 };
    osPendentes.sort((a, b) => pesoPrioridade[b.prioridade] - pesoPrioridade[a.prioridade]);

    if (osPendentes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm italic p-4">Nenhuma OS aguardando distribuição.</p>';
        return;
    }

    // Opções de Técnicos para o Select
    let optionsTecnicos = '<option value="">Atribuir a um Técnico...</option>';
    equipe.forEach(tec => {
        optionsTecnicos += `<option value="${tec.id}">${tec.nome}</option>`;
    });

    osPendentes.forEach(os => {
        let corPrioridade = os.prioridade === 'Emergência' ? 'bg-red-600 text-white animate-pulse' : 
                           (os.prioridade === 'Alta' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700');

        container.innerHTML += `
            <div class="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-black text-gray-800">OS #${os.id}</span>
                    <span class="px-2 py-1 rounded text-xs font-bold ${corPrioridade}">${os.prioridade}</span>
                </div>
                <p class="text-sm font-bold text-gray-700 truncate">${os.maquina}</p>
                <p class="text-xs text-gray-500 mb-3 line-clamp-1">${os.descricao}</p>
                
                <div class="flex flex-col sm:flex-row gap-2 items-center">
                    <select id="atribuir-${os.id}" class="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-honda-red">
                        ${optionsTecnicos}
                    </select>
                    <button onclick="atribuirOS('${os.id}')" class="bg-honda-dark text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition w-full sm:w-auto">Enviar</button>
                </div>
                
                <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onclick="mudarPrioridade('${os.id}', 'Alta')" class="text-xs text-orange-600 font-bold hover:underline">⬆️ Subir Prioridade</button>
                    ${os.prioridade !== 'Emergência' ? `<button onclick="autorizarEmergencia('${os.id}')" class="text-xs text-red-600 font-bold hover:underline ml-auto">🚨 Forçar Emergência</button>` : ''}
                </div>
            </div>
        `;
    });
}

// 4. VALIDAÇÃO DE HORAS (OS Finalizadas)
function renderizarValidacaoHoras() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const container = document.getElementById('lista-validacao');
    container.innerHTML = '';

    let osFinalizadas = osLista.filter(os => os.status === 'Finalizada' && !os.horasValidadas);

    if (osFinalizadas.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm italic p-4">Nenhuma hora pendente de validação.</p>';
        return;
    }

    osFinalizadas.forEach(os => {
        container.innerHTML += `
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-gray-800">OS #${os.id}</span>
                    <span class="text-sm text-gray-600">Tempo: <strong class="text-honda-dark">${os.tempoGasto} min</strong></span>
                </div>
                <p class="text-xs text-gray-500 mb-3">Técnico ID: ${os.tecnicoId || 'Não registado'}</p>
                <button onclick="validarHoras('${os.id}')" class="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition">Validar Apontamento</button>
            </div>
        `;
    });
}

// --- FUNÇÕES DE AÇÃO ---

function atribuirOS(idOS) {
    const select = document.getElementById(`atribuir-${idOS}`);
    const tecnicoId = select.value;
    
    if(!tecnicoId) return alert("Por favor, selecione um técnico.");

    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.tecnicoId = tecnicoId;
        os.status = "Em Andamento"; // Muda o status automaticamente
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert(`OS #${idOS} atribuída e enviada para o tablet do técnico!`);
        atualizarTudo();
    }
}

function mudarPrioridade(idOS, novaPrioridade) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.prioridade = novaPrioridade;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        atualizarTudo();
    }
}

function autorizarEmergencia(idOS) {
    if(confirm("ATENÇÃO: Deseja classificar esta OS como EMERGÊNCIA? Isso irá disparar alertas para a equipa.")) {
        mudarPrioridade(idOS, 'Emergência');
    }
}

function validarHoras(idOS) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.horasValidadas = true;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert(`Horas da OS #${idOS} validadas com sucesso para efeitos de folha de pagamento.`);
        atualizarTudo();
    }
}

function gerarRelatorioOperacional() {
    alert("Gerando Relatório Consolidado... Preparando PDF das Ordens de Serviço.");
    window.print(); // Simula a exportação abrindo a janela de impressão nativa do navegador
}

function atualizarTudo() {
    renderizarDashboardSupervisor();
    renderizarDistribuicao();
    renderizarValidacaoHoras();
}

// Inicia a página
window.onload = () => {
    inicializarDadosSupervisor();
    atualizarTudo();
};