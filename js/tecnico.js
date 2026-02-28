// js/tecnico.js

// 1. INICIALIZAÇÃO: Garante que existem dados no localStorage
function inicializarDados() {
    let osLista = localStorage.getItem('honda_os_lista');
    if (!osLista) {
        // Cria uma OS de exemplo se não existir nenhuma
        const osInicial = [{ 
            id: "1042", 
            maquina: "Prensa Hidráulica 04 (Linha B)", 
            descricao: "Queda de pressão no cilindro principal durante ciclo de estampagem.", 
            status: "Pendente", 
            diagnostico: "", 
            pecasUsadas: [] 
        }];
        localStorage.setItem('honda_os_lista', JSON.stringify(osInicial));
    }
}

// 2. RENDERIZAÇÃO: Pinta as OS na tela lendo o localStorage
function renderizarOS() {
    const osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const estoque = JSON.parse(localStorage.getItem('honda_estoque')) || []; // Lê o estoque do almoxarifado
    const container = document.getElementById('lista-os-container');
    container.innerHTML = '';

    // Prepara a lista de peças disponíveis para o select do Técnico
    let opcoesPecas = '<option value="">Selecione a peça utilizada...</option>';
    estoque.forEach(peca => {
        if(peca.quantidade > 0) {
            opcoesPecas += `<option value="${peca.id}">${peca.nome} (Estoque: ${peca.quantidade})</option>`;
        }
    });

    // Constrói cada cartão de OS
    osLista.forEach(os => {
        // Define as cores consoante o status
        let badgeClass = "bg-yellow-100 text-yellow-800";
        if(os.status === 'Em Andamento') badgeClass = "bg-blue-100 text-blue-800";
        if(os.status === 'Aguardando Peça') badgeClass = "bg-orange-100 text-orange-800";
        if(os.status === 'Finalizada') badgeClass = "bg-green-100 text-green-800";

        // Lista de peças já usadas nesta OS
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

                    <button onclick="salvarDiagnostico('${os.id}')" class="w-full bg-honda-dark text-white font-bold py-4 rounded-xl mt-4 hover:bg-black transition">Salvar Diagnóstico</button>
                </div>
            </div>
        </div>
        `;
    });
}

// 3. AÇÕES DO TÉCNICO
function toggleOsDetails(detailsId) {
    document.getElementById(detailsId).classList.toggle('hidden');
}

function mudarStatusOS(idOS, novoStatus) {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.status = novoStatus;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        renderizarOS();
        document.getElementById(`details-${idOS}`).classList.remove('hidden'); // Mantém o card aberto
    }
}

function salvarDiagnostico(idOS) {
    const diag = document.getElementById(`diag-${idOS}`).value;
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    let os = osLista.find(o => o.id === idOS);
    if(os) {
        os.diagnostico = diag;
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
        alert("Diagnóstico salvo com sucesso!");
        renderizarOS();
    }
}

// A MÁGICA: Consumir peça e atualizar o Almoxarifado
function consumirPeca(idOS) {
    const pecaId = parseInt(document.getElementById(`peca-${idOS}`).value);
    const qtd = parseInt(document.getElementById(`qtd-${idOS}`).value);
    
    if(!pecaId || isNaN(qtd) || qtd <= 0) return alert("Selecione uma peça e informe uma quantidade válida.");

    let estoque = JSON.parse(localStorage.getItem('honda_estoque'));
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista'));
    
    let pecaIndex = estoque.findIndex(p => p.id === pecaId);
    let osIndex = osLista.findIndex(o => o.id === idOS);

    if(estoque[pecaIndex].quantidade < qtd) {
        return alert(`ATENÇÃO: Estoque insuficiente no Almoxarifado! Temos apenas ${estoque[pecaIndex].quantidade} unidades.`);
    }

    // 1. Subtrai do estoque do Almoxarifado
    estoque[pecaIndex].quantidade -= qtd;

    // 2. Registra na tela do Técnico
    osLista[osIndex].pecasUsadas.push({ pecaId: pecaId, nome: estoque[pecaIndex].nome, qtd: qtd });

    // 3. Registra no relatório do Almoxarifado (honda_os_historico)
    let historico = JSON.parse(localStorage.getItem('honda_os_historico')) || [];
    let osHistorico = historico.find(h => h.idOS === idOS);
    if(!osHistorico) {
        osHistorico = { idOS: idOS, maquina: osLista[osIndex].maquina, pecas: [] };
        historico.push(osHistorico);
    }
    osHistorico.pecas.push({ pecaId: pecaId, nomePeca: estoque[pecaIndex].nome, qtd: qtd });

    // Salva tudo no banco de dados do navegador!
    localStorage.setItem('honda_estoque', JSON.stringify(estoque));
    localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    localStorage.setItem('honda_os_historico', JSON.stringify(historico));

    alert(`Peça aplicada! Foi dado baixa de ${qtd}x ${estoque[pecaIndex].nome} no estoque.`);
    renderizarOS();
    document.getElementById(`details-${idOS}`).classList.remove('hidden');
}

// Criar nova OS
function criarNovaOS() {
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    const novoId = Math.floor(1000 + Math.random() * 9000).toString(); // Gera um ID de 4 dígitos
    
    osLista.unshift({
        id: novoId,
        maquina: "Máquina Indefinida (Emergência)",
        descricao: "OS aberta via tablet do técnico no chão de fábrica.",
        status: "Pendente",
        diagnostico: "",
        pecasUsadas: []
    });

    localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    renderizarOS();
}

function fazerLogout() {
    if(confirm('Encerrar a sessão do Técnico?')) {
        window.location.href = 'index.html';
    }
}

// Inicia o sistema ao carregar a página
window.onload = () => {
    inicializarDados();
    renderizarOS();
};