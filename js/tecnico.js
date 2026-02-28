// js/tecnico.js

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

// 2. Definir o Utilizador (Nome vindo do Login do Google)
const nomeUtilizador = localStorage.getItem('honda_user_name') || 'Técnico Visitante';
document.getElementById('nome-tecnico').innerText = nomeUtilizador;
document.getElementById('iniciais-tecnico').innerText = nomeUtilizador.substring(0, 2).toUpperCase();

// Variável global para guardar as OS lidas da nuvem
let osGlobalList = [];

// 3. OUVINTE EM TEMPO REAL (A Magia do Firebase)
// Escuta a coleção na nuvem e atualiza a interface automaticamente
const q = query(collection(db, "honda_os_lista"), orderBy("dataCriacao", "desc"));

onSnapshot(q, (snapshot) => {
    osGlobalList = [];
    snapshot.forEach((doc) => {
        osGlobalList.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarOS();
});

// 4. RENDERIZAR INTERFACE
function renderizarOS() {
    const container = document.getElementById('lista-os-container');
    container.innerHTML = '';

    // Filtrar/Exibir as OS (pode ser filtrado por técnico aqui se desejar)
    let osDoTecnico = osGlobalList; 

    atualizarSininho(osDoTecnico);

    if (osDoTecnico.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 p-6">Nenhuma OS atribuída no momento.</p>';
        return;
    }

    osDoTecnico.forEach(os => {
        let badgeClass = "bg-yellow-100 text-yellow-800";
        if(os.status === 'Em Andamento') badgeClass = "bg-blue-100 text-blue-800";
        if(os.status === 'Aguardando Peça') badgeClass = "bg-orange-100 text-orange-800";
        if(os.status === 'Finalizada') badgeClass = "bg-green-100 text-green-800";
        if(os.status === 'Aguardando Engenharia') badgeClass = "bg-purple-100 text-purple-800";

        let pecasUsadasHtml = (os.pecasUsadas || []).map(p => `<li class="text-sm font-bold text-gray-700 mt-1">✔️ ${p.qtd}x ${p.nome}</li>`).join('');

        const cartao = document.createElement('div');
        cartao.className = "bg-white rounded-2xl shadow-sm border border-gray-200 mb-4 overflow-hidden";
        cartao.innerHTML = `
            <div class="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition" id="header-${os.firestoreId}">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-black text-gray-800 text-lg">OS #${os.numero}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${badgeClass}">${os.status}</span>
                </div>
                <h3 class="font-bold text-gray-700 text-base">${os.maquina}</h3>
                <p class="text-gray-500 text-sm mt-1 line-clamp-2">${os.descricao}</p>
            </div>

            <div id="details-${os.firestoreId}" class="hidden bg-gray-50 p-4 border-t border-gray-200">
                <p class="text-xs font-bold text-gray-500 uppercase mb-2">Alterar Status</p>
                <div class="grid grid-cols-3 gap-2 mb-6">
                    <button class="btn-status bg-blue-100 text-blue-800 rounded-xl font-bold text-xs py-3 hover:bg-blue-200" data-id="${os.firestoreId}" data-status="Em Andamento">Andamento</button>
                    <button class="btn-status bg-orange-100 text-orange-800 rounded-xl font-bold text-xs py-3 hover:bg-orange-200" data-id="${os.firestoreId}" data-status="Aguardando Peça">Ag. Peça</button>
                    <button class="btn-status bg-green-100 text-green-800 rounded-xl font-bold text-xs py-3 hover:bg-green-200" data-id="${os.firestoreId}" data-status="Finalizada">Finalizada</button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Diagnóstico do Técnico</label>
                        <textarea id="diag-${os.firestoreId}" rows="2" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" placeholder="O que foi feito?">${os.diagnostico || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Tempo (min)</label>
                            <input type="number" id="tempo-${os.firestoreId}" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none" value="${os.tempoGasto || ''}" placeholder="Ex: 45">
                        </div>
                    </div>

                    <button class="btn-salvar w-full bg-honda-dark text-white font-bold py-4 rounded-xl mt-4 hover:bg-black transition" data-id="${os.firestoreId}">Salvar Relatório na Nuvem</button>
                </div>
            </div>
        `;

        container.appendChild(cartao);

        document.getElementById(`header-${os.firestoreId}`).addEventListener('click', () => {
            document.getElementById(`details-${os.firestoreId}`).classList.toggle('hidden');
        });

        const statusBtns = cartao.querySelectorAll('.btn-status');
        statusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => mudarStatusNaNuvem(e.target.dataset.id, e.target.dataset.status));
        });

        const salvarBtn = cartao.querySelector('.btn-salvar');
        salvarBtn.addEventListener('click', (e) => salvarDiagnosticoNaNuvem(e.target.dataset.id));
    });
}

// 5. FUNÇÕES DE GRAVAÇÃO NA NUVEM (FIRESTORE)

async function mudarStatusNaNuvem(firestoreId, novoStatus) {
    try {
        const osRef = doc(db, "honda_os_lista", firestoreId);
        let statusFinal = novoStatus;

        // CORREÇÃO: Lógica para enviar OS de Emergência para a Engenharia
        const osAtual = osGlobalList.find(o => o.firestoreId === firestoreId);
        if(novoStatus === 'Finalizada' && osAtual.prioridade === 'Emergência') {
            statusFinal = 'Aguardando Engenharia';
            alert("Esta OS é de Emergência. Foi enviada para validação da Engenharia.");
        }

        await updateDoc(osRef, { status: statusFinal });
    } catch (error) {
        alert("Erro ao atualizar status na nuvem: " + error);
    }
}

async function salvarDiagnosticoNaNuvem(firestoreId) {
    const diag = document.getElementById(`diag-${firestoreId}`).value;
    const tempo = parseInt(document.getElementById(`tempo-${firestoreId}`).value) || 0;
    
    try {
        const osRef = doc(db, "honda_os_lista", firestoreId);
        await updateDoc(osRef, { 
            diagnostico: diag,
            tempoGasto: tempo
        });
        alert("Relatório salvo no Banco de Dados com sucesso!");
    } catch (error) {
        alert("Erro ao salvar: " + error);
    }
}

// 6. CRIAR NOVA OS (Sempre como Emergência para teste do fluxo crítico)
document.getElementById('form-nova-os').addEventListener('submit', async (event) => {
    event.preventDefault();
    const maquina = document.getElementById('nova-os-maquina').value;
    const descricao = document.getElementById('nova-os-descricao').value;
    const numeroUnico = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await addDoc(collection(db, "honda_os_lista"), {
            numero: numeroUnico,
            maquina: maquina,
            descricao: descricao,
            status: "Pendente",
            prioridade: "Emergência",
            diagnostico: "",
            tecnicoNome: nomeUtilizador,
            tempoGasto: 0,
            pecasUsadas: [],
            horasValidadas: false,
            dataCriacao: new Date().getTime()
        });

        document.getElementById('modal-nova-os').classList.add('hidden');
        document.getElementById('form-nova-os').reset();
        alert("OS criada e sincronizada com sucesso!");
    } catch (error) {
        alert("Erro ao criar OS: " + error);
    }
});

// Eventos de Modais
document.getElementById('btn-abrir-modal-os').addEventListener('click', () => {
    document.getElementById('modal-nova-os').classList.remove('hidden');
});

document.getElementById('btn-fechar-modal-os').addEventListener('click', () => {
    document.getElementById('modal-nova-os').classList.add('hidden');
});

// Notificações (Sininho)
function atualizarSininho(osDoTecnico) {
    let osAtivas = osDoTecnico.filter(os => os.status !== 'Finalizada' && os.status !== 'Aguardando Engenharia');
    let badge = document.getElementById('badge-notificacao');

    if(osAtivas.length > 0) {
        badge.innerText = osAtivas.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}