// js/engenharia.js

// 1. INICIALIZAÇÃO DE DADOS ESTRUTURAIS
function inicializarDadosEngenharia() {
    let equipamentos = localStorage.getItem('honda_equipamentos');
    if (!equipamentos) {
        const maquinasIniciais = [
            { id: "EQ-001", nome: "Prensa Hidráulica 04 (Linha B)", criticidade: "Alta", horasOperacao: 1200, falhas: 3, tempoParado: 12 },
            { id: "EQ-002", nome: "Robô de Solda A2", criticidade: "Extrema", horasOperacao: 800, falhas: 1, tempoParado: 4 },
            { id: "EQ-003", nome: "Esteira de Montagem Principal", criticidade: "Alta", horasOperacao: 2000, falhas: 5, tempoParado: 15 }
        ];
        localStorage.setItem('honda_equipamentos', JSON.stringify(maquinasIniciais));
    }

    let planos = localStorage.getItem('honda_planos_manutencao');
    if (!planos) {
        localStorage.setItem('honda_planos_manutencao', JSON.stringify([]));
    }

    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    if (!osLista.find(os => os.status === 'Aguardando Engenharia')) {
        osLista.push({
            id: "2099",
            maquina: "Robô de Solda A2",
            descricao: "Falha catastrófica no braço robótico. Substituição do servo motor.",
            status: "Aguardando Engenharia",
            diagnostico: "Motor trocado e recalibrado. Testes OK.",
            pecasUsadas: [{ nome: "Servo Motor 500W", qtd: 1 }]
        });
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    }
}

// 2. CÁLCULO DE INDICADORES (KPIs)
function renderizarDashboard() {
    const equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    
    let totalHoras = 0;
    let totalFalhas = 0;
    let totalTempoParado = 0;

    equipamentos.forEach(eq => {
        totalHoras += eq.horasOperacao;
        totalFalhas += eq.falhas;
        totalTempoParado += eq.tempoParado;
    });

    const mtbf = totalFalhas > 0 ? (totalHoras / totalFalhas).toFixed(1) : totalHoras;
    const mttr = totalFalhas > 0 ? (totalTempoParado / totalFalhas).toFixed(1) : 0;
    const disponibilidade = mtbf > 0 ? ((parseFloat(mtbf) / (parseFloat(mtbf) + parseFloat(mttr))) * 100).toFixed(2) : 100;

    document.getElementById('kpi-mtbf').innerText = `${mtbf} h`;
    document.getElementById('kpi-mttr').innerText = `${mttr} h`;
    document.getElementById('kpi-disp').innerText = `${disponibilidade}%`;

    let piorMaquina = equipamentos.sort((a, b) => b.falhas - a.falhas)[0];
    document.getElementById('kpi-falhas').innerText = piorMaquina ? piorMaquina.nome : "Nenhuma falha";
}

// 3. GESTÃO DE EQUIPAMENTOS (CRIAR E RENDERIZAR)
function renderizarEquipamentos() {
    // Reordena pelo ID para manter a tabela organizada
    const equipamentos = (JSON.parse(localStorage.getItem('honda_equipamentos')) || []).sort((a,b) => a.id.localeCompare(b.id));
    const tbody = document.getElementById('tabela-equipamentos');
    tbody.innerHTML = '';

    equipamentos.forEach(eq => {
        let corCriticidade = eq.criticidade === 'Extrema' ? 'text-red-600 bg-red-100' : (eq.criticidade === 'Alta' ? 'text-orange-600 bg-orange-100' : 'text-green-600 bg-green-100');
        
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 text-sm font-bold text-gray-800">${eq.id}</td>
                <td class="p-3 text-sm">${eq.nome}</td>
                <td class="p-3 text-sm"><span class="px-2 py-1 rounded-full text-xs font-bold ${corCriticidade}">${eq.criticidade}</span></td>
                <td class="p-3 text-sm text-center">${eq.falhas}</td>
                <td class="p-3 text-sm text-center no-print">
                    <button onclick="abrirModalEdicao('${eq.id}')" class="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded transition">✏️ Editar</button>
                </td>
            </tr>
        `;
    });
}

function cadastrarEquipamento(event) {
    event.preventDefault();
    const nome = document.getElementById('novo-eq-nome').value;
    const criticidade = document.getElementById('novo-eq-crit').value;
    const id = `EQ-${Math.floor(100 + Math.random() * 900)}`;

    let equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    equipamentos.push({ id, nome, criticidade, horasOperacao: 0, falhas: 0, tempoParado: 0 });
    
    localStorage.setItem('honda_equipamentos', JSON.stringify(equipamentos));
    document.getElementById('form-equipamento').reset();
    renderizarEquipamentos();
    alert("Equipamento cadastrado com sucesso!");
}

// 4. EDIÇÃO DE EQUIPAMENTOS (NOVO - BUG RESOLVIDO)
let equipamentoEmEdicao = null;

function abrirModalEdicao(id) {
    let equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    equipamentoEmEdicao = equipamentos.find(eq => eq.id === id);
    
    if(equipamentoEmEdicao) {
        document.getElementById('edit-eq-id').innerText = equipamentoEmEdicao.id;
        document.getElementById('edit-eq-nome').value = equipamentoEmEdicao.nome;
        document.getElementById('edit-eq-crit').value = equipamentoEmEdicao.criticidade;
        
        document.getElementById('modal-editar-eq').classList.remove('hidden');
    }
}

function fecharModalEdicao() {
    document.getElementById('modal-editar-eq').classList.add('hidden');
    equipamentoEmEdicao = null;
}

function salvarEdicaoEquipamento(event) {
    event.preventDefault();
    if(!equipamentoEmEdicao) return;

    const novoNome = document.getElementById('edit-eq-nome').value;
    const novaCriticidade = document.getElementById('edit-eq-crit').value;

    let equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    let index = equipamentos.findIndex(eq => eq.id === equipamentoEmEdicao.id);
    
    if(index !== -1) {
        equipamentos[index].nome = novoNome;
        equipamentos[index].criticidade = novaCriticidade;
        localStorage.setItem('honda_equipamentos', JSON.stringify(equipamentos));
        
        alert("Dados do equipamento atualizados com sucesso!");
        fecharModalEdicao();
        renderizarEquipamentos();
    }
}

// 5. PADRONIZAÇÃO TÉCNICA
function salvarPlano(event) {
    event.preventDefault();
    const titulo = document.getElementById('plano-titulo').value;
    const tarefas = document.getElementById('plano-tarefas').value;
    const anexo = document.getElementById('plano-anexo').files.length > 0 ? "Anexo Enviado" : "Sem Anexo";

    let planos = JSON.parse(localStorage.getItem('honda_planos_manutencao')) || [];
    planos.push({ titulo, tarefas, anexo, data: new Date().toLocaleDateString() });
    localStorage.setItem('honda_planos_manutencao', JSON.stringify(planos));
    
    document.getElementById('form-plano').reset();
    alert("Plano de manutenção padronizado e salvo no sistema!");
}

// 6. CAIXA DE APROVAÇÕES
function renderizarAprovacoes() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const lista = document.getElementById('inbox-aprovacoes');
    lista.innerHTML = '';

    const pendentes = osLista.filter(os => os.status === 'Aguardando Engenharia');

    if (pendentes.length === 0) {
        lista.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma OS aguardando aprovação no momento.</p>';
        return;
    }

    pendentes.forEach(os => {
        lista.innerHTML += `
            <div class="bg-gray-50 border border-red-200 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-red-800">OS #${os.id} - ${os.maquina}</span>
                    <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">Crítica</span>
                </div>
                <p class="text-sm text-gray-600 mb-2"><strong>Diagnóstico do Técnico:</strong> ${os.diagnostico}</p>
                <div class="flex gap-2 mt-3 no-print">
                    <button onclick="aprovarOS('${os.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">Aprovar e Finalizar</button>
                    <button onclick="reprovarOS('${os.id}')" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-400">Devolver</button>
                </div>
            </div>
        `;
    });
}

function aprovarOS(id) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === id);
    if(os) {
        os.status = 'Finalizada';
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert(`OS #${id} aprovada com sucesso! Histórico atualizado.`);
        renderizarAprovacoes();
    }
}

function reprovarOS(id) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === id);
    if(os) {
        os.status = 'Em Andamento';
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert(`OS #${id} devolvida para o técnico corrigir.`);
        renderizarAprovacoes();
    }
}

// 7. RELATÓRIO
function exportarRelatorioEngenharia() {
    alert("Gerando Relatório de Confiabilidade (MTBF/MTTR)...\nPreparando documento em PDF.");
    window.print();
}

// Inicia a página
window.onload = () => {
    inicializarDadosEngenharia();
    renderizarDashboard();
    renderizarEquipamentos();
    renderizarAprovacoes();
};