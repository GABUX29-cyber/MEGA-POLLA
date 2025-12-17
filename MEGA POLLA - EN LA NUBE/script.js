document.addEventListener('DOMContentLoaded', async () => {

    // ----------------------------------------------------------------
    // PARTE 1: Carga desde Supabase (Sustituye a LocalStorage)
    // ----------------------------------------------------------------
    
    // Mostramos un mensaje de carga inicial
    const containerResultados = document.getElementById('numeros-ganadores-display');
    if (containerResultados) containerResultados.innerHTML = '<p>Cargando datos desde la nube...</p>';

    // Hacemos la petición a las 3 tablas de Supabase simultáneamente
    const { data: resAdmin } = await _supabase.from('resultados').select('*');
    const { data: partData } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
    const { data: finData } = await _supabase.from('finanzas').select('*').eq('id', 1).single();

    // Asignamos los datos a las variables constantes que ya usabas
    const resultadosAdmin = resAdmin || [];
    const participantesData = partData || [];
    const finanzasData = finData || {
        ventas: 0, 
        recaudado: 0.00,
        acumulado1: 0.00
    };
    
    const resultadosDelDia = resultadosAdmin.map(r => r.numero);
    const JUGADA_SIZE = 7; 
    let rankingCalculado = []; 


    // ----------------------------------------------------------------
    // PARTE 2: Funciones Lógicas y de Cálculo (Originales)
    // ----------------------------------------------------------------

    /**
     * Calcula el número de aciertos de un jugador.
     */
    function calcularAciertos(jugadorJugadas, ganadores) {
        let aciertos = 0;
        const ganadoresSet = new Set(ganadores);
        jugadorJugadas.forEach(num => {
            if (ganadoresSet.has(num)) {
                aciertos++;
            }
        });
        return aciertos;
    }

    /**
     * Actualiza los elementos de la interfaz con los datos financieros.
     */
    function actualizarFinanzasYEstadisticas() {
        const ventasElem = document.getElementById('ventas-totales');
        const recaudadoElem = document.getElementById('total-recaudado');
        const acumuladoElem = document.getElementById('acumulado-total');
        const repartirElem = document.getElementById('repartir75');
        const ganadoresElem = document.getElementById('total-ganadores');

        if (ventasElem) ventasElem.textContent = finanzasData.ventas;
        if (recaudadoElem) recaudadoElem.textContent = `${finanzasData.recaudado.toFixed(2)} BS`;
        if (acumuladoElem) acumuladoElem.textContent = `${finanzasData.acumulado1.toFixed(2)} BS`;
        
        // Cálculo del premio: 75% de lo recaudado + acumulado anterior
        const premio75 = (finanzasData.recaudado * 0.75) + finanzasData.acumulado1;
        if (repartirElem) repartirElem.textContent = `${premio75.toFixed(2)} BS`;

        // Contar cuántos tienen 7 aciertos
        const ganadores7 = participantesData.filter(p => {
            const aciertos = calcularAciertos(p.jugadas, resultadosDelDia);
            return aciertos >= 7;
        }).length;
        if (ganadoresElem) ganadoresElem.textContent = ganadores7;
    }

    /**
     * Renderiza las bolas de los resultados del día.
     */
    function renderResultadosDia() {
        const container = document.getElementById('numeros-ganadores-display');
        if (!container) return;

        if (resultadosDelDia.length === 0) {
            container.innerHTML = '<p>No se han seleccionado números ganadores</p>';
            return;
        }

        container.innerHTML = resultadosDelDia
            .map(num => `<span class="bola">${num}</span>`)
            .join('');
    }

    // ----------------------------------------------------------------
    // PARTE 3: Renderizado de Tabla y Filtros (Originales)
    // ----------------------------------------------------------------

    /**
     * Dibuja la tabla de participantes.
     */
    function renderRanking(filtro = "") {
        const tbody = document.getElementById('ranking-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        const textoFiltro = filtro.toLowerCase();

        // Procesamos los datos para calcular aciertos antes de filtrar
        rankingCalculado = participantesData.map(p => {
            const aciertos = calcularAciertos(p.jugadas, resultadosDelDia);
            return { ...p, aciertos };
        });

        // Filtrar por nombre o REFE
        const datosFiltrados = rankingCalculado.filter(p => 
            p.nombre.toLowerCase().includes(textoFiltro) || 
            p.refe.toLowerCase().includes(textoFiltro)
        );

        datosFiltrados.forEach(p => {
            const tr = document.createElement('tr');
            if (p.aciertos >= 7) tr.classList.add('fila-ganadora');

            // NRO, NOMBRE, REFE
            tr.innerHTML = `<td>${p.nro}</td><td class="nombre-cell">${p.nombre}</td><td>${p.refe}</td>`;

            // JUGADAS (7 columnas)
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const td = document.createElement('td');
                const num = p.jugadas[i] || '-';
                const esAcierto = resultadosDelDia.includes(num);
                td.innerHTML = `<span class="ranking-box ${esAcierto ? 'acierto' : ''}">${num}</span>`;
                tr.appendChild(td);
            }

            // ACIERTOS / ESTATUS
            const aciertosCell = document.createElement('td');
            if (p.aciertos >= 7) { 
                aciertosCell.innerHTML = '<span class="ganador-final">GANADOR 🏆</span>';
            } else {
                aciertosCell.innerHTML = `<span class="ranking-box aciertos-box">${p.aciertos}</span>`;
            }
            tr.appendChild(aciertosCell);
            tbody.appendChild(tr);
        });
    }

    /**
     * Configuración del buscador.
     */
    function configurarFiltro() {
        const filtroInput = document.getElementById('filtroParticipantes');
        if (filtroInput) {
            filtroInput.addEventListener('keyup', (e) => {
                renderRanking(e.target.value.trim()); 
            });
        }
    }

    // ----------------------------------------------------------------
    // PARTE 4: Inicialización y PDF (Originales)
    // ----------------------------------------------------------------
    
    actualizarFinanzasYEstadisticas(); 
    renderResultadosDia();
    renderRanking();
    configurarFiltro();
    
    // LÓGICA PARA DESCARGAR PDF (Usa jsPDF y AutoTable)
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4'); // Orientación horizontal

            // Título del PDF
            doc.setFontSize(18);
            doc.setTextColor(40);
            doc.text("RESULTADOS MEGA POLLA", 14, 15);

            // Información de encabezado
            doc.setFontSize(11);
            doc.text(`Ventas: ${finanzasData.ventas}`, 14, 25);
            doc.text(`Recaudado: ${finanzasData.recaudado.toFixed(2)} BS`, 60, 25);
            doc.text(`Premio: ${document.getElementById('repartir75').textContent}`, 120, 25);

            // Generar tabla automáticamente desde el HTML
            doc.autoTable({
                html: '.ranking table',
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [253, 216, 53], textColor: 20 },
                didParseCell: function(data) {
                    // Si la celda tiene la clase 'acierto' o es ganadora, podemos darle color en el PDF
                    if (data.cell.raw && data.cell.raw.classList && data.cell.raw.classList.contains('fila-ganadora')) {
                        data.cell.styles.fillColor = [200, 255, 200];
                    }
                }
            });

            doc.save('Resultados_MegaPolla.pdf');
        });
    }
});