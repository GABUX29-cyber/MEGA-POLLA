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
    // --- 1. FUNCIÓN DE PROCESAMIENTO INTELIGENTE (REGLAS DE VALIDACIÓN) ---
    // ---------------------------------------------------------------------------------------
    function procesarYValidarJugada(numerosRaw, nombreParticipante) {
        // A. Normalización y transformación de 0 a "O" (letra)
        let numeros = numerosRaw.map(n => {
            let num = n.trim().padStart(2, '0');
            if (num === "00") return "00";
            
            // Regla: el 0 (o 01 según contexto) es reemplazado por la letra O
            // Si el valor numérico es 0 pero no es el texto "00", se vuelve "O"
            if (parseInt(num) === 0) return "O";
            return num;
        });

        let avisos = [];

        // B. Regla de los 8 números: Prioridad eliminar el último si sobra
        if (numeros.length > JUGADA_SIZE) {
            let eliminado = numeros.pop();
            avisos.push(`Se eliminó el número sobrante (${eliminado}) por exceso de dígitos.`);
        }

        // C. Validar que queden exactamente 7
        if (numeros.length < JUGADA_SIZE) {
            alert(`❌ ERROR en ${nombreParticipante}: La jugada tiene solo ${numeros.length} números. Debe tener 7.`);
            return null;
        }

        // D. Gestión de Duplicados
        let counts = {};
        let duplicado = null;
        numeros.forEach(n => counts[n] = (counts[n] || 0) + 1);
        
        for (let n in counts) {
            if (counts[n] > 1) {
                duplicado = n;
                break;
            }
        }

        if (duplicado) {
            // Intentar reemplazar el duplicado por "36"
            if (!numeros.includes("36")) {
                let index = numeros.lastIndexOf(duplicado);
                numeros[index] = "36";
                avisos.push(`Duplicado detectado (${duplicado}). Se reemplazó por 36.`);
            } else {
                // Si el 36 ya existe, la jugada es nula
                alert(`🚫 JUGADA NULA (${nombreParticipante}): Tiene un duplicado (${duplicado}) y el reemplazo (36) ya existe.`);
                return null;
            }
        }

        if (avisos.length > 0) {
            alert(`📝 NOTA PARA ${nombreParticipante}:\n${avisos.join('\n')}`);
        }

        return numeros;
    }

    // ---------------------------------------------------------------------------------------
    // --- 2. CARGA Y GUARDADO EN SUPABASE ---
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

    async function guardarParticipanteNube(nuevoParticipante) {
        const { error } = await _supabase.from('participantes').insert([nuevoParticipante]);
        if (error) alert("Error al guardar participante");
        else cargarDatosDesdeNube();
    }

    // (Otras funciones de guardado como guardarResultadoNube y actualizarFinanzasNube se mantienen igual...)

    // ---------------------------------------------------------------------------------------
    // --- 3. GESTIÓN DE FORMULARIOS ---
    // ---------------------------------------------------------------------------------------

    // Botón "Pegar y Procesar Datos"
    document.getElementById('btn-procesar-pegado').addEventListener('click', () => {
        const rawData = document.getElementById('input-paste-data').value;
        const lineas = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        let numerosEncontrados = [];
        let nombre = "Sin Nombre";
        let refe = "";

        lineas.forEach(linea => {
            const matches = linea.match(/\b\d{1,2}\b/g);
            if (matches && matches.length >= 5) {
                numerosEncontrados.push(matches.join(','));
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

    // Formulario Registrar Participante (AQUÍ SE APLICAN LAS VALIDACIONES)
    const formParticipante = document.getElementById('form-participante');
    formParticipante.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreBase = document.getElementById('nombre').value.trim();
        const refe = document.getElementById('refe').value.trim();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');

        if (!refe) return alert("El REFE es obligatorio");

        for (let [index, jugadaStr] of jugadasRaw.entries()) {
            if (jugadaStr.trim() === "") continue;

            let numerosSucios = jugadaStr.split(',').map(n => n.trim()).filter(n => n !== "");
            let nombreFinal = jugadasRaw.length > 1 ? `${nombreBase} (Polla ${index + 1})` : nombreBase;
            
            // LLAMADA A LA VALIDACIÓN INTELIGENTE
            let jugadaLimpia = procesarYValidarJugada(numerosSucios, nombreFinal);

            if (!jugadaLimpia) continue; // Si es nula (error/duplicado sin 36), salta

            const nuevaJugada = {
                nro: participantes.length + 1,
                nombre: nombreFinal,
                refe: refe,
                jugadas: jugadaLimpia // Se guarda con "O" y correcciones
            };

            await guardarParticipanteNube(nuevaJugada);
        }

        formParticipante.reset();
        document.getElementById('input-paste-data').value = "";
        alert("✅ Registro procesado con validaciones.");
    });

    // (El resto de las funciones de renderizado y seguridad se mantienen igual...)
    // ...
    
    // Bloqueo Inicial
    const claveAcceso = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!CLAVES_VALIDAS.includes(claveAcceso)) {
        alert("Acceso denegado");
        document.body.innerHTML = "<h1>Acceso Denegado</h1>";
    } else {
        cargarDatosDesdeNube();
    }
});