// js/almoxarifado.js

// 1. DADOS INICIAIS (Caso o localStorage esteja vazio)
const estoqueInicial = [
    { id: 1, nome: "Filtro de Óleo HD-20", quantidade: 15, estoqueMinimo: 10, maquina: "Prensa 04", status: "Disponível" },
    { id: 2, nome: "Correia de Transmissão", quantidade: 2, estoqueMinimo: 5, maquina: "Linha de Montagem B", status: "Disponível" },
    { id: 3, nome: "Vela de Ignição", quantidade: 0, estoqueMinimo: 20, maquina: "Teste de Motores", status: "Esgotado" }
];

const osInicial = [
    { idOS: "1042", maquina: "Prensa 04", pecas: [] }
];

// 2. FUNÇÕES DE BANCO DE DADOS (localStorage)
function obterEstoque() {
    // Tenta ler o estoque do navegador; se não existir, usa o inicial
    let dados = localStorage.getItem('honda_estoque');
    if (!dados) {
        localStorage.setItem('honda_estoque', JSON.stringify(estoqueInicial));
        return estoqueInicial;
    }
    return JSON.parse(dados);
}

function salvarEstoque(novoEstoque) {
    localStorage.setItem('honda_estoque', JSON.stringify(novoEstoque));
    renderizarInventario(); // Atualiza a tela sempre que salvamos
}

function obterHistoricoOS() {
    let dados = localStorage.getItem('honda_os_historico');
    if (!dados) {
        localStorage.setItem('honda_os_historico', JSON.stringify(osInicial));
        return osInicial;
    }
    return JSON.parse(dados);
}

function salvarHistoricoOS(novoHistorico) {
    localStorage.setItem('honda_os_historico', JSON.stringify(novoHistorico));
    renderizarRelatorioOS();
}

// 3. ATUALIZAR A INTERFACE (Renderização)
function renderizarInventario() {
    const estoque = obterEstoque();
    const tbody = document.getElementById('tabela-inventario');
    const selectPeca = document.getElementById('peca-selecionada');
    
    tbody.innerHTML = '';
    selectPeca.innerHTML = '<option value="">Selecione uma peça...</option>';

    estoque.forEach(item => {
        // Lógica visual para estoque baixo ou zerado
        let corFundo = '';
        let corTexto = 'text-gray-800';
        let alerta = '';

        if (item.quantidade === 0) {
            corFundo = 'bg-red-100'; // Alerta vermelho (Zerad)
            corTexto = 'text-red-800 font-bold';
            item.status = 'Esgotado';
            alerta = '⚠️ FALTANTE';
        } else if (item.quantidade < item.estoqueMinimo) {
            corFundo = 'bg-yellow-50'; // Alerta amarelo (Abaixo do mínimo)
            corTexto = 'text-yellow-800';
            item.status = 'Baixo';
            alerta = '⚠️ PEDIR REPOSIÇÃO';
        } else {
            item.status = 'Disponível';
        }

        // Preenche a tabela
        tbody.innerHTML += `
            <tr class="border-b ${corFundo} transition duration-200 hover:bg-gray-50">
                <td class="p-3 text-sm ${corTexto}">${item.nome} ${alerta}</td>
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

        // Preenche o formulário de OS
        selectPeca.innerHTML += `<option value="${item.id}">${item.nome} (Qtd: ${item.quantidade})</option>`;
    });
}

function renderizarRelatorioOS() {
    const historico = obterHistoricoOS();
    const lista = document.getElementById('lista-relatorio-os');
    lista.innerHTML = '';

    historico.forEach(os => {
        let pecasHtml = os.pecas.map(p => `<li>- ${p.qtd}x ${p.nomePeca}</li>`).join('');
        lista.innerHTML += `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                <h4 class="font-bold text-honda-dark">OS #${os.idOS} - ${os.maquina}</h4>
                <ul class="text-sm text-gray-600 mt-2">
                    ${pecasHtml || 'Nenhuma peça utilizada ainda.'}
                </ul>
            </div>
        `;
    });
}

// 4. AÇÕES DOS UTILIZADORES
function registrarOperacao(event) {
    event.preventDefault(); // Impede a página de recarregar
    const tipo = document.getElementById('tipo-operacao').value;
    const nomePeca = document.getElementById('nome-nova-peca').value;
    const qtd = parseInt(document.getElementById('qtd-operacao').value);
    const maquina = document.getElementById('maquina-alvo').value;

    let estoque = obterEstoque();

    if (tipo === 'entrada') {
        // Procura se a peça já existe para somar
        let pecaExistente = estoque.find(p => p.nome.toLowerCase() === nomePeca.toLowerCase());
        if (pecaExistente) {
            pecaExistente.quantidade += qtd;
            alert(`Foram adicionadas ${qtd} unidades à peça ${nomePeca}.`);
        } else {
            // Se não existe, cria nova
            estoque.push({
                id: Date.now(), // ID único gerado pela data
                nome: nomePeca,
                quantidade: qtd,
                estoqueMinimo: 5, // Padrão
                maquina: maquina || "Geral",
                status: "Disponível"
            });
            alert(`Nova peça cadastrada com sucesso!`);
        }
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
    let historico = obterHistoricoOS();

    // Encontra a peça no estoque
    let pecaIndex = estoque.findIndex(p => p.id === pecaId);
    
    if (pecaIndex === -1) return alert("Selecione uma peça válida.");
    if (estoque[pecaIndex].quantidade < qtdBaixa) {
        return alert(`ERRO: Estoque insuficiente! Existem apenas ${estoque[pecaIndex].quantidade} unidades.`);
    }

    // Deduz do estoque
    estoque[pecaIndex].quantidade -= qtdBaixa;

    // Registra no histórico da OS
    let osExistente = historico.find(os => os.idOS === numOS);
    if (!osExistente) {
        // Se a OS não existe no histórico, cria
        osExistente = { idOS: numOS, maquina: estoque[pecaIndex].maquina, pecas: [] };
        historico.push(osExistente);
    }
    osExistente.pecas.push({ pecaId: pecaId, nomePeca: estoque[pecaIndex].nome, qtd: qtdBaixa });

    salvarEstoque(estoque);
    salvarHistoricoOS(historico);
    document.getElementById('form-baixa-os').reset();
    alert(`Baixa de ${qtdBaixa}x ${estoque[pecaIndex].nome} realizada para a OS #${numOS}.`);
}

function solicitarCompra(id) {
    let estoque = obterEstoque();
    let peca = estoque.find(p => p.id === id);
    if (peca) {
        peca.status = 'Comprando...';
        alert(`Pedido de compra enviado para o setor de Suprimentos: ${peca.nome}`);
        salvarEstoque(estoque);
    }
}

// Inicia a tela ao carregar a página
window.onload = () => {
    renderizarInventario();
    renderizarRelatorioOS();
};