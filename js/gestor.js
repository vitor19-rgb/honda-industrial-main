// js/gestor.js

// 1. Importar ferramentas da Nuvem
import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc,
    addDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Personalizar Cabeçalho com o nome do utilizador logado
const nomeUtilizador = localStorage.getItem('honda_user_name') || 'Diretoria';
document.getElementById('nome-gestor').innerText = `Gestor Logado: ${nomeUtilizador}`;

// Variáveis de Dados
let osGlobais = [];
let capexGlobais = [];

// Constantes Financeiras Fictícias para a Apresentação
const ORCAMENTO_TOTAL = 50000;
const CUSTO_HORA_TECNICO = 65; // R$ 65 por hora de trabalho
const CUSTO_PECA_MEDIA = 120; // R$ 120 por peça usada (Média)

// 3. OUVINTES EM TEMPO REAL (Sincronizados)

// A. Escutar Ordens de Serviço (Para Custos e Produtividade)
// CORREÇÃO: Usar a mesma ordenação cronológica das outras telas
const qOS = query(collection(db, "honda_os_lista"), orderBy("dataCriacao", "desc"));

onSnapshot(qOS, (snapshot) => {
    osGlobais = [];
    snapshot.forEach((doc) => {
        osGlobais.push({ firestoreId: doc.id, ...doc.data() });
    });
    calcularFinancas();
    renderizarProdutividade();
});

// B. Escutar Pedidos de CAPEX (Investimentos)
onSnapshot(collection(db, "honda_capex"), (snapshot) => {
    capexGlobais = [];
    snapshot.forEach((doc) => {
        capexGlobais.push({ firestoreId: doc.id, ...doc.data() });
    });

    if(capexGlobais.length === 0) {
        gerarCapexDeTeste(); 
    } else {
        renderizarCapex();
    }
});

// 4. LÓGICA FINANCEIRA INTEGRADA

function calcularFinancas() {
    let custoTotal = 0;

    osGlobais.forEach(os => {
        // INTEGRAÇÃO: O custo só entra no balanço quando a OS está 'Finalizada' 
        // (passou pela Engenharia se era Emergência) E foi validada pelo Supervisor.
        if(os.status === 'Finalizada' && os.horasValidadas) {
            
            // Calcula Custo da Mão de Obra
            let horas = (os.tempoGasto || 0) / 60;
            custoTotal += horas * CUSTO_HORA_TECNICO;

            // Calcula Custo das Peças Usadas
            if(os.pecasUsadas && os.pecasUsadas.length > 0) {
                os.pecasUsadas.forEach(peca => {
                    custoTotal += parseInt(peca.qtd) * CUSTO_PECA_MEDIA;
                });
            }
        }
    });

    let saldo = ORCAMENTO_TOTAL - custoTotal;
    let percentualUso = (custoTotal / ORCAMENTO_TOTAL) * 100;

    const formataDinheiro = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('kpi-custo-atual').innerText = formataDinheiro(custoTotal);
    document.getElementById('kpi-saldo').innerText = formataDinheiro(saldo);
    
    let barra = document.getElementById('barra-orcamento');
    barra.style.width = `${Math.min(percentualUso, 100)}%`;
    document.getElementById('percentual-orcamento').innerText = `${percentualUso.toFixed(1)}%`;

    if(percentualUso > 80) {
        barra.classList.remove('bg-honda-red');
        barra.classList.add('bg-black'); 
    }
}

function renderizarProdutividade() {
    const tbody = document.getElementById('tabela-produtividade');
    tbody.innerHTML = '';

    let produtividade = {};

    osGlobais.forEach(os => {
        // Só conta para a produtividade se o ciclo de trabalho estiver validado
        if(os.status === 'Finalizada' && os.horasValidadas && os.tecnicoNome) {
            if(!produtividade[os.tecnicoNome]) {
                produtividade[os.tecnicoNome] = { osFechadas: 0, minutosTotais: 0 };
            }
            produtividade[os.tecnicoNome].osFechadas += 1;
            produtividade[os.tecnicoNome].minutosTotais += parseInt(os.tempoGasto || 0);
        }
    });

    let ranking = Object.keys(produtividade).map(nome => {
        return { nome: nome, ...produtividade[nome] };
    }).sort((a, b) => b.osFechadas - a.osFechadas);

    if(ranking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-sm text-gray-500">Nenhuma produtividade validada na nuvem.</td></tr>';
        return;
    }

    ranking.forEach((tec, index) => {
        let horas = Math.floor(tec.minutosTotais / 60);
        let min = tec.minutosTotais % 60;
        let icone = index === 0 ? '🏆' : (index === 1 ? '🥈' : '🏅');

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 text-sm font-bold text-gray-800 flex items-center gap-2">${icone} ${tec.nome}</td>
                <td class="p-3 text-sm text-center font-black text-blue-600">${tec.osFechadas}</td>
                <td class="p-3 text-sm text-center text-gray-600">${horas}h ${min}m</td>
            </tr>
        `;
    });
}

// 5. GESTÃO DE INVESTIMENTOS (CAPEX)

function renderizarCapex() {
    const lista = document.getElementById('lista-capex');
    lista.innerHTML = '';

    let pendentes = capexGlobais.filter(c => c.status === 'Pendente');

    if(pendentes.length === 0) {
        lista.innerHTML = '<p class="text-sm text-green-600 font-bold bg-green-50 p-3 rounded text-center">Nenhum pedido de investimento pendente.</p>';
        return;
    }

    pendentes.forEach(capex => {
        lista.innerHTML += `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-black text-gray-800 text-sm">${capex.titulo}</span>
                    <span class="bg-yellow-200 text-yellow-800 text-[10px] uppercase font-bold px-2 py-1 rounded">Pendente</span>
                </div>
                <p class="text-xs text-gray-500 mb-2">De: ${capex.solicitante}</p>
                <p class="text-sm text-gray-700 italic border-l-2 border-yellow-400 pl-2 mb-3 p-1 bg-white rounded">${capex.justificativa}</p>
                
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-yellow-200">
                    <span class="font-black text-honda-red text-lg">${capex.valor}</span>
                    <div class="flex gap-2 no-print">
                        <button class="btn-capex text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded transition" data-id="${capex.firestoreId}" data-acao="Aprovado">✅ Aprovar</button>
                        <button class="btn-capex text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded transition" data-id="${capex.firestoreId}" data-acao="Rejeitado">❌ Negar</button>
                    </div>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.btn-capex').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            let id = e.target.dataset.id;
            let acao = e.target.dataset.acao;
            try {
                await updateDoc(doc(db, "honda_capex", id), { status: acao });
                alert(`Investimento ${acao} com sucesso!`);
            } catch (err) { alert("Erro ao processar CAPEX: " + err); }
        });
    });
}

// Funções de Suporte
async function gerarCapexDeTeste() {
    await addDoc(collection(db, "honda_capex"), {
        titulo: "Novo Robô de Solda A2",
        justificativa: "Substituição por obsolescência técnica.",
        valor: "R$ 185.000,00",
        solicitante: "Engenharia",
        status: "Pendente"
    });
}

document.getElementById('btn-exportar').addEventListener('click', () => window.print());