// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIABLES DE ESTADO ---
    let resultadosAdmin = [];
    let resultadosDelDia = [];
    let participantesData = [];
    let finanzasData = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
    let rankingCalculado = [];
    const JUGADA_SIZE = 7;

    // ----------------------------------------------------------------
    // PARTE 1: Carga de Datos desde la Nube (Supabase)
    // ----------------------------------------------------------------
    
    async function cargarDatosDesdeNube() {
        try {
            // 1. Cargar Resultados
            const { data: res } = await supabaseClient.from('resultados').select('*');
            resultadosAdmin = res || [];
            resultadosDelDia = resultadosAdmin.map(r => r.numero);

            // 2. Cargar Participantes
            const { data: part } = await supabaseClient.from('participantes').select('*');
            participantesData = part || [];

            // 3. Cargar Finanzas
            const { data: fin } = await supabaseClient.from('finanzas').select('*').single();
            if (fin) finanzasData = fin;

            // --- EJECUTAR RENDERIZADO INICIAL ---
            actualizarFinanzasYEstadisticas();
            renderResultadosDia();
            renderRanking();
            
        } catch (error) {
            console.error("Error cargando datos de Supabase:", error);
        }
    }

    // ----------------------------------------------------------------
    // PARTE 2: Funciones Lógicas y de Cálculo
    // ----------------------------------------------------------------

    function calcularAciertos(jugadorJugadas, ganadores) {
        if (!jugadorJugadas) return 0;
        const ganadoresSet = new Set(ganadores);
        return jugadorJugadas.filter(num => ganadoresSet.has(num)).length;
    }

    function actualizarFinanzasYEstadisticas() {
        const { recaudado, acumulado1, ventas } = finanzasData;
        const repartir75 = recaudado * 0.75; 
        const casa20 = recaudado * 0.20;
        const cincoDomingo = recaudado * 0.05; 

        const formatoBs = (monto) => `Bs.${monto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

        document.getElementById('ventas').textContent = ventas.toLocaleString('es-VE');
        document.getElementById('recaudado').textContent = formatoBs(recaudado);
        document.getElementById('repartir75').textContent = formatoBs(repartir75);
        document.getElementById('acumulado1').textContent = formatoBs(acumulado1); 
        document.getElementById('casa20').textContent = formatoBs(casa20); 

        rankingCalculado = participantesData.map(p => ({
            ...p,
            aciertos: calcularAciertos(p.jugadas, resultadosDelDia)
        }));

        const totalGanadores = rankingCalculado.filter(p => p.aciertos >= 7).length;
        const montoTotalPremio = repartir75 + acumulado1;
        
        const totalGanadoresDiv = document.getElementById('total-ganadores');
        if (totalGanadoresDiv) {
            if (totalGanadores > 0) {
                totalGanadoresDiv.textContent = `${formatoBs(montoTotalPremio / totalGanadores)} C/U`;
            } else {
                totalGanadoresDiv.textContent = formatoBs(montoTotalPremio);
            }
        }
    }

    // ----------------------------------------------------------------
    // PARTE 3: Renderizado de Interfaz
    // ----------------------------------------------------------------

    function renderResultadosDia() {
        const displayDiv = document.getElementById('numeros-ganadores-display');
        if (!displayDiv) return;
        displayDiv.innerHTML = ''; 

        const resultadosAgrupados = {};
        resultadosAdmin.forEach(r => {
            const parts = r.sorteo.split(' ');
            const hora = parts.pop().toUpperCase();
            const sorteoName = parts.join(' '); 
            if (!resultadosAgrupados[sorteoName]) resultadosAgrupados[sorteoName] = {};
            resultadosAgrupados[sorteoName][hora] = r.numero;
        });

        const ordenHoras = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM'];
        const tabla = document.createElement('table');
        tabla.classList.add('resultados-grilla');

        let htmlHeader = '<thead><tr><th></th>' + ordenHoras.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
        let htmlBody = '<tbody>';
        ['LOTTO ACTIVO', 'GRANJITA', 'SELVA PLUS'].forEach(sorteo => {
            htmlBody += `<tr><td class="sorteo-name">${sorteo}</td>`;
            ordenHoras.forEach(hora => {
                const num = (resultadosAgrupados[sorteo] && resultadosAgrupados[sorteo][hora]) ? resultadosAgrupados[sorteo][hora] : '--';
                htmlBody += `<td class="numero-resultado">${num}</td>`;
            });
            htmlBody += '</tr>';
        });
        htmlBody += '</tbody>';
        
        tabla.innerHTML = htmlHeader + htmlBody;
        displayDiv.appendChild(tabla);
    }

    function renderRanking(filtro = '') {
        const rankingBody = document.getElementById('ranking-body');
        if (!rankingBody) return;
        rankingBody.innerHTML = '';
        
        const filtroLower = filtro.toLowerCase();
        const filtrados = rankingCalculado
            .filter(p => p.nombre.toLowerCase().includes(filtroLower) || p.refe.toString().includes(filtroLower))
            .sort((a, b) => b.aciertos - a.aciertos);

        filtrados.forEach(p => {
            const row = rankingBody.insertRow();
            row.className = p.aciertos >= 7 ? 'fila-ganadora' : '';
            row.innerHTML = `
                <td>${p.nro}</td>
                <td>${p.nombre}</td>
                <td>${p.refe}</td>
                ${p.jugadas.map(j => `<td class="${resultadosDelDia.includes(j) ? 'jugada-acierto' : ''}">${j}</td>`).join('')}
                <td>${p.aciertos >= 7 ? '🏆 GANADOR' : p.aciertos}</td>
            `;
        });
    }

    // ----------------------------------------------------------------
    // PARTE 4: Inicialización y Eventos
    // ----------------------------------------------------------------
    
    const filtroInput = document.getElementById('filtroParticipantes');
    if (filtroInput) filtroInput.addEventListener('keyup', (e) => renderRanking(e.target.value.trim()));

    const btnPdf = document.getElementById('btn-descargar-pdf');
    if (btnPdf) btnPdf.addEventListener('click', () => window.print());

    await cargarDatosDesdeNube();
});