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
    // --- 1. FUNCIÓN DE PROCESAMIENTO INTELIGENTE (REGLAS SOLICITADAS) ---
    // ---------------------------------------------------------------------------------------
    function procesarYValidarJugada(numerosRaw, nombreParticipante) {
        // A. Normalización y transformación: 0 -> "O", el "00" se queda igual
        let numeros = numerosRaw.map(n => {
            let num = n.trim().padStart(2, '0');
            if (num === "00") return "00";
            // Si el valor numérico es 0 (pero no es "00"), lo convertimos en letra "O"
            if (parseInt(num) === 0) return "O";
            return num;
        });

        let avisos = [];

        // B. Regla de los 8 números: Prioridad eliminar el último si sobra
        if (numeros.length > JUGADA_SIZE) {
            let eliminado = numeros.pop();
            avisos.push(`Se eliminó el número sobrante (${eliminado}) por exceso.`);
        }

        // C. Validar que queden exactamente 7 después del recorte
        if (numeros.length < JUGADA_SIZE) {
            alert(`❌ ERROR en ${nombreParticipante}: Solo tiene ${numeros.length} números. (Mínimo requerido: 7)`);
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
            // Intentar reemplazar el duplicado por "36" si el 36 no está en la jugada
            if (!numeros.includes("36")) {
                let index = numeros.lastIndexOf(duplicado);
                numeros[index] = "36";
                avisos.push(`Duplicado detectado (${duplicado}). Reemplazado por 36.`);
            } else {
                // Si el 36 ya existe, la jugada no es válida
                alert(`🚫 JUGADA NULA (${nombreParticipante}): Tiene duplicado (${duplicado}) y el 36 ya está ocupado.`);
                return null;
            }
        }

        if (avisos.length > 0) {
            alert(`📝 CORRECCIONES EN ${nombreParticipante}:\n${avisos.join('\n')}`);
        }

        return numeros;
    }

    // ---------------------------------------------------------------------------------------
    // --- 2. CARGA Y GUARDADO EN LA NUBE ---
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

    // (Otras funciones de guardado como guardarResultadoNube y actualizarFinanzasNube permanecen igual)

    // ---------------------------------------------------------------------------------------
    // --- 3. GESTIÓN DE FORMULARIOS ---
    // ---------------------------------------------------------------------------------------

    // Pegado automático
    document.getElementById('btn-procesar-pegado').addEventListener('click', () => {
        const rawData = document.getElementById('input-paste-data').value;
        const lineas = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        let numerosEncontrados = [];
        let nombre = "Sin Nombre";
        let refe = "";

        lineas.forEach(linea => {
            const matches = linea.match(/\b\d{1,2}\b/g);
            if (matches && matches.length >= 5) {
                // Aquí tomamos todos los números que encuentre para que la validación decida luego
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

    // Formulario Registrar Participante (CON VALIDACIONES APLICADAS)
    const formParticipante = document.getElementById('form-participante');
    formParticipante.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombreBase = document.getElementById('nombre').value;
        const refe = document.getElementById('refe').value;
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');

        if (!refe) return alert("El REFE es obligatorio");

        jugadasRaw.forEach((jugadaStr, index) => {
            if(jugadaStr.trim() === "") return;

            // Convertimos la cadena de texto en un array de números "sucios"
            let numerosSucios = jugadaStr.split(',').map(n => n.trim()).filter(n => n !== "");
            let nombreFinal = jugadasRaw.length > 1 ? `${nombreBase} (Polla ${index + 1})` : nombreBase;

            // LLAMAMOS AL PROCESADOR INTELIGENTE
            let jugadaLimpia = procesarYValidarJugada(numerosSucios, nombreFinal);

            // Si la jugada es válida (no es null), la guardamos
            if (jugadaLimpia) {
                const nuevaJugada = {
                    nro: participantes.length + 1,
                    nombre: nombreFinal,
                    refe: refe,
                    jugadas: jugadaLimpia 
                };
                guardarParticipanteNube(nuevaJugada);
            }
        });

        formParticipante.reset();
        document.getElementById('input-paste-data').value = "";
    });

    // ---------------------------------------------------------------------------------------
    // --- 4. RENDERIZADO Y SEGURIDAD ---
    // ---------------------------------------------------------------------------------------
    function renderizarTodo() {
        if (finanzas) {
            document.getElementById('input-ventas').value = finanzas.ventas;
            document.getElementById('input-recaudado').value = finanzas.recaudado;
            document.getElementById('input-acumulado').value = finanzas.acumulado1;
        }

        const listaRes = document.getElementById('lista-resultados');
        listaRes.innerHTML = '';
        resultados.forEach((res) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${res.sorteo}: <strong>${res.numero}</strong></span> 
                           <button class="btn-eliminar" onclick="eliminarResultadoNube(${res.id})">Eliminar</button>`;
            listaRes.appendChild(li);
        });

        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = '';
        participantes.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${p.nro} - ${p.nombre} (${p.refe}) - [${p.jugadas.join(', ')}]</span>`;
            listaPart.appendChild(li);
        });
    }

    // (Seguridad de reinicio y bloqueo inicial igual al original)
    // ...
    
    cargarDatosDesdeNube(); // Carga inicial si pasa el prompt
});