document.addEventListener('DOMContentLoaded', () => {

    // ---------------------------------------------------------------------------------------
    // --- CONSTANTES Y CONFIGURACIÓN ---
    // ---------------------------------------------------------------------------------------
    const CLAVES_VALIDAS = ['29931335', '24175402'];
    const JUGADA_SIZE = 7; 

    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };

    // ---------------------------------------------------------------------------------------
    // --- 1. CARGA INICIAL DESDE SUPABASE ---
    // ---------------------------------------------------------------------------------------
    async function cargarDatosDesdeNube() {
        try {
            const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            const { data: r } = await _supabase.from('resultados').select('*');
            const { data: f } = await _supabase.from('finanzas').select('*').single();

            if (p) participantes = p;
            if (r) resultados = r;
            if (f) finanzas = f;

            renderizarTodo();
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    }

    // ---------------------------------------------------------------------------------------
    // --- 2. FUNCIONES DE GUARDADO EN LA NUBE ---
    // ---------------------------------------------------------------------------------------

    async function guardarParticipanteNube(nuevoParticipante) {
        const { error } = await _supabase.from('participantes').insert([nuevoParticipante]);
        if (error) alert("Error al guardar participante");
        else cargarDatosDesdeNube();
    }

    async function guardarResultadoNube(nuevoResultado) {
        const { error } = await _supabase.from('resultados').insert([nuevoResultado]);
        if (error) alert("Error al guardar resultado");
        else cargarDatosDesdeNube();
    }

    async function actualizarFinanzasNube() {
        // Intentamos actualizar la fila con ID 1
        const { error } = await _supabase
            .from('finanzas')
            .update({
                ventas: finanzas.ventas,
                recaudado: finanzas.recaudado,
                acumulado1: finanzas.acumulado1
            })
            .eq('id', 1);
        
        if (error) {
            console.error(error);
            alert("Error al actualizar finanzas. Asegúrate de que exista una fila con ID 1 en Supabase.");
        } else {
            alert("✅ Finanzas actualizadas correctamente en la nube.");
            cargarDatosDesdeNube(); // Recargamos para confirmar
        }
    }

    // ---------------------------------------------------------------------------------------
    // --- 3. GESTIÓN DE FORMULARIOS ---
    // ---------------------------------------------------------------------------------------

    // Formulario de Finanzas
    const formFinanzas = document.getElementById('form-finanzas');
    formFinanzas.addEventListener('submit', (e) => {
        e.preventDefault();
        finanzas.ventas = parseInt(document.getElementById('input-ventas').value);
        finanzas.recaudado = parseFloat(document.getElementById('input-recaudado').value);
        finanzas.acumulado1 = parseFloat(document.getElementById('input-acumulado').value);
        actualizarFinanzasNube();
    });

    // Formulario de Resultados
    const formResultados = document.getElementById('form-resultados');
    formResultados.addEventListener('submit', (e) => {
        e.preventDefault();
        const nuevoRes = {
            sorteo: document.getElementById('sorteo-hora').value,
            numero: document.getElementById('numero-ganador').value.padStart(2, '0')
        };
        guardarResultadoNube(nuevoRes);
        formResultados.reset();
    });

    // Procesar Pegado de Participantes
    document.getElementById('btn-procesar-pegado').addEventListener('click', () => {
        const rawData = document.getElementById('input-paste-data').value;
        const lineas = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        let numerosEncontrados = [];
        let nombre = "Sin Nombre";
        let refe = "";

        lineas.forEach(linea => {
            const matches = linea.match(/\b\d{1,2}\b/g);
            if (matches && matches.length >= 5) {
                numerosEncontrados.push(matches.slice(0, 7).map(n => n.padStart(2, '0')).join(','));
            } else if (linea.toLowerCase().includes("identificación") || linea.toLowerCase().includes("refe")) {
                refe = linea.replace(/\D/g, "");
            } else if (linea.length > 3 && !refe) {
                nombre = linea.toUpperCase();
            }
        });

        document.getElementById('nombre').value = nombre;
        document.getElementById('refe').value = refe;
        document.getElementById('jugadas-procesadas').value = numerosEncontrados.join(' | ');
    });

    // Registrar Participante
    const formParticipante = document.getElementById('form-participante');
    formParticipante.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const refe = document.getElementById('refe').value;
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');

        jugadasRaw.forEach((jugadaStr, index) => {
            if(jugadaStr.trim() === "") return;
            const nuevaJugada = {
                nro: participantes.length + 1,
                nombre: index === 0 ? nombre : `${nombre} (Polla ${index + 1})`,
                refe: refe,
                jugadas: jugadaStr.split(',').map(n => n.trim().padStart(2, '0'))
            };
            guardarParticipanteNube(nuevaJugada);
        });

        formParticipante.reset();
        document.getElementById('input-paste-data').value = "";
    });

    // ---------------------------------------------------------------------------------------
    // --- 4. RENDERIZADO (CORREGIDO PARA MOSTRAR DATOS ACTUALES) ---
    // ---------------------------------------------------------------------------------------
    function renderizarTodo() {
        // --- AQUÍ ESTÁ EL CAMBIO: Rellenar los inputs de finanzas con los datos de la nube ---
        if (finanzas) {
            document.getElementById('input-ventas').value = finanzas.ventas;
            document.getElementById('input-recaudado').value = finanzas.recaudado;
            document.getElementById('input-acumulado').value = finanzas.acumulado1;
        }

        // Render Resultados
        const listaRes = document.getElementById('lista-resultados');
        listaRes.innerHTML = '';
        resultados.forEach((res) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${res.sorteo}: <strong>${res.numero}</strong></span> 
                           <button class="btn-eliminar" onclick="eliminarResultadoNube(${res.id})">Eliminar</button>`;
            listaRes.appendChild(li);
        });

        // Render Participantes
        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = '';
        participantes.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${p.nro} - ${p.nombre} (${p.refe}) - [${p.jugadas.join(', ')}]</span>`;
            listaPart.appendChild(li);
        });
    }

    // Funciones globales
    window.eliminarResultadoNube = async (id) => {
        await _supabase.from('resultados').delete().eq('id', id);
        cargarDatosDesdeNube();
    };

    // --- SEGURIDAD Y REINICIO ---
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        const clave = prompt("Ingrese clave de seguridad para borrar TODO:");
        if (CLAVES_VALIDAS.includes(clave)) {
            if (confirm("¿Estás SEGURO? Esto borrará la base de datos de la nube.")) {
                await _supabase.from('participantes').delete().neq('id', 0);
                await _supabase.from('resultados').delete().neq('id', 0);
                alert("Datos reiniciados.");
                cargarDatosDesdeNube();
            }
        }
    });

    // Bloqueo Inicial
    const claveAcceso = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!CLAVES_VALIDAS.includes(claveAcceso)) {
        alert("Acceso denegado");
        document.body.innerHTML = "<h1>Acceso Denegado</h1>";
    } else {
        cargarDatosDesdeNube();
    }
});