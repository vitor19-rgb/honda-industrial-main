// js/gestor.js

// 1. INICIALIZAÇÃO DE DADOS EXECUTIVOS
function inicializarDadosGestor() {
    let requisicoes = localStorage.getItem('honda_requisicoes_gestor');
    if (!requisicoes) {
        // Criar dados simulados mais ricos para o módulo de aprovações
        const reqIniciais = [
            { id: "REQ-001", tipo: "Investimento", descricao: "Compra de novo Robô de Solda A3", valor: 450000, status: "Pendente", detalhe: "Disponibilidade atual do ativo antigo caiu para 82%." },
            { id: "REQ-002", tipo: "Investimento", descricao: "Substituição do Motor da Esteira Principal", valor: 85000, status: "Pendente", detalhe: "Disponibilidade atual: 88%. Risco de parada total." },
            { id: "REQ-003", tipo: "Parada Programada", descricao: "Manutenção Geral Anual - Linha B", valor: 25000, status: "Pendente", detalhe: "Duração estimada: 2 dias. Impacto na produção mitigado." }
        ];
        localStorage.setItem('honda_requisicoes_gestor', JSON.stringify(reqIniciais));
    }
}

// 2. CÁLCULOS DE KPIs E ORÇAMENTO
function renderizarKPIs() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    
    // KPI: Backlog (OS Acumuladas / Não Finalizadas)
    let backlog = osLista.filter(os => os.status !== 'Finalizada').length;
    document.getElementById('kpi-backlog').innerText = backlog;

    // KPI: Custos e Orçamento
    let custoTotal = 0;
    let osCorretivas = 0;
    let osPreventivas = 0;

    osLista.forEach(os => {
        let horas = (os.tempoGasto || 0) / 60; 
        custoTotal += horas * 80; // R$ 80 por hora
        if(os.pecasUsadas) {
            os.pecasUsadas.forEach(p => { custoTotal += p.qtd * 150; }); // R$ 150 por peça
        }

        if(os.prioridade === 'Emergência' || os.prioridade === 'Alta') {
            osCorretivas++;
        } else {
            osPreventivas++;
        }
    });

    let orcamentoTotal = 100000; // Orçamento mensal (R$ 100.000)
    let saldoDisponivel = orcamentoTotal - custoTotal;
    let percentualGasto = ((custoTotal / orcamentoTotal) * 100).toFixed(1);

    document.getElementById('kpi-custos').innerText = `R$ ${custoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('kpi-orcamento').innerText = `R$ ${saldoDisponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    let barraOrcamento = document.getElementById('barra-orcamento');
    barraOrcamento.style.width = `${Math.min(percentualGasto, 100)}%`;
    if(percentualGasto > 80) barraOrcamento.classList.replace('bg-green-500', 'bg-red-500');

    desenharGraficoManutencao(osPreventivas, osCorretivas);
    desenharGraficoFalhas();
}

// 3. DESEMPENHO DA EQUIPA (NOVO)
function renderizarDesempenhoEquipe() {
    let equipe = JSON.parse(localStorage.getItem('honda_equipe')) || [];
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const tbody = document.getElementById('tabela-desempenho');
    tbody.innerHTML = '';

    equipe.forEach(tec => {
        // Filtrar OS concluídas por este técnico
        let osConcluidas = osLista.filter(os => os.tecnicoId === tec.id && os.status === 'Finalizada');
        let totalOS = osConcluidas.length;
        
        let tempoTotal = 0;
        osConcluidas.forEach(os => tempoTotal += os.tempoGasto || 0);
        let tempoMedio = totalOS > 0 ? Math.round(tempoTotal / totalOS) : 0;

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-honda-red text-white flex items-center justify-center text-xs">${tec.nome.charAt(0)}</div>
                    ${tec.nome}
                </td>
                <td class="p-3 text-sm text-center font-bold text-green-600">${totalOS}</td>
                <td class="p-3 text-sm text-center">${tempoMedio} min</td>
            </tr>
        `;
    });

    if(equipe.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 text-sm">Nenhum dado de equipa encontrado.</td></tr>';
    }
}

// 4. MÓDULO DE APROVAÇÕES ESTRATÉGICAS
function renderizarAprovacoes() {
    let requisicoes = JSON.parse(localStorage.getItem('honda_requisicoes_gestor')) || [];
    const containerInvest = document.getElementById('lista-investimentos');
    const containerParadas = document.getElementById('lista-paradas');
    
    containerInvest.innerHTML = '';
    containerParadas.innerHTML = '';

    let pendentes = requisicoes.filter(r => r.status === 'Pendente');

    pendentes.forEach(req => {
        let valorHtml = `R$ ${req.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        let cardHTML = `
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-3">
                <h3 class="font-bold text-gray-800 text-sm mb-1">${req.descricao}</h3>
                <p class="text-xs text-gray-500 mb-2 italic">${req.detalhe}</p>
                <p class="text-sm font-black text-honda-red mb-3">Custo Estimado: ${valorHtml}</p>
                <div class="flex gap-2">
                    <button onclick="julgarRequisicao('${req.id}', 'Aprovada')" class="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-bold hover:bg-green-700 transition">Aprovar</button>
                    <button onclick="julgarRequisicao('${req.id}', 'Rejeitada')" class="flex-1 bg-gray-300 text-gray-800 py-1.5 rounded text-xs font-bold hover:bg-gray-400 transition">Rejeitar</button>
                </div>
            </div>
        `;

        if (req.tipo === 'Investimento') {
            containerInvest.innerHTML += cardHTML;
        } else {
            containerParadas.innerHTML += cardHTML;
        }
    });

    if(containerInvest.innerHTML === '') containerInvest.innerHTML = '<p class="text-xs text-gray-400">Nenhum investimento pendente.</p>';
    if(containerParadas.innerHTML === '') containerParadas.innerHTML = '<p class="text-xs text-gray-400">Nenhuma parada programada pendente.</p>';
}

function julgarRequisicao(id, novoStatus) {
    let requisicoes = JSON.parse(localStorage.getItem('honda_requisicoes_gestor'));
    let req = requisicoes.find(r => r.id === id);
    if(req) {
        req.status = novoStatus;
        localStorage.setItem('honda_requisicoes_gestor', JSON.stringify(requisicoes));
        alert(`Solicitação ${novoStatus} com sucesso! O sistema foi atualizado.`);
        renderizarAprovacoes();
    }
}

// 5. RELATÓRIO GERENCIAL
function emitirRelatorioGerencial() {
    alert("Iniciando compilação de dados...\nO seu Relatório Executivo está a ser gerado em PDF.");
    window.print(); // Abre a janela de impressão nativa do navegador
}

// GRÁFICOS (Mantidos do anterior)
let chartManutencao, chartFalhas;
function desenharGraficoManutencao(prev, corr) {
    const ctx = document.getElementById('chartManutencao').getContext('2d');
    if(chartManutencao) chartManutencao.destroy();
    if(prev === 0 && corr === 0) { prev = 60; corr = 40; } // Dados de exemplo se vazio

    chartManutencao = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Preventiva', 'Corretiva'], datasets: [{ data: [prev, corr], backgroundColor: ['#10B981', '#EF4444'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
}

function desenharGraficoFalhas() {
    let equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    const ctx = document.getElementById('chartFalhas').getContext('2d');
    if(chartFalhas) chartFalhas.destroy();

    equipamentos.sort((a, b) => b.falhas - a.falhas);
    let topMaquinas = equipamentos.slice(0, 5);
    let labels = topMaquinas.map(m => m.nome.split(' ')[0]);
    let dados = topMaquinas.map(m => m.falhas);

    chartFalhas = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Falhas', data: dados, backgroundColor: '#333333', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Inicializa a página
window.onload = () => {
    inicializarDadosGestor();
    renderizarKPIs();
    renderizarDesempenhoEquipe();
    renderizarAprovacoes();
};