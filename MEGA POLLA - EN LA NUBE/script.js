const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    
    async function cargarTodo() {
        const { data: resultados } = await _supabase.from('resultados').select('*');
        const { data: participantes } = await _supabase.from('participantes').select('*');
        const { data: finanzas } = await _supabase.from('finanzas').select('*').single();

        const numerosGanadores = resultados.map(r => r.numero);

        // Render Resultados
        const resDisplay = document.getElementById('numeros-ganadores-display');
        if (resultados.length > 0) {
            resDisplay.innerHTML = resultados.map(r => `
                <div style="background:#fdd835; color:#333; padding:8px 12px; border-radius:8px; font-weight:bold; border:1px solid #333">
                    ${r.sorteo}: ${r.numero}
                </div>
            `).join('');
            document.getElementById('fecha-header').innerText = `ACTUALIZADO: ${new Date().toLocaleDateString()}`;
        }

        // Render Estadísticas
        if (finanzas) {
            document.getElementById('ventas-total').innerText = finanzas.ventas;
            document.getElementById('recaudado-total').innerText = `${finanzas.recaudado} BS`;
            document.getElementById('acumulado-total').innerText = `${finanzas.acumulado1} BS`;
            document.getElementById('repartir75').innerText = `${(finanzas.recaudado * 0.75).toFixed(2)} BS`;
        }

        // Función de Ranking
        const renderRanking = (textoFiltro = "") => {
            const body = document.getElementById('ranking-body');
            body.innerHTML = '';

            const filtrados = participantes.filter(p => 
                p.nombre.toLowerCase().includes(textoFiltro.toLowerCase()) || 
                p.refe.toLowerCase().includes(textoFiltro.toLowerCase())
            );

            filtrados.sort((a, b) => {
                const aciertosA = a.jugadas.filter(n => numerosGanadores.includes(n)).length;
                const aciertosB = b.jugadas.filter(n => numerosGanadores.includes(n)).length;
                return aciertosB - aciertosA;
            });

            filtrados.forEach(p => {
                const aciertos = p.jugadas.filter(n => numerosGanadores.includes(n)).length;
                const tr = document.createElement('tr');
                tr.className = `aciertos-${aciertos}`;
                tr.innerHTML = `
                    <td><span class="ranking-box">${p.nro}</span></td>
                    <td><span class="ranking-box">${p.nombre}</span></td>
                    <td><span class="ranking-box">${p.refe}</span></td>
                    ${p.jugadas.map(n => `
                        <td class="cell-jugada ${numerosGanadores.includes(n) ? 'jugada-acierto' : ''}">
                            <span class="ranking-box">${n}</span>
                        </td>`).join('')}
                    <td class="cell-aciertos">
                        ${aciertos >= 7 ? '<span class="ganador-final">GANADOR 🏆</span>' : `<span class="aciertos-box">${aciertos}</span>`}
                    </td>
                `;
                body.appendChild(tr);
            });
        };

        renderRanking();
        document.getElementById('filtroParticipantes').addEventListener('keyup', (e) => renderRanking(e.target.value));
    }

    cargarTodo();
});