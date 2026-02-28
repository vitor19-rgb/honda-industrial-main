// js/gestor.js

// 1. INICIALIZAÇÃO DE DADOS EXECUTIVOS
function inicializarDadosGestor() {
    // Cria algumas requisições de aprovação executiva caso não existam
    let requisicoes = localStorage.getItem('honda_requisicoes_gestor');
    if (!requisicoes) {
        const reqIniciais = [
            { id: "REQ-001", tipo: "Investimento (CAPEX)", descricao: "Compra de novo Robô de Solda A3", valor: 450000, status: "Pendente" },
            { id: "REQ-002", tipo: "Parada Programada", descricao: "Manutenção Geral Anual - Linha B (2 dias)", valor: 25000, status: "Pendente" }
        ];
        localStorage.setItem('honda_requisicoes_gestor', JSON.stringify(reqIniciais));
    }
}

// 2. CÁLCULOS DE KPIs E ORÇAMENTO
function renderizarKPIs() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    
    // Calcula o Backlog (OS não finalizadas)
    let backlog = osLista.filter(os => os.status !== 'Finalizada').length;
    document.getElementById('kpi-backlog').innerText = backlog;

    // Simulação de Cálculo de Custos (Soma de peças e horas)
    let custoTotal = 0;
    let osCorretivas = 0;
    let osPreventivas = 0;

    osLista.forEach(os => {
        // Custo de Horas (ex: R$ 80 por hora)
        let horas = (os.tempoGasto || 0) / 60; 
        custoTotal += horas * 80;

        // Custo de Peças (ex: R$ 150 média por peça)
        if(os.pecasUsadas) {
            os.pecasUsadas.forEach(p => { custoTotal += p.qtd * 150; });
        }

        // Classificação para o gráfico (Se for Emergência/Alta é Corretiva, senão Preventiva)
        if(os.prioridade === 'Emergência' || os.prioridade === 'Alta') {
            osCorretivas++;
        } else {
            osPreventivas++;
        }
    });

    // Orçamento fictício mensal: R$ 50.000
    let orcamentoTotal = 50000;
    let percentualGasto = ((custoTotal / orcamentoTotal) * 100).toFixed(1);

    document.getElementById('kpi-custos').innerText = `R$ ${custoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    let barraOrcamento = document.getElementById('barra-orcamento');
    barraOrcamento.style.width = `${Math.min(percentualGasto, 100)}%`;
    if(percentualGasto > 80) barraOrcamento.classList.replace('bg-green-500', 'bg-red-500');
    document.getElementById('kpi-percentual-orcamento').innerText = `${percentualGasto}% do limite mensal`;

    // Atualiza Gráficos com os dados calculados
    desenharGraficoManutencao(osPreventivas, osCorretivas);
    desenharGraficoFalhas();
}

// 3. DESENHAR GRÁFICOS (Usando Chart.js)
let chartManutencao, chartFalhas; // Variáveis globais para destruir gráficos antigos ao recarregar

function desenharGraficoManutencao(prev, corr) {
    const ctx = document.getElementById('chartManutencao').getContext('2d');
    if(chartManutencao) chartManutencao.destroy();

    // Se não houver OS, coloca dados de exemplo
    if(prev === 0 && corr === 0) { prev = 60; corr = 40; }

    chartManutencao = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Preventiva/Preditiva', 'Corretiva/Emergência'],
            datasets: [{
                data: [prev, corr],
                backgroundColor: ['#10B981', '#EF4444'], // Verde e Vermelho
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
}

function desenharGraficoFalhas() {
    let equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    const ctx = document.getElementById('chartFalhas').getContext('2d');
    if(chartFalhas) chartFalhas.destroy();

    // Ordena para pegar as 5 piores máquinas
    equipamentos.sort((a, b) => b.falhas - a.falhas);
    let topMaquinas = equipamentos.slice(0, 5);
    
    let labels = topMaquinas.map(m => m.nome.split(' ')[0] + ' ' + (m.nome.split(' ')[1] || '')); // Nome curto
    let dados = topMaquinas.map(m => m.falhas);

    chartFalhas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nº de Falhas Registadas',
                data: dados,
                backgroundColor: '#333333',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// 4. GESTÃO DE APROVAÇÕES EXECUTIVAS
function renderizarAprovacoes() {
    let requisicoes = JSON.parse(localStorage.getItem('honda_requisicoes_gestor')) || [];
    const lista = document.getElementById('lista-aprovacoes');
    lista.innerHTML = '';

    let pendentes = requisicoes.filter(r => r.status === 'Pendente');

    if(pendentes.length === 0) {
        lista.innerHTML = '<p class="text-gray-500 text-sm italic p-4">Nenhuma requisição pendente no momento.</p>';
        return;
    }

    pendentes.forEach(req => {
        let valorFormatado = req.valor > 0 ? `R$ ${req.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'Custo Variável';
        
        lista.innerHTML += `
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <span class="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs font-bold uppercase mb-2 inline-block">${req.tipo}</span>
                    <h3 class="font-bold text-gray-800 text-base">${req.descricao}</h3>
                    <p class="text-sm font-black text-honda-red mt-1">Impacto Financeiro: ${valorFormatado}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="julgarRequisicao('${req.id}', 'Aprovada')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition">Autorizar</button>
                    <button onclick="julgarRequisicao('${req.id}', 'Reprovada')" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-400 transition">Negar</button>
                </div>
            </div>
        `;
    });
}

function julgarRequisicao(id, novoStatus) {
    let requisicoes = JSON.parse(localStorage.getItem('honda_requisicoes_gestor'));
    let req = requisicoes.find(r => r.id === id);
    if(req) {
        req.status = novoStatus;
        localStorage.setItem('honda_requisicoes_gestor', JSON.stringify(requisicoes));
        alert(`Requisição ${novoStatus} com sucesso! O setor responsável será notificado.`);
        renderizarAprovacoes();
    }
}

// 5. RELATÓRIO
function exportarRelatorioExecutivo() {
    alert("Gerando Relatório Executivo (PDF)... Ocultando elementos não essenciais da tela.");
    window.print();
}

// Inicia a página
window.onload = () => {
    inicializarDadosGestor();
    renderizarKPIs();
    renderizarAprovacoes();
};