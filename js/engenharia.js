// js/engenharia.js

// 1. Importar ferramentas da Nuvem
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc,
    query,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Variáveis Globais
let equipamentosGlobais = [];
let osGlobais = [];
let equipamentoEmEdicao = null;

// 2. OUVINTES EM TEMPO REAL (Listeners)

// A. Escutar a coleção de Equipamentos (Ativos)
onSnapshot(collection(db, "honda_equipamentos"), (snapshot) => {
    equipamentosGlobais = [];
    snapshot.forEach((doc) => {
        equipamentosGlobais.push({ firestoreId: doc.id, ...doc.data() });
    });

    if (equipamentosGlobais.length === 0) {
        inicializarEquipamentosNaNuvem();
    } else {
        renderizarDashboard();
        renderizarEquipamentos();
    }
});

// B. Escutar as Ordens de Serviço (Para o Inbox de Aprovações Críticas)
// CORREÇÃO: Usamos a mesma ordenação cronológica do resto do sistema
const qOS = query(collection(db, "honda_os_lista"), orderBy("dataCriacao", "desc"));

onSnapshot(qOS, (snapshot) => {
    osGlobais = [];
    snapshot.forEach((doc) => {
        osGlobais.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarAprovacoes();
});

// 3. RENDERIZAÇÃO DA INTERFACE

function renderizarAprovacoes() {
    const lista = document.getElementById('inbox-aprovacoes');
    lista.innerHTML = '';

    // Filtra apenas as OS que o Técnico marcou como "Emergência" e que aguardam o aval do Engenheiro
    const pendentes = osGlobais.filter(os => os.status === 'Aguardando Engenharia');

    if (pendentes.length === 0) {
        lista.innerHTML = '<p class="text-sm text-gray-500 italic text-center p-4">Nenhuma OS crítica aguardando aprovação técnica.</p>';
        return;
    }

    pendentes.forEach(os => {
        lista.innerHTML += `
            <div class="bg-gray-50 border border-red-200 rounded-lg p-4 mb-3 shadow-sm border-l-4 border-l-honda-red">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-red-800">OS #${os.numero} - ${os.maquina}</span>
                    <span class="bg-red-100 text-red-800 text-[10px] px-2 py-1 rounded font-bold uppercase">Aprovação Necessária</span>
                </div>
                <p class="text-xs text-gray-600 mb-2"><strong>Técnico:</strong> ${os.tecnicoNome || 'Não identificado'}</p>
                <p class="text-sm text-gray-600 mb-2"><strong>Diagnóstico:</strong> ${os.diagnostico || 'Sem detalhes técnicos.'}</p>
                <div class="flex gap-2 mt-4 no-print">
                    <button class="btn-julgar flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition" data-id="${os.firestoreId}" data-acao="aprovar">✅ Aprovar e Finalizar</button>
                    <button class="btn-julgar flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition" data-id="${os.firestoreId}" data-acao="reprovar">❌ Devolver ao Técnico</button>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.btn-julgar').forEach(btn => {
        btn.addEventListener('click', (e) => julgarOS(e.target.dataset.id, e.target.dataset.acao));
    });
}

// 4. AÇÕES NA NUVEM (CORRIGIDO)

async function julgarOS(firestoreId, acao) {
    try {
        const osRef = doc(db, "honda_os_lista", firestoreId);
        
        if (acao === 'aprovar') {
            // Se aprovado, o status vira 'Finalizada'. 
            // O Supervisor verá agora o botão de "Validar Horas" na tela dele!
            await updateDoc(osRef, { status: 'Finalizada' });
            alert("Ordem de Serviço aprovada! Enviada para validação de horas do Supervisor.");
        } else {
            // Se reprovado, volta para o Técnico trabalhar mais nela.
            await updateDoc(osRef, { status: 'Em Andamento' });
            alert("Ordem devolvida para o Técnico realizar novos ajustes.");
        }
    } catch (error) {
        alert("Erro ao processar julgamento: " + error);
    }
}

// Manter funções de Equipamentos e Dashboard (Já funcionavam bem)
function renderizarDashboard() {
    let totalHoras = 0, totalFalhas = 0, totalTempoParado = 0;
    equipamentosGlobais.forEach(eq => {
        totalHoras += eq.horasOperacao || 0;
        totalFalhas += eq.falhas || 0;
        totalTempoParado += eq.tempoParado || 0;
    });
    const mtbf = totalFalhas > 0 ? (totalHoras / totalFalhas).toFixed(1) : totalHoras;
    const mttr = totalFalhas > 0 ? (totalTempoParado / totalFalhas).toFixed(1) : 0;
    const disponibilidade = mtbf > 0 ? ((parseFloat(mtbf) / (parseFloat(mtbf) + parseFloat(mttr))) * 100).toFixed(2) : 100;

    document.getElementById('kpi-mtbf').innerText = `${mtbf} h`;
    document.getElementById('kpi-mttr').innerText = `${mttr} h`;
    document.getElementById('kpi-disp').innerText = `${disponibilidade}%`;
    let piorMaquina = [...equipamentosGlobais].sort((a, b) => (b.falhas || 0) - (a.falhas || 0))[0];
    document.getElementById('kpi-falhas').innerText = (piorMaquina && piorMaquina.falhas > 0) ? piorMaquina.nome : "Nenhuma falha";
}

function renderizarEquipamentos() {
    equipamentosGlobais.sort((a,b) => a.idVisual.localeCompare(b.idVisual));
    const tbody = document.getElementById('tabela-equipamentos');
    tbody.innerHTML = '';
    equipamentosGlobais.forEach(eq => {
        let corCrit = eq.criticidade === 'Extrema' ? 'text-red-600 bg-red-100' : (eq.criticidade === 'Alta' ? 'text-orange-600 bg-orange-100' : 'text-green-600 bg-green-100');
        tbody.innerHTML += `<tr class="border-b hover:bg-gray-50 transition">
            <td class="p-3 text-sm font-bold">${eq.idVisual}</td>
            <td class="p-3 text-sm">${eq.nome}</td>
            <td class="p-3 text-sm"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${corCrit}">${eq.criticidade}</span></td>
            <td class="p-3 text-sm text-center">${eq.falhas}</td>
            <td class="p-3 text-sm text-center no-print">
                <button class="btn-editar text-blue-600 hover:underline font-bold" data-id="${eq.firestoreId}">✏️ Editar</button>
            </td>
        </tr>`;
    });
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', (e) => abrirModalEdicao(e.target.dataset.id));
    });
}

// Cadastro e Edição de Máquinas
document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('novo-eq-nome').value;
    const crit = document.getElementById('novo-eq-crit').value;
    await addDoc(collection(db, "honda_equipamentos"), {
        idVisual: `EQ-${Math.floor(100 + Math.random() * 900)}`,
        nome: nome, criticidade: crit, horasOperacao: 0, falhas: 0, tempoParado: 0
    });
    document.getElementById('form-equipamento').reset();
    alert("Equipamento registado na nuvem!");
});

// Guardar POPs
document.getElementById('form-plano').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "honda_planos_manutencao"), {
        titulo: document.getElementById('plano-titulo').value,
        tarefas: document.getElementById('plano-tarefas').value,
        data: new Date().toLocaleDateString()
    });
    document.getElementById('form-plano').reset();
    alert("POP guardado no Firebase!");
});

// Modal e Exportação
function abrirModalEdicao(id) {
    equipamentoEmEdicao = equipamentosGlobais.find(eq => eq.firestoreId === id);
    if(equipamentoEmEdicao) {
        document.getElementById('edit-eq-id').innerText = equipamentoEmEdicao.idVisual;
        document.getElementById('edit-eq-nome').value = equipamentoEmEdicao.nome;
        document.getElementById('edit-eq-crit').value = equipamentoEmEdicao.criticidade;
        document.getElementById('modal-editar-eq').classList.remove('hidden');
    }
}

document.getElementById('btn-fechar-modal-edicao').addEventListener('click', () => document.getElementById('modal-editar-eq').classList.add('hidden'));

document.getElementById('form-editar-eq').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "honda_equipamentos", equipamentoEmEdicao.firestoreId), {
        nome: document.getElementById('edit-eq-nome').value,
        criticidade: document.getElementById('edit-eq-crit').value
    });
    document.getElementById('modal-editar-eq').classList.add('hidden');
    alert("Ativo atualizado!");
});

document.getElementById('btn-exportar-relatorio').addEventListener('click', () => window.print());

async function inicializarEquipamentosNaNuvem() {
    const base = [
        { idVisual: "EQ-001", nome: "Prensa Hidráulica 04 (Linha B)", criticidade: "Alta", horasOperacao: 1200, falhas: 3, tempoParado: 12 },
        { idVisual: "EQ-002", nome: "Robô de Solda A2", criticidade: "Extrema", horasOperacao: 800, falhas: 1, tempoParado: 4 }
    ];
    for (let eq of base) await addDoc(collection(db, "honda_equipamentos"), eq);
}