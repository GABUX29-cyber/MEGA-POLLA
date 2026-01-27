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
            headerP.innerHTML = `<i class="far fa-calendar-alt"></i> ${fechaFormateada}`;
        }
    }

    async function cargarDatos() {
        try {
            const { data: res, error: errRes } = await supabase.from('resultados').select('*');
            if (errRes) throw errRes;
            resultadosAdmin = res || [];

            const { data: part, error: errPart } = await supabase.from('participantes').select('*');
            if (errPart) throw errPart;
            participantesData = part || [];

            const { data: fin, error: errFin } = await supabase.from('finanzas').select('*').single();
            if (!errFin && fin) {
                finanzasData = fin;
            }

            procesarResultadosParaTabla();
            calcularRanking();
            actualizarFinanzasUI();
            renderRanking();
        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    }

    function procesarResultadosParaTabla() {
        const ruletas = ["LOTTO ACTIVO", "GRANJITA", "SELVA PLUS"];
        const horarios = [
            "8AM", "9AM", "10AM", "11AM", "12PM", "1PM", 
            "2PM", "3PM", "4PM", "5PM", "6PM", "7PM"
        ];

        resultadosDelDia = [];
        const tbody = document.querySelector('#tabla-resultados-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        ruletas.forEach(ruleta => {
            const tr = document.createElement('tr');
            let html = `<td class="col-ruleta">${ruleta}</td>`;
            
            horarios.forEach(hora => {
                const encontrado = resultadosAdmin.find(r => r.ruleta === ruleta && r.horario === hora);
                const valor = encontrado ? encontrado.numero : '-';
                const clase = encontrado ? 'celda-numero' : 'sin-resultado';
                html += `<td class="${clase}">${valor}</td>`;
                
                if (encontrado && encontrado.numero) {
                    resultadosDelDia.push(encontrado.numero);
                }
            });
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
    }

    function calcularRanking() {
        rankingCalculado = participantesData.map(p => {
            const jugadaArray = p.jugada ? p.jugada.split(',') : [];
            let aciertos = 0;
            jugadaArray.forEach(num => {
                if (resultadosDelDia.includes(num.trim())) {
                    aciertos++;
                }
            });
            return { ...p, aciertos, jugadaArray };
        }).sort((a, b) => b.aciertos - a.aciertos);
    }

    function actualizarFinanzasUI() {
        const ventasEl = document.getElementById('total-ventas');
        const recaudadoEl = document.getElementById('total-recaudado');
        const acumuladoEl = document.getElementById('acumulado-anterior');
        const casaEl = document.getElementById('comision-casa');
        const domingoEl = document.getElementById('comision-domingo');
        const repartirEl = document.getElementById('premio-repartir');

        if (ventasEl) ventasEl.textContent = finanzasData.ventas;
        if (recaudadoEl) recaudadoEl.textContent = formatearBS(finanzasData.recaudado);
        if (acumuladoEl) acumuladoEl.textContent = formatearBS(finanzasData.acumulado1);

        const casa = finanzasData.recaudado * 0.20;
        const domingo = finanzasData.recaudado * 0.05;
        const repartir = (finanzasData.recaudado - casa - domingo) + finanzasData.acumulado1;

        if (casaEl) casaEl.textContent = formatearBS(casa);
        if (domingoEl) domingoEl.textContent = formatearBS(domingo);
        if (repartirEl) repartirEl.textContent = formatearBS(repartir);
    }

    function renderRanking(filtro = "") {
        const tbody = document.getElementById('ranking-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalGanadores = 0;

        const filtrados = rankingCalculado.filter(p => 
            p.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
            p.nro.toString().includes(filtro)
        );

        filtrados.forEach(p => {
            if (p.aciertos >= 7) totalGanadores++;

            const tr = document.createElement('tr');

            // --- AÑADIDO PARA COLORES EN PDF Y WEB ---
            if (p.aciertos > 0) {
                tr.classList.add(`fila-acierto-${Math.min(p.aciertos, 7)}`);
            }
            // -----------------------------------------

            let jugadasHTML = '';
            p.jugadaArray.forEach(num => {
                const esAcierto = resultadosDelDia.includes(num.trim());
                const claseGanador = esAcierto ? 'hit' : '';
                jugadasHTML += `<td><span class="ranking-box ${claseGanador}">${num}</span></td>`;
            });

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

    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    if (btnDescargarPdf) {
        btnDescargarPdf.addEventListener('click', () => {
            window.print();
        });
    }

    establecerFechaReal();
    cargarDatos();
    configurarFiltro();
});