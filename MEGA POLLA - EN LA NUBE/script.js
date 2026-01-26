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

    async function cargarDatos() {
        try {
            const { data: resData, error: resError } = await _supabase
                .from('resultados')
                .select('*')
                .order('id', { ascending: true });
            if (resError) throw resError;
            resultadosAdmin = resData;

            const { data: partData, error: partError } = await _supabase
                .from('participantes')
                .select('*')
                .order('nro', { ascending: true });
            if (partError) throw partError;
            participantesData = partData;

            const { data: finData, error: finError } = await _supabase
                .from('finanzas')
                .select('*')
                .single();
            if (!finError && finData) {
                finanzasData = finData;
            }

            procesarResultadosYRanking();
        } catch (err) {
            console.error("Error cargando datos:", err);
        }
    }

    function procesarResultadosYRanking() {
        // Obtenemos array simple de números ganadores
        resultadosDelDia = resultadosAdmin.map(r => r.numero).filter(n => n !== null && n !== '');

        rankingCalculado = participantesData.map(p => {
            let aciertos = 0;
            p.jugada.forEach(num => {
                if (resultadosDelDia.includes(num)) {
                    aciertos++;
                }
            });
            return { ...p, aciertos };
        });

        // Ordenar por aciertos (descendente) y luego por número de participante
        rankingCalculado.sort((a, b) => b.aciertos - a.aciertos || a.nro - b.nro);

        renderResultadosGrid();
        renderFinanzas();
        renderRanking();
        configurarFiltro();
    }

    // Renderiza la tabla de resultados por horas (Estilo Cuadrícula)
    function renderResultadosGrid() {
        const display = document.getElementById('numeros-ganadores-display');
        if (!display) return;
        display.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'tabla-resultados-wrapper';

        let tablaHTML = `
            <table class="tabla-horarios">
                <thead>
                    <tr>
                        <th>RULETA</th>
                        <th>09 AM</th>
                        <th>10 AM</th>
                        <th>11 AM</th>
                        <th>12 PM</th>
                        <th>01 PM</th>
                        <th>04 PM</th>
                        <th>05 PM</th>
                        <th>06 PM</th>
                        <th>07 PM</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const ruletas = [
            { nombre: 'LOTTO ACTIVO', ids: [1,2,3,4,5,6,7,8,9] },
            { nombre: 'LA GRANJITA', ids: [10,11,12,13,14,15,16,17,18] }
        ];

        ruletas.forEach(ruleta => {
            tablaHTML += `<tr><td class="col-ruleta">${ruleta.nombre}</td>`;
            ruleta.ids.forEach(id => {
                const res = resultadosAdmin.find(r => r.id === id);
                const valor = (res && res.numero !== null) ? res.numero : '-';
                const clase = (res && res.numero !== null) ? 'celda-numero' : 'sin-resultado';
                tablaHTML += `<td class="${clase}">${valor}</td>`;
            });
            tablaHTML += '</tr>';
        });

        tablaHTML += '</tbody></table>';
        wrapper.innerHTML = tablaHTML;
        display.appendChild(wrapper);
    }

    function renderFinanzas() {
        const v = finanzasData;
        const totalVentas = v.ventas * 30; 
        const casa = totalVentas * 0.20;
        const domingo = totalVentas * 0.10;
        const repartir = totalVentas - casa - domingo;

        const mapping = {
            'val-ventas': v.ventas,
            'val-recaudado': formatearBS(v.recaudado),
            'val-acumulado': formatearBS(v.acumulado1),
            'val-casa': formatearBS(casa),
            'val-domingo': formatearBS(domingo),
            'val-repartir': formatearBS(repartir)
        };

        for (const [id, val] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }
    }

    function renderRanking(filtro = '') {
        const tbody = document.getElementById('ranking-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalGanadores = 0;

        const dataFiltrada = rankingCalculado.filter(p => 
            p.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
            p.refe.toLowerCase().includes(filtro.toLowerCase())
        );

        dataFiltrada.forEach(p => {
            if (p.aciertos >= 7) totalGanadores++;

            const tr = document.createElement('tr');
            let jugadasHTML = '';
            for (let i = 0; i < JUGADA_SIZE; i++) {
                const num = p.jugada[i];
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
    // LÓGICA DE IMPRESIÓN MEJORADA (PDF IDENTICO EN MÓVIL)
    // =========================================================
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', () => {
            // Guardamos el estado original del viewport
            const viewport = document.querySelector('meta[name="viewport"]');
            const originalContent = viewport ? viewport.getAttribute('content') : "width=device-width, initial-scale=1.0";
            
            // 1. Forzamos ancho de escritorio antes de imprimir para evitar diseño móvil comprimido
            if (viewport) {
                viewport.setAttribute('content', 'width=1024');
            }

            // 2. Esperamos un breve momento para que el navegador ajuste el layout
            setTimeout(() => {
                window.print();
                
                // 3. Restauramos el viewport original para que la web siga siendo cómoda en el móvil
                if (viewport) {
                    viewport.setAttribute('content', originalContent);
                }
            }, 500);
        });
    }

    // Inicialización
    establecerFechaReal();
    cargarDatos();
});