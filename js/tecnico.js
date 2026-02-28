// js/tecnico.js

// 1. INICIALIZAÇÃO
function inicializarDados() {
    let osLista = localStorage.getItem('honda_os_lista');
    if (!osLista) {
        const osInicial = [{ 
            id: "1042", 
            maquina: "Prensa Hidráulica 04 (Linha B)", 
            descricao: "Queda de pressão no cilindro principal durante ciclo de estampagem.", 
            status: "Pendente", 
            prioridade: "Alta",
            diagnostico: "", 
            tecnicoId: "T1",
            pecasUsadas: [],
            horasValidadas: false
        }];
        localStorage.setItem('honda_os_lista', JSON.stringify(osInicial));
    }
}

// 2. RENDERIZAÇÃO DAS OS
function renderizarOS() {
    const osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const estoque = JSON.parse(localStorage.getItem('honda_estoque')) || [];
    const container = document.getElementById('lista-os-container');
    container.innerHTML = '';

    let opcoesPecas = '<option value="">Selecione a peça utilizada...</option>';
    estoque.forEach(peca => {
        if(peca.quantidade > 0) {
            opcoesPecas += `<option value="${peca.id}">${peca.nome} (Estoque: ${peca.quantidade})</option>`;
        }
    });

    let osDoTecnico = osLista.filter(os => os.tecnicoId === "T1" || os.tecnicoId === null);

    // Atualiza o Sininho de Notificações (NOVO)
    atualizarSininho(osDoTecnico);

    osDoTecnico.forEach(os => {
        let badgeClass = "bg-yellow-100 text-yellow-800";
        if(os.status === 'Em Andamento') badgeClass = "bg-blue-100 text-blue-800";
        if(os.status === 'Aguardando Peça') badgeClass = "bg-orange-100 text-orange-800";
        if(os.status === 'Finalizada') badgeClass = "bg-green-100 text-green-800";

        let pecasUsadasHtml = os.pecasUsadas.map(p => `<li class="text-sm font-bold text-gray-700 mt-1">✔️ ${p.qtd}x ${p.nome}</li>`).join('');

        container.innerHTML += `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
            <div class="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition" onclick="toggleOsDetails('details-${os.id}')">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-black text-gray-800 text-lg">OS #${os.id}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${badgeClass}">${os.status}</span>
                </div>
                <h3 class="font-bold text-gray-700 text-base">${os.maquina}</h3>
                <p class="text-gray-500 text-sm mt-1 line-clamp-2">${os.descricao}</p>
            </div>

            <div id="details-${os.id}" class="hidden bg-gray-50 p-4 border-t border-gray-200">
                <button onclick="abrirModalHistorico('${os.maquina}')" class="mb-4 text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Consultar Histórico deste Equipamento
                </button>

                <p class="text-xs font-bold text-gray-500 uppercase mb-2">Alterar Status</p>
                <div class="grid grid-cols-3 gap-2 mb-6">
                    <button onclick="mudarStatusOS('${os.id}', 'Em Andamento')" class="bg-blue-100 text-blue-800 rounded-xl font-bold text-xs py-3 hover:bg-blue-200">Andamento</button>
                    <button onclick="mudarStatusOS('${os.id}', 'Aguardando Peça')" class="bg-orange-100 text-orange-800 rounded-xl font-bold text-xs py-3 hover:bg-orange-200">Ag. Peça</button>
                    <button onclick="mudarStatusOS('${os.id}', 'Finalizada')" class="bg-green-100 text-green-800 rounded-xl font-bold text-xs py-3 hover:bg-green-200">Finalizada</button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Diagnóstico do Técnico</label>
                        <textarea id="diag-${os.id}" rows="2" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" placeholder="O que foi feito?">${os.diagnostico}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Tempo (min)</label>
                            <input type="number" id="tempo-${os.id}" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none" value="${os.tempoGasto || ''}" placeholder="Ex: 45">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Evidência</label>
                            <label class="cursor-pointer flex items-center justify-center w-full border border-gray-300 rounded-xl bg-white text-gray-500 py-3 hover:bg-gray-50 transition">
                                📷 Tirar Foto
                                <input type="file" accept="image/*" capture="environment" class="hidden">
                            </label>
                        </div>
                    </div>
                    
                    <div class="bg-white p-4 rounded-xl border border-gray-200">
                        <label class="block text-sm font-bold text-gray-800 mb-2 border-b pb-1">Peças Utilizadas nesta OS</label>
                        <ul>${pecasUsadasHtml || '<li class="text-xs text-gray-400">Nenhuma peça utilizada ainda.</li>'}</ul>
                        
                        <div class="mt-4 flex flex-col sm:flex-row gap-2">
                            <select id="peca-${os.id}" class="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none">
                                ${opcoesPecas}
                            </select>
                            <input type="number" id="qtd-${os.id}" class="w-20 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none" placeholder="Qtd" min="1">
                            <button onclick="consumirPeca('${os.id}')" class="bg-red-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-700">Adicionar</button>
                        </div>
                    </div>

                    <button onclick="salvarDiagnostico('${os.id}')" class="w-full bg-honda-dark text-white font-bold py-4 rounded-xl mt-4 hover:bg-black transition">Salvar Relatório e Tempo</button>
                </div>
            </div>
        </div>
        `;
    });

    if(osDoTecnico.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 p-6">Nenhuma OS atribuída no momento.</p>';
    }
}

// 3. FUNÇÕES DE NOTIFICAÇÃO (NOVO - BUG RESOLVIDO)
function atualizarSininho(osDoTecnico) {
    let osAtivas = osDoTecnico.filter(os => os.status !== 'Finalizada');
    let badge = document.getElementById('badge-notificacao');

    if(osAtivas.length > 0) {
        badge.innerText = osAtivas.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function mostrarToastNotificacao() {
    const toast = document.getElementById('toast-notificacao');
    const badge = document.getElementById('badge-notificacao');
    const texto = document.getElementById('texto-toast');

    if(badge.innerText !== "0" && !badge.classList.contains('hidden')) {
        texto.innerText = `Você possui ${badge.innerText} Ordem(ns) de Serviço na sua fila. Por favor, verifique a sua lista de tarefas.`;
        toast.classList.remove('translate-x-full', 'opacity-0');
        
        // Fecha automaticamente após 5 segundos
        setTimeout(() => { fecharToast(); }, 5000);
    } else {
        texto.innerText = `Você não possui novas notificações. O seu painel está limpo!`;
        toast.classList.remove('translate-x-full', 'opacity-0');
        setTimeout(() => { fecharToast(); }, 4000);
    }
}

function fecharToast() {
    const toast = document.getElementById('toast-notificacao');
    toast.classList.add('translate-x-full', 'opacity-0');
}

// 4. FUNÇÕES DE CRIAÇÃO E HISTÓRICO
function abrirModalNovaOS() {
    const select = document.getElementById('nova-os-maquina');
    const equipamentos = JSON.parse(localStorage.getItem('honda_equipamentos')) || [];
    
    select.innerHTML = '<option value="">Selecione o Equipamento...</option>';
    equipamentos.forEach(eq => {
        select.innerHTML += `<option value="${eq.nome}">${eq.nome} (${eq.id})</option>`;
    });

    document.getElementById('modal-nova-os').classList.remove('hidden');
}

function fecharModalNovaOS() {
    document.getElementById('modal-nova-os').classList.add('hidden');
}

function criarNovaOSForm(event) {
    event.preventDefault();
    const maquina = document.getElementById('nova-os-maquina').value;
    const descricao = document.getElementById('nova-os-descricao').value;

    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const novoId = Math.floor(1000 + Math.random() * 9000).toString();

    osLista.unshift({
        id: novoId, maquina: maquina, descricao: descricao, status: "Pendente",
        prioridade: "Emergência", diagnostico: "", tecnicoId: "T1",
        tempoGasto: 0, pecasUsadas: [], horasValidadas: false
    });

    localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    fecharModalNovaOS();
    document.getElementById('nova-os-descricao').value = '';
    renderizarOS();
    alert("OS Corretiva Emergencial gerada com sucesso!");
}

function abrirModalHistorico(maquinaNome) {
    document.getElementById('historico-nome-maquina').innerText = maquinaNome;
    const conteudo = document.getElementById('conteudo-historico');
    conteudo.innerHTML = '';

    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let historico = osLista.filter(os => os.maquina === maquinaNome && os.status === 'Finalizada');

    if(historico.length === 0) {
        conteudo.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma manutenção prévia registrada.</p>';
    } else {
        historico.forEach(os => {
            conteudo.innerHTML += `
                <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-gray-800 text-sm">OS #${os.id}</span>
                        <span class="text-xs text-gray-500">Tempo: ${os.tempoGasto} min</span>
                    </div>
                    <p class="text-sm text-gray-600"><strong>Diagnóstico:</strong> ${os.diagnostico}</p>
                </div>
            `;
        });
    }
    document.getElementById('modal-historico').classList.remove('hidden');
}

function fecharModalHistorico() {
    document.getElementById('modal-historico').classList.add('hidden');
}

// 5. FUNÇÕES DE ATUALIZAÇÃO E CONSUMO
function toggleOsDetails(detailsId) { document.getElementById(detailsId).classList.toggle('hidden'); }

function mudarStatusOS(idOS, novoStatus) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.status = novoStatus;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        renderizarOS();
        document.getElementById(`details-${idOS}`).classList.remove('hidden'); 
    }
}

function salvarDiagnostico(idOS) {
    const diag = document.getElementById(`diag-${idOS}`).value;
    const tempo = parseInt(document.getElementById(`tempo-${idOS}`).value) || 0;
    
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.diagnostico = diag; os.tempoGasto = tempo;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert("Relatório e tempo atualizados com sucesso!");
        renderizarOS();
    }
}

function consumirPeca(idOS) {
    const pecaId = parseInt(document.getElementById(`peca-${idOS}`).value);
    const qtd = parseInt(document.getElementById(`qtd-${idOS}`).value);
    
    if(!pecaId || isNaN(qtd) || qtd <= 0) return alert("Selecione uma peça e informe uma quantidade.");

    let estoque = JSON.parse(localStorage.getItem('honda_estoque'));
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    
    let pecaIndex = estoque.findIndex(p => p.id === pecaId);
    let osIndex = osLista.findIndex(o => o.id === idOS);

    if(estoque[pecaIndex].quantidade < qtd) {
        return alert(`Estoque insuficiente! Temos apenas ${estoque[pecaIndex].quantidade} unidades.`);
    }

    estoque[pecaIndex].quantidade -= qtd;
    osLista[osIndex].pecasUsadas.push({ pecaId: pecaId, nome: estoque[pecaIndex].nome, qtd: qtd });

    localStorage.setItem('honda_estoque', JSON.stringify(estoque));
    localStorage.setItem('honda_os_lista', JSON.stringify(osLista));

    alert(`Baixa de ${qtd}x ${estoque[pecaIndex].nome} realizada.`);
    renderizarOS();
    document.getElementById(`details-${idOS}`).classList.remove('hidden');
}

window.onload = () => {
    inicializarDados();
    renderizarOS();
    
    // Mostra o Toast de notificação 1 segundo após a tela carregar
    setTimeout(mostrarToastNotificacao, 1000);
};