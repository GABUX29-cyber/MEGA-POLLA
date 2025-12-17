document.addEventListener('DOMContentLoaded', async () => {

    // ----------------------------------------------------------------
    // PARTE 1: Configuración y Datos
    // ----------------------------------------------------------------

    let resultadosAdmin = [];
    let participantesData = [];
    let finanzasData = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
    let resultadosDelDia = [];
    const JUGADA_SIZE = 7; 

    function establecerFechaReal() {
        const headerP = document.querySelector('header p');
        if (headerP) {
            const ahora = new Date();
            const opciones = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
            headerP.style.textTransform = 'capitalize';
            headerP.innerHTML = `<i class="fas fa-calendar-alt"></i> ${ahora.toLocaleDateString('es-ES', opciones)}`;
        }
    }

    async function cargarDatosDesdeNube() {
        try {
            const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            const { data: r } = await _supabase.from('resultados').select('*').order('id', { ascending: true });
            const { data: f } = await _supabase.from('finanzas').select('*').single();

            if (p) participantesData = p;
            if (r) {
                resultadosAdmin = r;
                resultadosDelDia = r.map(res => res.numero);
            }
            if (f) finanzasData = f;

            inicializarSistema();
        } catch (error) {
            console.error("Error cargando nube:", error);
        }
    }

    function inicializarSistema() {
        establecerFechaReal(); 
        actualizarFinanzasYEstadisticas(); 
        renderResultadosDia();
        renderRanking();
        configurarFiltro();
    }

    // ----------------------------------------------------------------
    // PARTE 2: Lógica de Interfaz
    // ----------------------------------------------------------------

    function actualizarFinanzasYEstadisticas() {
        document.getElementById('ventas').textContent = finanzasData.ventas;
        document.getElementById('recaudado').textContent = `${finanzasData.recaudado.toFixed(2)} BS`;
        document.getElementById('acumulado1').textContent = `${finanzasData.acumulado1.toFixed(2)} BS`;
        const repartirEl = document.getElementById('repartir75');
        if (repartirEl) {
            repartirEl.textContent = `${(finanzasData.recaudado * 0.75).toFixed(2)} BS`;
        }
    }

    // --- RENDERIZADO DE RESULTADOS (FORMATO CUADRO/TABLA SIN CÍRCULOS) ---
    function renderResultadosDia() {
        const container = document.getElementById('numeros-ganadores-display');
        if (!container) return;

        container.innerHTML = ''; 

        // Si no hay resultados, mostramos espacios vacíos elegantes
        if (resultadosAdmin.length === 0) {
            for(let i=1; i<=3; i++) {
                container.innerHTML += `
                    <div class="resultado-item-cuadro">
                        <span class="sorteo-titulo">Sorteo ${i}</span>
                        <div class="numero-cuadro">--</div>
                    </div>`;
            }
            return;
        }

        // Renderizamos cada resultado como un cuadro rectangular
        resultadosAdmin.forEach(res => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'resultado-item-cuadro';
            itemDiv.innerHTML = `
                <span class="sorteo-titulo">${res.sorteo}</span>
                <div class="numero-cuadro">${res.numero.toString().padStart(2, '0')}</div>
            `;
            container.appendChild(itemDiv);
        });
    }

    function renderRanking(filtro = "") {
        const tbody = document.getElementById('ranking-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const term = filtro.toLowerCase();
        let totalGanadores = 0;

        participantesData.forEach(p => {
            let aciertos = 0;
            p.jugadas.forEach(num => {
                if (resultadosDelDia.includes(String(num).padStart(2, '0'))) aciertos++;
            });

            if (term && !(p.nombre.toLowerCase().includes(term) || p.refe.toString().includes(term))) return;
            if (aciertos >= 7) totalGanadores++;

            const tr = document.createElement('tr');
            let jugadasHTML = '';
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const num = p.jugadas[i] ? p.jugadas[i].toString().padStart(2, '0') : '--';
                const claseGanador = resultadosDelDia.includes(num) ? 'hit' : '';
                jugadasHTML += `<td><span class="ranking-box ${claseGanador}">${num}</span></td>`;
            }

            tr.innerHTML = `
                <td>${p.nro}</td>
                <td class="nombre-participante">${p.nombre}</td>
                <td>${p.refe}</td>
                ${jugadasHTML}
                <td>${aciertos >= 7 ? '<span class="ganador-final">GANADOR 🏆</span>' : `<span class="ranking-box aciertos-box">${aciertos}</span>`}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('total-ganadores').textContent = totalGanadores;
    }

    function configurarFiltro() {
        const input = document.getElementById('filtroParticipantes');
        if (input) input.addEventListener('keyup', (e) => renderRanking(e.target.value.trim()));
    }

    const btnPdf = document.getElementById('btn-descargar-pdf');
    if (btnPdf) btnPdf.addEventListener('click', () => window.print());

    cargarDatosDesdeNube();
});