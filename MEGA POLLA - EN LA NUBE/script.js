document.addEventListener('DOMContentLoaded', async () => {

    // ----------------------------------------------------------------
    // PARTE 1: Carga y Preparación de Datos desde SUPABASE
    // ----------------------------------------------------------------

    let resultadosAdmin = [];
    let participantesData = [];
    let finanzasData = {
        ventas: 0, 
        recaudado: 0.00,
        acumulado1: 0.00
    };
    
    let resultadosDelDia = [];
    const JUGADA_SIZE = 7; 
    let rankingCalculado = []; 

    // FUNCIÓN PARA FORMATEAR MONEDA (Punto en miles, coma en decimales)
    const formatearBS = (monto) => {
        return new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monto) + " BS";
    };

    function establecerFechaReal() {
        const headerP = document.querySelector('header p');
        if (headerP) {
            const ahora = new Date();
            const opciones = { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
            };
            const fechaFormateada = ahora.toLocaleDateString('es-ES', opciones);
            headerP.style.textTransform = 'capitalize';
            headerP.innerHTML = `<i class="fas fa-calendar-alt"></i> ${fechaFormateada}`;
        }
    }

    // CARGA INICIAL DESDE SUPABASE
    async function cargarDatosDesdeNube() {
        try {
            // Obtener Participantes
            const { data: p, error: ep } = await _supabase
                .from('participantes')
                .select('*')
                .order('nro', { ascending: true });

            // Obtener Resultados (Números ganadores del día)
            const { data: r, error: er } = await _supabase
                .from('resultados')
                .select('*');

            // Obtener Finanzas (Totales)
            const { data: f, error: ef } = await _supabase
                .from('finanzas')
                .select('*')
                .single();

            if (p) participantesData = p;
            if (r) {
                resultadosAdmin = r;
                // Extraer solo los números para el cálculo de aciertos
                resultadosDelDia = r.map(res => String(res.numero));
            }
            if (f) {
                finanzasData = f;
            }

            inicializarSistema();
        } catch (error) {
            console.error("Error cargando datos de Supabase:", error);
        }
    }

    function inicializarSistema() {
        establecerFechaReal(); 
        actualizarFinanzasYEstadisticas(); 
        renderResultadosDia();
        renderRanking();
        configurarFiltro();
    }

    // LÓGICA DE CÁLCULO DE ACIERTOS
    function calcularAciertos(jugadorJugadas, ganadores) {
        let aciertos = 0;
        const ganadoresSet = new Set(ganadores.map(val => String(val))); 
        
        jugadorJugadas.forEach(num => {
            let numProcesado = String(num);
            if (ganadoresSet.has(numProcesado)) {
                aciertos++;
            }
        });
        return aciertos;
    }

    // RENDERIZADO DE FINANZAS
    function actualizarFinanzasYEstadisticas() {
        const ventasEl = document.getElementById('ventas');
        const recaudadoEl = document.getElementById('recaudado');
        const acumuladoEl = document.getElementById('acumulado1');
        const repartirEl = document.getElementById('repartir75');
        const casaEl = document.getElementById('monto-casa');
        const domingoEl = document.getElementById('monto-domingo');

        const montoRecaudadoHoy = parseFloat(finanzasData.recaudado) || 0;
        const montoAcumuladoAnterior = parseFloat(finanzasData.acumulado1) || 0;
        const GRAN_TOTAL = montoRecaudadoHoy + montoAcumuladoAnterior;

        if (ventasEl) ventasEl.textContent = finanzasData.ventas;
        if (recaudadoEl) recaudadoEl.textContent = formatearBS(montoRecaudadoHoy);
        if (acumuladoEl) acumuladoEl.textContent = formatearBS(montoAcumuladoAnterior);
        
        // Cálculos porcentuales
        if (repartirEl) repartirEl.textContent = formatearBS(GRAN_TOTAL * 0.75);
        if (casaEl) casaEl.textContent = formatearBS(GRAN_TOTAL * 0.20);
        if (domingoEl) domingoEl.textContent = formatearBS(GRAN_TOTAL * 0.05);
    }

    // RENDERIZADO DE TABLA DE HORARIOS (RESULTADOS DEL DÍA)
    function renderResultadosDia() {
        const container = document.getElementById('numeros-ganadores-display');
        if (!container) return;

        if (resultadosAdmin.length === 0) {
            container.innerHTML = '<p>Esperando resultados del sorteo...</p>';
            return;
        }

        const horas = ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM"];
        const nombresRuletas = ["LOTTO ACTIVO", "GRANJITA", "SELVA PLUS"];

        const mapaResultados = {};
        resultadosAdmin.forEach(res => {
            const partes = res.sorteo.split(' ');
            const hora = partes.pop(); 
            const nombreRuleta = partes.join(' ');

            if (!mapaResultados[nombreRuleta]) mapaResultados[nombreRuleta] = {};
            mapaResultados[nombreRuleta][hora] = res.numero;
        });

        let tablaHTML = `
            <div class="tabla-resultados-wrapper">
                <table class="tabla-horarios">
                    <thead>
                        <tr>
                            <th style="background:#333; border:none;"></th>
                            ${horas.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        nombresRuletas.forEach(ruleta => {
            tablaHTML += `<tr><td class="col-ruleta">${ruleta}</td>`;
            horas.forEach(h => {
                const num = (mapaResultados[ruleta] && mapaResultados[ruleta][h]) ? mapaResultados[ruleta][h] : "--";
                const claseNum = num === "--" ? "sin-resultado" : "celda-numero";
                tablaHTML += `<td class="${claseNum}">${num}</td>`;
            });
            tablaHTML += `</tr>`;
        });

        tablaHTML += `</tbody></table></div>`;
        container.innerHTML = tablaHTML;
    }

    // RENDERIZADO DE RANKING Y LISTADO
    function renderRanking(filtro = "") {
        const tbody = document.getElementById('ranking-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        rankingCalculado = participantesData.map(p => {
            const numAciertos = calcularAciertos(p.jugadas, resultadosDelDia);
            return { ...p, aciertos: numAciertos };
        });

        rankingCalculado.sort((a, b) => b.aciertos - a.aciertos);

        const term = filtro.toLowerCase();
        const dataFiltrada = rankingCalculado.filter(p => 
            p.nombre.toLowerCase().includes(term) || 
            p.refe.toString().includes(term)
        );

        let totalGanadores = 0;

        dataFiltrada.forEach(p => {
            if (p.aciertos >= 7) totalGanadores++;

            const tr = document.createElement('tr');
            
            let jugadasHTML = '';
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const num = p.jugadas[i] ? String(p.jugadas[i]) : '--';
                const esGanador = resultadosDelDia.includes(num);
                const claseGanador = esGanador ? 'hit' : '';
                jugadasHTML += `<td><span class="ranking-box ${claseGanador}">${num}</span></td>`;
            }

            tr.innerHTML = `
                <td>${p.nro}</td>
                <td class="nombre-participante">${p.nombre}</td>
                <td>${p.refe}</td>
                ${jugadasHTML}
                <td id="aciertos-${p.nro}"></td>
            `;
            
            tbody.appendChild(tr);

            const aciertosCell = tr.querySelector(`#aciertos-${p.nro}`);
            if (p.aciertos >= 7) { 
                aciertosCell.innerHTML = '<span class="ganador-final">GANADOR 🏆</span>';
            } else {
                aciertosCell.innerHTML = `<span class="ranking-box aciertos-box">${p.aciertos}</span>`;
            }
        });

        const totalGanadoresEl = document.getElementById('total-ganadores');
        if (totalGanadoresEl) totalGanadoresEl.textContent = totalGanadores;
    }

    function configurarFiltro() {
        const filtroInput = document.getElementById('filtroParticipantes');
        if (filtroInput) {
            filtroInput.addEventListener('keyup', (e) => {
                renderRanking(e.target.value.trim()); 
            });
        }
    }

    // ----------------------------------------------------------------
    // PARTE 2: Descarga de PDF Directa (Tabloide, Márgenes 0)
    // ----------------------------------------------------------------
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', function() {
            // Seleccionamos todo el body para el PDF
            const element = document.body;

            // Opciones de configuración del archivo
            const opt = {
                margin:       0,
                filename:     'MEGA_POLLA_Resultados.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: '#212121', // Mantiene el fondo oscuro
                    logging: false 
                },
                jsPDF: { 
                    unit: 'in', 
                    format: 'tabloid', // Tamaño tabloide
                    orientation: 'portrait' 
                }
            };

            // Ocultar botones y filtros para que no salgan en el PDF
            this.style.display = 'none';
            const filtroCont = document.querySelector('.filtro-container');
            if (filtroCont) filtroCont.style.display = 'none';

            // Generar y guardar directamente
            html2pdf().set(opt).from(element).save().then(() => {
                // Volver a mostrar los elementos
                this.style.display = 'flex';
                if (filtroCont) filtroCont.style.display = 'block';
            });
        });
    }

    // Iniciar carga
    cargarDatosDesdeNube();
});