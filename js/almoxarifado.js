// js/almoxarifado.js

// 1. DADOS INICIAIS
const estoqueInicial = [
    { id: 1, nome: "Filtro de Óleo HD-20", quantidade: 15, estoqueMinimo: 10, maquina: "Prensa 04", status: "Disponível" },
    { id: 2, nome: "Correia de Transmissão", quantidade: 2, estoqueMinimo: 5, maquina: "Linha de Montagem B", status: "Disponível" },
    { id: 3, nome: "Vela de Ignição", quantidade: 0, estoqueMinimo: 20, maquina: "Teste de Motores", status: "Esgotado" } // Item zerado para teste
];

function obterEstoque() {
    let dados = localStorage.getItem('honda_estoque');
    if (!dados) {
        localStorage.setItem('honda_estoque', JSON.stringify(estoqueInicial));
        return estoqueInicial;
    }
    return JSON.parse(dados);
}

function salvarEstoque(novoEstoque) {
    localStorage.setItem('honda_estoque', JSON.stringify(novoEstoque));
    renderizarInventario(); 
}

// 2. RENDERIZAÇÃO DA INTERFACE E ALERTAS
function renderizarInventario() {
    const estoque = obterEstoque();
    const tbody = document.getElementById('tabela-inventario');
    const selectPeca = document.getElementById('peca-selecionada');
    
    tbody.innerHTML = '';
    selectPeca.innerHTML = '<option value="">Selecione uma peça...</option>';

    estoque.forEach(item => {
        let corFundo = '';
        let corTexto = 'text-gray-800';
        let alerta = '';

        // Lógica de Cores
        if (item.quantidade === 0) {
            corFundo = 'bg-red-100'; 
            corTexto = 'text-red-800 font-bold';
            item.status = 'Esgotado';
            alerta = '🔴 ZERADO';
        } else if (item.quantidade < item.estoqueMinimo) {
            corFundo = 'bg-yellow-50'; 
            corTexto = 'text-yellow-800';
            item.status = 'Baixo';
            alerta = '⚠️ ABAIXO DO MÍNIMO';
        } else {
            item.status = 'Disponível';
        }

        // Tabela
        tbody.innerHTML += `
            <tr class="border-b ${corFundo} transition duration-200 hover:bg-gray-50">
                <td class="p-3 text-sm ${corTexto}">${item.nome} <span class="text-xs ml-2">${alerta}</span></td>
                <td class="p-3 text-sm text-center font-bold ${corTexto}">${item.quantidade}</td>
                <td class="p-3 text-sm text-center">${item.estoqueMinimo}</td>
                <td class="p-3 text-sm">${item.maquina}</td>
                <td class="p-3 text-sm text-center">
                    <button onclick="solicitarCompra(${item.id})" class="bg-honda-dark text-white px-3 py-1 rounded text-xs hover:bg-black transition" ${item.status === 'Comprando...' ? 'disabled' : ''}>
                        ${item.status === 'Comprando...' ? 'Pedido Enviado' : 'Comprar'}
                    </button>
                </td>
            </tr>
        `;

        // Select do Formulário
        selectPeca.innerHTML += `<option value="${item.id}">${item.nome} (Estoque: ${item.quantidade})</option>`;
    });

    // Chama a função para exibir o painel de alerta vermelho
    renderizarAlertasEsgotados(estoque);
}

// NOVO: Painel Visual de Indisponibilidade
function renderizarAlertasEsgotados(estoque) {
    const esgotados = estoque.filter(item => item.quantidade === 0);
    const painel = document.getElementById('painel-alertas');

    if (esgotados.length > 0) {
        let listaNomes = esgotados.map(item => `<li>• ${item.nome} (Ref: ${item.maquina})</li>`).join('');
        painel.innerHTML = `
            <div class="bg-red-100 border-l-8 border-red-600 p-4 mb-6 rounded-r-lg shadow-md animate-pulse">
                <div class="flex items-center mb-2">
                    <span class="text-2xl mr-3">🚨</span>
                    <h3 class="text-red-800 font-black text-lg uppercase tracking-wide">Atenção: Itens Indisponíveis!</h3>
                </div>
                <p class="text-red-700 text-sm font-bold ml-9 mb-1">As seguintes peças chegaram a estoque ZERO e estão bloqueadas para saída:</p>
                <ul class="text-red-700 text-sm pl-9 font-medium">
                    ${listaNomes}
                </ul>
            </div>
        `;
    } else {
        painel.innerHTML = ''; // Esconde se tudo estiver ok
    }
}

// NOVO: Ranking Analítico de Consumo
function renderizarRankingConsumo() {
    // Lê o histórico de OS do localStorage
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let consumoPorMaquina = {};

    // Calcula o consumo iterando sobre todas as peças usadas em todas as OS
    osLista.forEach(os => {
        if (!consumoPorMaquina[os.maquina]) { consumoPorMaquina[os.maquina] = 0; }
        
        if (os.pecasUsadas) {
            os.pecasUsadas.forEach(peca => {
                consumoPorMaquina[os.maquina] += parseInt(peca.qtd);
            });
        }
    });

    // Transforma o Objeto em Array e ordena do maior para o menor consumo
    let ranking = Object.keys(consumoPorMaquina).map(maquina => {
        return { maquina: maquina, totalPecas: consumoPorMaquina[maquina] };
    }).sort((a, b) => b.totalPecas - a.totalPecas);

    const container = document.getElementById('lista-ranking-consumo');
    container.innerHTML = '';

    if (ranking.length === 0 || ranking.every(r => r.totalPecas === 0)) {
        container.innerHTML = '<p class="text-sm text-gray-500 italic p-4">Nenhum consumo de peças registrado no sistema ainda.</p>';
        return;
    }

    ranking.forEach((item, index) => {
        if (item.totalPecas > 0) {
            // Estilos para o 1º lugar ser destacado
            let corCard = index === 0 ? 'bg-red-50 border-red-200 text-red-900 font-bold shadow-sm' : 'bg-white border-gray-100 text-gray-700';
            let icone = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '▪️'));
            
            container.innerHTML += `
                <div class="flex justify-between items-center p-3 border-b mb-2 rounded ${corCard}">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icone}</span>
                        <span class="text-sm line-clamp-1">${item.maquina}</span>
                    </div>
                    <span class="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-black">${item.totalPecas} unid.</span>
                </div>
            `;
        }
    });
}

// 3. AÇÕES DOS OPERADORES
function registrarOperacao(event) {
    event.preventDefault();
    const nomePeca = document.getElementById('nome-nova-peca').value;
    const qtd = parseInt(document.getElementById('qtd-operacao').value);
    const maquina = document.getElementById('maquina-alvo').value;

    let estoque = obterEstoque();
    let pecaExistente = estoque.find(p => p.nome.toLowerCase() === nomePeca.toLowerCase());
    
    if (pecaExistente) {
        pecaExistente.quantidade += qtd;
        alert(`Entrada registrada! Foram adicionadas ${qtd} unidades à peça ${nomePeca}.`);
    } else {
        estoque.push({
            id: Date.now(),
            nome: nomePeca,
            quantidade: qtd,
            estoqueMinimo: 5,
            maquina: maquina || "Geral",
            status: "Disponível"
        });
        alert(`Nova peça cadastrada com sucesso!`);
    }

    salvarEstoque(estoque);
    document.getElementById('form-operacao').reset();
}

function darBaixaOS(event) {
    event.preventDefault();
    const pecaId = parseInt(document.getElementById('peca-selecionada').value);
    const qtdBaixa = parseInt(document.getElementById('qtd-baixa').value);
    const numOS = document.getElementById('numero-os').value;

    let estoque = obterEstoque();
    let pecaIndex = estoque.findIndex(p => p.id === pecaId);
    
    if (pecaIndex === -1) return alert("Selecione uma peça válida.");

    // REQUISITO CUMPRIDO: Bloqueio imediato se estoque estiver zerado!
    if (estoque[pecaIndex].quantidade === 0) {
        return alert(`❌ ITEM INDISPONÍVEL!\nA peça "${estoque[pecaIndex].nome}" está esgotada no momento. A saída foi cancelada.`);
    }

    // Bloqueio se tentar tirar mais do que existe
    if (estoque[pecaIndex].quantidade < qtdBaixa) {
        return alert(`⚠️ ESTOQUE INSUFICIENTE!\nTentou retirar ${qtdBaixa}, mas existem apenas ${estoque[pecaIndex].quantidade} unidades de "${estoque[pecaIndex].nome}".`);
    }

    // Deduz do estoque
    estoque[pecaIndex].quantidade -= qtdBaixa;

    // Registra na OS (Para alimentar o Ranking!)
    let osLista = JSON.parse(localStorage.getItem('honda_os_lista')) || [];
    let os = osLista.find(o => o.id === numOS);
    
    if (os) {
        os.pecasUsadas.push({ pecaId: pecaId, nome: estoque[pecaIndex].nome, qtd: qtdBaixa });
        localStorage.setItem('honda_os_lista', JSON.stringify(osLista));
    } else {
        alert(`Aviso: OS #${numOS} não encontrada no sistema. A baixa foi feita no estoque, mas não atrelada a uma OS válida.`);
    }

    salvarEstoque(estoque);
    document.getElementById('form-baixa-os').reset();
    alert(`Baixa de ${qtdBaixa}x ${estoque[pecaIndex].nome} concluída com sucesso!`);
    
    // Atualiza o ranking dinamicamente
    renderizarRankingConsumo();
}

function solicitarCompra(id) {
    let estoque = obterEstoque();
    let peca = estoque.find(p => p.id === id);
    if (peca) {
        peca.status = 'Comprando...';
        alert(`Pedido de compra urgente enviado para a Gestão Executiva: ${peca.nome}`);
        salvarEstoque(estoque);
    }
}

// Inicia a tela ao carregar a página
window.onload = () => {
    renderizarInventario();
    renderizarRankingConsumo(); // Renderiza o novo painel analítico
};