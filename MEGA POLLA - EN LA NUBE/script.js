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

    async function cargarDatosDesdeNube() {
        try {
            const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            const { data: r } = await _supabase.from('resultados').select('*');
            const { data: f } = await _supabase.from('finanzas').select('*').single();

            if (p) participantesData = p;
            if (r) {
                resultadosAdmin = r;
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

    // ----------------------------------------------------------------
    // PARTE 2: Funciones Lógicas de Cálculo
    // ----------------------------------------------------------------

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
        
        if (repartirEl) {
            const premio = GRAN_TOTAL * 0.75;
            repartirEl.textContent = formatearBS(premio);
        }

        if (casaEl) {
            const casa = GRAN_TOTAL * 0.20;
            casaEl.textContent = formatearBS(casa);
        }

        if (domingoEl) {
            const domingo = GRAN_TOTAL * 0.05;
            domingoEl.textContent = formatearBS(domingo);
        }
    }

    // ----------------------------------------------------------------
    // PARTE 3: Renderizado de Interfaz
    // ----------------------------------------------------------------

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

            if (!mapaResultados[nombreRuleta]) {
                mapaResultados[nombreRuleta] = {};
            }
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
                const num = (mapaResultados[ruleta] && mapaResultados[ruleta][h]) 
                            ? mapaResultados[ruleta][h] 
                            : "--";
                const claseNum = num === "--" ? "sin-resultado" : "celda-numero";
                tablaHTML += `<td class="${claseNum}">${num}</td>`;
            });
            tablaHTML += `</tr>`;
        });

        tablaHTML += `</tbody></table></div>`;
        container.innerHTML = tablaHTML;
    }

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

    // =========================================================
    // LÓGICA DE IMPRESIÓN "ULTRA-FIX" (TABLOIDE + ZOOM + PC OK)
    // =========================================================
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', () => {
            
            const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (!esMovil) {
                // PC: Impresión nativa normal (sin cambios de escala)
                window.print();
            } else {
                // TLF: Forzado de parámetros Tabloide, Zoom y Márgenes
                const viewport = document.querySelector('meta[name="viewport"]');
                const originalContent = viewport ? viewport.getAttribute('content') : "";
                
                if (viewport) {
                    viewport.setAttribute('content', 'width=1024');
                }

                const style = document.createElement('style');
                style.id = "print-ultra-fix";
                style.innerHTML = `
                    @media print {
                        @page { 
                            size: 11in 17in; /* FUERZA TAMAÑO TABLOIDE */
                            margin: 0mm;    /* ELIMINA ENCABEZADOS Y PIES DE PÁGINA NATALES */
                        }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        html, body {
                            width: 1024px !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            background-color: #212121 !important;
                        }
                        body {
                            /* ZOOM 90% SIMULADO Y CENTRADO TOTAL */
                            transform: scale(0.9);
                            transform-origin: top center;
                        }
                        header, .card-container {
                            width: 980px !important;
                            margin: 10px auto !important;
                        }
                        /* Ocultar elementos innecesarios en el PDF del tlf */
                        .filtro-container, #btn-descargar-pdf, footer {
                            display: none !important;
                        }
                    }
                `;
                document.head.appendChild(style);

                // Tiempo para que el navegador móvil procese el ancho de 1024px
                setTimeout(() => {
                    window.print();
                    
                    // Restaurar el estado visual original después de cerrar el menú de impresión
                    setTimeout(() => {
                        if (viewport) viewport.setAttribute('content', originalContent);
                        const s = document.getElementById("print-ultra-fix");
                        if (s) document.head.removeChild(s);
                    }, 1500);
                }, 600);
            }
        });
    }

    cargarDatosDesdeNube();
});