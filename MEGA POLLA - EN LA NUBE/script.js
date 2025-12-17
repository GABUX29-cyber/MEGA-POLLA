document.addEventListener('DOMContentLoaded', async () => {

    // --- CONFIGURACIÓN SUPABASE ---
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- CARGA DE DATOS (Reemplaza localStorage) ---
    const { data: resDB } = await _supabase.from('resultados').select('*');
    const { data: partDB } = await _supabase.from('participantes').select('*');
    const { data: finDB } = await _supabase.from('finanzas').select('*').single();

    const resultadosAdmin = resDB || [];
    const participantesData = partDB || [];
    const finanzasData = finDB || { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
    
    const resultadosDelDia = resultadosAdmin.map(r => r.numero);
    const JUGADA_SIZE = 7; 
    let rankingCalculado = []; 

    // --- TUS FUNCIONES ORIGINALES (SIN CAMBIOS) ---
    function calcularAciertos(jugadorJugadas, ganadores) {
        let aciertos = 0;
        const ganadoresSet = new Set(ganadores);
        jugadorJugadas.forEach(num => { if (ganadoresSet.has(num)) aciertos++; });
        return aciertos;
    }

    function actualizarFinanzasYEstadisticas() {
        document.getElementById('ventas-total').innerText = finanzasData.ventas;
        document.getElementById('recaudado-total').innerText = `${finanzasData.recaudado.toFixed(2)} BS`;
        document.getElementById('acumulado-total').innerText = `${finanzasData.acumulado1.toFixed(2)} BS`;
        document.getElementById('repartir75').innerText = `${(finanzasData.recaudado * 0.75).toFixed(2)} BS`;
        const totalGanadores = participantesData.filter(p => calcularAciertos(p.jugadas, resultadosDelDia) >= 7).length;
        document.getElementById('total-ganadores').innerText = totalGanadores;
    }

    function renderResultadosDia() {
        const display = document.getElementById('numeros-ganadores-display');
        if (resultadosAdmin.length > 0) {
            display.innerHTML = resultadosAdmin.map(r => `
                <div class="resultado-item"><strong>${r.sorteo}:</strong> ${r.numero}</div>
            `).join('');
        }
    }

    function renderRanking(filtro = '') {
        const body = document.getElementById('ranking-body');
        body.innerHTML = '';
        
        rankingCalculado = participantesData.map(p => ({
            ...p,
            aciertos: calcularAciertos(p.jugadas, resultadosDelDia)
        })).sort((a, b) => b.aciertos - a.aciertos);

        const filtrados = rankingCalculado.filter(p => 
            p.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
            p.refe.toLowerCase().includes(filtro.toLowerCase())
        );

        filtrados.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `aciertos-${p.aciertos}`;
            let jugadasHtml = '';
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const num = p.jugadas[i] || '-';
                const esAcierto = resultadosDelDia.includes(num);
                jugadasHtml += `<td class="cell-jugada ${esAcierto ? 'jugada-acierto' : ''}"><span class="ranking-box">${num}</span></td>`;
            }
            tr.innerHTML = `
                <td><span class="ranking-box">${p.nro}</span></td>
                <td><span class="ranking-box">${p.nombre}</span></td>
                <td><span class="ranking-box">${p.refe}</span></td>
                ${jugadasHtml}
                <td class="cell-aciertos"></td>
            `;
            body.appendChild(tr);
            const aciertosCell = tr.querySelector('.cell-aciertos');
            if (p.aciertos >= 7) { 
                aciertosCell.innerHTML = '<span class="ganador-final">GANADOR 🏆</span>';
            } else {
                aciertosCell.innerHTML = `<span class="ranking-box aciertos-box">${p.aciertos}</span>`;
            }
        });
    }

    function configurarFiltro() {
        const filtroInput = document.getElementById('filtroParticipantes');
        if (filtroInput) {
            filtroInput.addEventListener('keyup', (e) => {
                renderRanking(e.target.value.trim()); 
            });
        }
    }

    // --- INICIALIZACIÓN ---
    actualizarFinanzasYEstadisticas(); 
    renderResultadosDia();
    renderRanking();
    configurarFiltro();
    
    // TU LÓGICA DE PDF ORIGINAL
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', () => { window.print(); });
    }
});