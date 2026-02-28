// js/supervisor.js

import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Perfil do Usuário
const nomeUser = localStorage.getItem('honda_user_name') || 'Supervisor';
document.getElementById('nome-supervisor').innerText = `Gestão: ${nomeUser}`;
document.getElementById('iniciais-supervisor').innerText = nomeUser.substring(0, 2).toUpperCase();

let osGlobais = [];

// Ouvinte em Tempo Real
const q = query(collection(db, "honda_os_lista"), orderBy("dataCriacao", "desc"));

onSnapshot(q, (snapshot) => {
    osGlobais = [];
    snapshot.forEach((doc) => {
        osGlobais.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarDashboard();
});

function renderizarDashboard() {
    const colunas = {
        Pendente: document.getElementById('col-pendente'),
        'Em Andamento': document.getElementById('col-andamento'),
        'Aguardando Peça': document.getElementById('col-peca'),
        Finalizada: document.getElementById('col-finalizada')
    };

    Object.values(colunas).forEach(c => c.innerHTML = '');

    let kpis = { crit: 0, and: 0, val: 0 };
    let counts = { Pendente: 0, 'Em Andamento': 0, 'Aguardando Peça': 0, Finalizada: 0 };

    osGlobais.forEach(os => {
        // Lógica de Contagem
        if(os.prioridade === 'Emergência' && os.status !== 'Finalizada') kpis.crit++;
        if(os.status === 'Em Andamento') kpis.and++;
        if(os.status === 'Finalizada' && !os.horasValidadas) kpis.val++;

        let statusVisual = counts[os.status] !== undefined ? os.status : 'Pendente';
        
        // Se estiver na Engenharia, visualmente fica na última coluna
        if(os.status === 'Aguardando Engenharia') statusVisual = 'Finalizada';
        counts[statusVisual]++;

        // Criar Card
        const card = document.createElement('div');
        let classes = "relative p-3 rounded-xl shadow-sm border border-gray-100 bg-white hover:shadow-md transition ";
        
        if(os.status === 'Aguardando Engenharia') classes += "opacity-60 border-dashed border-orange-300 ";
        if(os.prioridade === 'Emergência' && os.status !== 'Finalizada') classes += "border-l-4 border-l-red-600 ";
        
        card.className = classes;

        let btnAcao = '';
        if(os.status === 'Pendente') {
            btnAcao = `
                <select class="select-tec w-full mt-2 text-xs border rounded p-1 bg-gray-50" data-id="${os.firestoreId}">
                    <option value="">Atribuir Técnico...</option>
                    <option value="João Silva">João Silva</option>
                    <option value="Roberto Mendes">Roberto Mendes</option>
                    <option value="Maria Costa">Maria Costa</option>
                </select>`;
        } else if(os.status === 'Finalizada') {
            if(os.horasValidadas) {
                btnAcao = `<div class="mt-2 text-[10px] font-bold text-green-700 bg-green-100 py-1 rounded text-center">VALIDADO</div>`;
            } else {
                btnAcao = `<button class="btn-validar w-full mt-2 text-xs font-bold text-white bg-green-600 py-2 rounded" data-id="${os.firestoreId}">Validar ${os.tempoGasto} min</button>`;
            }
        } else if(os.status === 'Aguardando Engenharia') {
            btnAcao = `<div class="mt-2 text-[10px] font-bold text-orange-600 italic">⏳ Aguardando Engenharia</div>`;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-black">OS #${os.numero}</span>
                <span class="text-[9px] font-bold text-gray-400 uppercase">${os.tecnicoNome || 'S/ Técnico'}</span>
            </div>
            <h4 class="text-xs font-bold text-gray-700 leading-tight">${os.maquina}</h4>
            <p class="text-[10px] text-gray-500 line-clamp-1">${os.descricao}</p>
            ${btnAcao}
        `;

        colunas[statusVisual].appendChild(card);
    });

    // Atualizar UI
    document.getElementById('kpi-criticas').innerText = kpis.crit;
    document.getElementById('kpi-andamento').innerText = kpis.and;
    document.getElementById('kpi-validacao').innerText = kpis.val;
    document.getElementById('count-pendente').innerText = counts.Pendente;
    document.getElementById('count-andamento').innerText = counts['Em Andamento'];
    document.getElementById('count-peca').innerText = counts['Aguardando Peça'];
    document.getElementById('count-finalizada').innerText = counts.Finalizada;

    renderizarCarga();
    vincularEventos();
}

function renderizarCarga() {
    const painel = document.getElementById('painel-carga-equipa');
    painel.innerHTML = '';
    let carga = {};
    osGlobais.forEach(os => {
        if((os.status === 'Em Andamento' || os.status === 'Aguardando Peça') && os.tecnicoNome) {
            carga[os.tecnicoNome] = (carga[os.tecnicoNome] || 0) + 1;
        }
    });

    Object.keys(carga).forEach(tec => {
        let perc = Math.min((carga[tec] / 5) * 100, 100);
        let cor = perc >= 80 ? 'bg-red-500' : 'bg-green-500';
        painel.innerHTML += `
            <div class="text-[10px]">
                <div class="flex justify-between mb-1 font-bold"><span>${tec}</span><span>${carga[tec]} OS</span></div>
                <div class="w-full bg-gray-200 h-1.5 rounded-full"><div class="${cor} h-1.5 rounded-full" style="width:${perc}%"></div></div>
            </div>`;
    });
}

function vincularEventos() {
    document.querySelectorAll('.select-tec').forEach(s => {
        s.addEventListener('change', async (e) => {
            if(e.target.value) {
                await updateDoc(doc(db, "honda_os_lista", e.target.dataset.id), { 
                    tecnicoNome: e.target.value, status: 'Em Andamento' 
                });
            }
        });
    });

    document.querySelectorAll('.btn-validar').forEach(b => {
        b.addEventListener('click', async (e) => {
            await updateDoc(doc(db, "honda_os_lista", e.target.dataset.id), { horasValidadas: true });
        });
    });
}

document.getElementById('btn-exportar').onclick = () => window.print();