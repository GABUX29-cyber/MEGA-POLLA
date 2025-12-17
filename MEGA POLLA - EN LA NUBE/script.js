document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Carga desde Supabase
    const { data: resData } = await _supabase.from('resultados').select('*');
    const { data: partData } = await _supabase.from('participantes').select('*');
    const { data: finData } = await _supabase.from('finanzas').select('*').single();

    const resultadosAdmin = resData || [];
    const participantesData = partData || [];
    const finanzasData = finData || { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
    
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
        const filtrados = participantesData.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()) || p.refe.toLowerCase().includes(filtro.toLowerCase()));
        
        filtrados.sort((a, b) => calcularAciertos(b.jugadas, resultadosDelDia) - calcularAciertos(a.jugadas, resultadosDelDia));

        filtrados.forEach(p => {
            const aciertos = calcularAciertos(p.jugadas, resultadosDelDia);
            const tr = document.createElement('tr');
            tr.className = `aciertos-${aciertos}`;
            let jugadasHtml = p.jugadas.map(n => `<td class="cell-jugada ${resultadosDelDia.includes(n) ? 'jugada-acierto' : ''}"><span class="ranking-box">${n}</span></td>`).join('');
            tr.innerHTML = `<td><span class="ranking-box">${p.nro}</span></td><td><span class="ranking-box">${p.nombre}</span></td><td><span class="ranking-box">${p.refe}</span></td>${jugadasHtml}<td><span class="ranking-box aciertos-box">${aciertos}</span></td>`;
            body.appendChild(tr);
        });
    }

    actualizarFinanzasYEstadisticas();
    renderResultadosDia();
    renderRanking();
    document.getElementById('filtroParticipantes').addEventListener('keyup', (e) => renderRanking(e.target.value.trim()));
    document.getElementById('btn-descargar-pdf').addEventListener('click', () => window.print());
});