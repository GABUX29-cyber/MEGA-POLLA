document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Carga inicial de datos desde la nube
    const { data: resDB } = await _supabase.from('resultados').select('*');
    const { data: partDB } = await _supabase.from('participantes').select('*');
    const { data: finDB } = await _supabase.from('finanzas').select('*').single();

    const resultadosAdmin = resDB || [];
    const participantesData = partDB || [];
    const finanzasData = finDB || { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
    
    const resultadosDelDia = resultadosAdmin.map(r => r.numero);
    const JUGADA_SIZE = 7;

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
            display.innerHTML = resultadosAdmin.map(r => `<div class="resultado-item"><strong>${r.sorteo}:</strong> ${r.numero}</div>`).join('');
        }
    }

    function renderRanking(filtro = '') {
        const body = document.getElementById('ranking-body');
        body.innerHTML = '';
        const listado = participantesData.map(p => ({
            ...p,
            aciertos: calcularAciertos(p.jugadas, resultadosDelDia)
        })).sort((a, b) => b.aciertos - a.aciertos);

        const filtrados = listado.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()) || p.refe.toLowerCase().includes(filtro.toLowerCase()));

        filtrados.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `aciertos-${p.aciertos}`;
            let jugadasHtml = '';
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const num = p.jugadas[i] || '-';
                const esAcierto = resultadosDelDia.includes(num);
                jugadasHtml += `<td class="cell-jugada ${esAcierto ? 'jugada-acierto' : ''}"><span class="ranking-box">${num}</span></td>`;
            }
            tr.innerHTML = `<td>${p.nro}</td><td>${p.nombre}</td><td>${p.refe}</td>${jugadasHtml}<td class="cell-aciertos">${p.aciertos >= 7 ? 'GANADOR 🏆' : p.aciertos}</td>`;
            body.appendChild(tr);
        });
    }

    actualizarFinanzasYEstadisticas();
    renderResultadosDia();
    renderRanking();
    document.getElementById('filtroParticipantes').addEventListener('keyup', (e) => renderRanking(e.target.value.trim()));
    
    // TU LOGICA PDF ORIGINAL
    document.getElementById('btn-descargar-pdf').addEventListener('click', () => window.print());
});