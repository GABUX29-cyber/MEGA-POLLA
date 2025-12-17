document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    async function cargarPublico() {
        const { data } = await _supabase.from('polla_datos').select('*');
        let participantes = [], resultados = [], finanzas = {};

        if (data) {
            data.forEach(item => {
                if (item.tipo === 'participantes') participantes = item.contenido || [];
                if (item.tipo === 'resultados') resultados = item.contenido || [];
                if (item.tipo === 'finanzas') finanzas = item.contenido || {};
            });
        }

        // 1. Estadísticas
        if (document.getElementById('stat-ventas')) document.getElementById('stat-ventas').innerText = participantes.length;
        if (document.getElementById('stat-recaudado')) document.getElementById('stat-recaudado').innerText = `$${finanzas.recaudado || 0}`;
        if (document.getElementById('stat-acumulado')) document.getElementById('stat-acumulado').innerText = `$${finanzas.acumulado || 0}`;

        // 2. Ranking de Aciertos
        const ganadores = resultados.map(r => r.numero);
        const cuerpoRanking = document.getElementById('cuerpo-ranking');
        if (!cuerpoRanking) return;

        cuerpoRanking.innerHTML = participantes.map((p, i) => {
            const aciertos = p.jugada.filter(n => ganadores.includes(n)).length;
            const jugadaHTML = p.jugada.map(n => 
                `<span class="n-jugado ${ganadores.includes(n) ? 'acierto' : ''}">${n}</span>`
            ).join('');

            return `
                <tr>
                    <td>${i + 1}</td>
                    <td>${p.nombre}</td>
                    <td>${p.refe}</td>
                    <td>${jugadaHTML}</td>
                    <td class="total-aciertos">${aciertos}</td>
                </tr>
            `;
        }).sort((a, b) => b.aciertos - a.aciertos).join('');
    }

    cargarPublico();
});