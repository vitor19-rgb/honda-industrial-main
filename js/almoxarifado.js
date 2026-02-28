// js/almoxarifado.js

// 1. Importar Firebase e ferramentas do Firestore
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

// Variáveis globais para armazenar os dados da nuvem
let estoqueGlobal = [];
let osGlobalLista = [];

// 2. OUVINTES EM TEMPO REAL (Sincronização Nuvem)

// Escutar o Estoque
onSnapshot(collection(db, "honda_estoque"), (snapshot) => {
    estoqueGlobal = [];
    snapshot.forEach((doc) => {
        estoqueGlobal.push({ firestoreId: doc.id, ...doc.data() });
    });
    
    if(estoqueGlobal.length === 0) {
        inicializarEstoqueNaNuvem();
    } else {
        renderizarInventario();
    }
});

// CORREÇÃO: Escutar OS com a mesma ordenação das outras telas
const qOS = query(collection(db, "honda_os_lista"), orderBy("dataCriacao", "desc"));

onSnapshot(qOS, (snapshot) => {
    osGlobalLista = [];
    snapshot.forEach((doc) => {
        osGlobalLista.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarRankingConsumo();
    atualizarSelectOS();
});

// 3. FUNÇÕES DE INTERFACE

function atualizarSelectOS() {
    const selectOs = document.getElementById('numero-os');
    selectOs.innerHTML = '<option value="">Selecione a Ordem de Serviço...</option>';
    
    // CORREÇÃO IHC: Filtra OS que já estão na Engenharia ou Finalizadas (pois o trabalho já terminou)
    let osAbertas = osGlobalLista.filter(os => 
        os.status !== 'Finalizada' && 
        os.status !== 'Aguardando Engenharia'
    );
    
    osAbertas.forEach(os => {
        // Agora mostramos o Técnico para facilitar a identificação no balcão do Almoxarifado
        let tecnico = os.tecnicoNome ? `(${os.tecnicoNome})` : "(Sem Técnico)";
        selectOs.innerHTML += `<option value="${os.firestoreId}">OS #${os.numero} - ${os.maquina} ${tecnico}</option>`;
    });
}

function renderizarInventario() {
    const tbody = document.getElementById('tabela-inventario');
    const selectPeca = document.getElementById('peca-selecionada');
    
    tbody.innerHTML = '';
    selectPeca.innerHTML = '<option value="">Selecione uma peça...</option>';

    estoqueGlobal.sort((a,b) => a.nome.localeCompare(b.nome));

    estoqueGlobal.forEach(item => {
        let corFundo = '';
        let corTexto = 'text-gray-800';
        let alerta = '';

        if (item.quantidade === 0) {
            corFundo = 'bg-red-100'; 
            corTexto = 'text-red-800 font-bold';
            alerta = '🔴 ZERADO';
        } else if (item.quantidade < item.estoqueMinimo) {
            corFundo = 'bg-yellow-50'; 
            corTexto = 'text-yellow-800';
            alerta = '⚠️ BAIXO';
        }

        tbody.innerHTML += `
            <tr class="border-b ${corFundo} transition duration-200 hover:bg-gray-50">
                <td class="p-3 text-sm ${corTexto}">${item.nome} <span class="text-xs ml-2">${alerta}</span></td>
                <td class="p-3 text-sm text-center font-bold ${corTexto}">${item.quantidade}</td>
                <td class="p-3 text-sm text-center">${item.estoqueMinimo}</td>
                <td class="p-3 text-sm">${item.maquina || 'Geral'}</td>
                <td class="p-3 text-sm text-center">
                    <button class="btn-comprar bg-honda-dark text-white px-3 py-1 rounded text-xs hover:bg-black transition" data-id="${item.firestoreId}" ${item.status === 'Comprando...' ? 'disabled' : ''}>
                        ${item.status === 'Comprando...' ? 'Pedido Enviado' : 'Comprar'}
                    </button>
                </td>
            </tr>
        `;

        selectPeca.innerHTML += `<option value="${item.firestoreId}">${item.nome} (Estoque: ${item.quantidade})</option>`;
    });

    renderizarAlertasEsgotados();

    document.querySelectorAll('.btn-comprar').forEach(btn => {
        btn.addEventListener('click', (e) => solicitarCompraNaNuvem(e.target.dataset.id));
    });
}

// 4. AÇÕES DE BAIXA E MOVIMENTAÇÃO (CORRIGIDO)

document.getElementById('form-baixa-os').addEventListener('submit', async (event) => {
    event.preventDefault();
    const osId = document.getElementById('numero-os').value;
    const pecaId = document.getElementById('peca-selecionada').value;
    const qtdBaixa = parseInt(document.getElementById('qtd-baixa').value);

    let peca = estoqueGlobal.find(p => p.firestoreId === pecaId);
    let os = osGlobalLista.find(o => o.firestoreId === osId);
    
    if (!peca || !os) return alert("Selecione uma OS e uma peça válidas.");

    if (peca.quantidade < qtdBaixa) {
        return alert(`⚠️ ESTOQUE INSUFICIENTE!\nA peça "${peca.nome}" tem apenas ${peca.quantidade} unidades.`);
    }

    try {
        // 1. Atualiza stock
        const pecaRef = doc(db, "honda_estoque", pecaId);
        await updateDoc(pecaRef, { quantidade: peca.quantidade - qtdBaixa });

        // 2. Atualiza a OS (Peças + NOVO STATUS AUTOMÁTICO)
        const osRef = doc(db, "honda_os_lista", osId);
        let listaPecasUsadas = os.pecasUsadas || [];
        listaPecasUsadas.push({ pecaId: pecaId, nome: peca.nome, qtd: qtdBaixa });
        
        // MÁGICA DE INTEGRAÇÃO: Se a OS estava parada por peça, ela volta a ficar "Em Andamento"
        let novoStatus = os.status;
        if(os.status === 'Aguardando Peça') {
            novoStatus = 'Em Andamento';
        }
        
        await updateDoc(osRef, { 
            pecasUsadas: listaPecasUsadas,
            status: novoStatus 
        });

        alert(`Baixa processada! A OS #${os.numero} foi atualizada na nuvem.`);
        document.getElementById('form-baixa-os').reset();
    } catch (error) {
        alert("Erro na operação: " + error);
    }
});

// Funções Auxiliares (Mesma lógica do original)
async function solicitarCompraNaNuvem(pecaId) {
    try {
        await updateDoc(doc(db, "honda_estoque", pecaId), { status: 'Comprando...' });
        alert("Pedido de compra enviado ao Gestor!");
    } catch (error) { console.error(error); }
}

function renderizarRankingConsumo() {
    let consumo = {};
    osGlobalLista.forEach(os => {
        if (!consumo[os.maquina]) consumo[os.maquina] = 0;
        if (os.pecasUsadas) os.pecasUsadas.forEach(p => consumo[os.maquina] += parseInt(p.qtd));
    });
    let ranking = Object.keys(consumo).map(m => ({ maquina: m, total: consumo[m] })).sort((a,b) => b.total - a.total);
    const container = document.getElementById('lista-ranking-consumo');
    container.innerHTML = ranking.length ? '' : '<p class="text-xs text-gray-500 italic p-4">Sem consumo.</p>';
    ranking.forEach((item, idx) => {
        if (item.total > 0) {
            container.innerHTML += `<div class="flex justify-between p-3 border-b mb-2 rounded bg-white shadow-sm text-sm">
                <span>${idx === 0 ? '🥇' : '▪️'} ${item.maquina}</span>
                <span class="bg-gray-800 text-white px-3 py-1 rounded-full text-xs">${item.total} unid.</span>
            </div>`;
        }
    });
}

function renderizarAlertasEsgotados() {
    const esgotados = estoqueGlobal.filter(item => item.quantidade === 0);
    const painel = document.getElementById('painel-alertas');
    if (esgotados.length > 0) {
        painel.innerHTML = `<div class="bg-red-100 border-l-8 border-red-600 p-4 mb-6 rounded-r-lg shadow-md animate-pulse">
            <h3 class="text-red-800 font-black text-lg uppercase">🚨 Atenção: Itens Indisponíveis!</h3>
            <ul class="text-red-700 text-sm pl-9">${esgotados.map(i => `<li>• ${i.nome}</li>`).join('')}</ul>
        </div>`;
    } else painel.innerHTML = '';
}

async function inicializarEstoqueNaNuvem() {
    const base = [
        { nome: "Filtro de Óleo HD-20", quantidade: 15, estoqueMinimo: 10, maquina: "Prensa 04", status: "Disponível" },
        { nome: "Correia de Transmissão", quantidade: 2, estoqueMinimo: 5, maquina: "Linha B", status: "Disponível" },
        { nome: "Vela de Ignição", quantidade: 0, estoqueMinimo: 20, maquina: "Teste", status: "Esgotado" }
    ];
    for (let i of base) await addDoc(collection(db, "honda_estoque"), i);
}