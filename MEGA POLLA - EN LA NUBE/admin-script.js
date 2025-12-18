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
    // --- 1. FUNCIÓN DE PROCESAMIENTO (REGLAS DE NEGOCIO) ---
    // ---------------------------------------------------------------------------------------
    function procesarYValidarJugada(numerosRaw, nombreParticipante) {
        let numeros = numerosRaw.map(n => {
            let num = n.trim().padStart(2, '0');
            // Regla: El número 0 se convierte en "O", pero "00" se queda como "00"
            if (num === "00") return "00";
            if (parseInt(num) === 0) return "O"; 
            return num;
        });

        let avisos = [];

        // Regla: Máximo 7 números
        if (numeros.length > JUGADA_SIZE) {
            let eliminado = numeros.pop();
            avisos.push(`Se eliminó el número sobrante (${eliminado}).`);
        }

        // Validación: Mínimo 7 números
        if (numeros.length < JUGADA_SIZE) {
            alert(`❌ ERROR en ${nombreParticipante}: Solo tiene ${numeros.length} números. Se requiere 7.`);
            return null;
        }

        // Gestión de Duplicados
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
            if (!numeros.includes("36")) {
                let index = numeros.lastIndexOf(duplicado);
                numeros[index] = "36";
                avisos.push(`Duplicado (${duplicado}) reemplazado por 36.`);
            } else {
                alert(`🚫 JUGADA NULA (${nombreParticipante}): Tiene duplicado (${duplicado}) y el 36 ya existe.`);
                return null;
            }
        }

        if (avisos.length > 0) {
            console.log(`📝 Correcciones automáticas para ${nombreParticipante}:`, avisos);
        }

        return numeros;
    }

    // ---------------------------------------------------------------------------------------
    // --- 2. CARGA Y ACTUALIZACIÓN EN SUPABASE ---
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

    async function actualizarFinanzasNube() {
        const { error } = await _supabase.from('finanzas').update(finanzas).eq('id', 1);
        if (error) alert("Error al actualizar finanzas");
        else {
            alert("✅ Finanzas actualizadas.");
            cargarDatosDesdeNube();
        }
    }

    // ---------------------------------------------------------------------------------------
    // --- 3. GESTIÓN DE FORMULARIOS ---
    // ---------------------------------------------------------------------------------------

    // Formulario de Finanzas
    document.getElementById('form-finanzas').addEventListener('submit', (e) => {
        e.preventDefault();
        finanzas.ventas = parseInt(document.getElementById('input-ventas').value);
        finanzas.recaudado = parseFloat(document.getElementById('input-recaudado').value);
        finanzas.acumulado1 = parseFloat(document.getElementById('input-acumulado').value);
        actualizarFinanzasNube();
    });

    // Formulario de Resultados
    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        let numRaw = document.getElementById('numero-ganador').value.trim();
        let numFinal = (numRaw === "0" || (parseInt(numRaw) === 0 && numRaw !== "00")) ? "O" : numRaw.padStart(2, '0');

        const nuevoRes = {
            sorteo: document.getElementById('sorteo-hora').value,
            numero: numFinal
        };
        const { error } = await _supabase.from('resultados').insert([nuevoRes]);
        if (!error) { e.target.reset(); cargarDatosDesdeNube(); }
    });

    // Procesar Pegado de Datos (Mensajes de WhatsApp)
    document.getElementById('btn-procesar-pegado').addEventListener('click', () => {
        const rawData = document.getElementById('input-paste-data').value;
        const lineas = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
        let numerosEncontrados = [];
        let nombre = "Sin Nombre", refe = "";

        lineas.forEach(linea => {
            const matches = linea.match(/\b\d{1,2}\b/g);
            if (matches && matches.length >= 5) {
                numerosEncontrados.push(matches.join(','));
            } else if (linea.toLowerCase().includes("refe") || linea.toLowerCase().includes("identificación")) {
                refe = linea.replace(/\D/g, "");
            } else if (linea.length > 3 && !refe) {
                nombre = linea.toUpperCase();
            }
        });

        document.getElementById('nombre').value = nombre;
        document.getElementById('refe').value = refe;
        document.getElementById('jugadas-procesadas').value = numerosEncontrados.join(' | ');
    });

    // Registro de Participantes (Secuencial con numeración automática)
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreBase = document.getElementById('nombre').value.trim();
        const refe = document.getElementById('refe').value.trim();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|').map(s => s.trim()).filter(s => s !== "");

        if (!refe) return alert("El REFE es obligatorio");

        for (let jugadaStr of jugadasRaw) {
            // Acepta comas (,) o barras (/)
            let numSucios = jugadaStr.split(/[,/]/).map(n => n.trim()).filter(n => n !== "");
            let jugadaLimpia = procesarYValidarJugada(numSucios, nombreBase);

            if (jugadaLimpia) {
                const { count } = await _supabase.from('participantes').select('*', { count: 'exact', head: true });
                const proximoNro = (count || 0) + 1;

                const nuevaJugada = {
                    nro: proximoNro,
                    nombre: nombreBase,
                    refe: refe,
                    jugadas: jugadaLimpia 
                };

                await _supabase.from('participantes').insert([nuevaJugada]);
            }
        }

        alert("✅ Registro exitoso.");
        e.target.reset();
        document.getElementById('input-paste-data').value = "";
        cargarDatosDesdeNube(); 
    });

    // ---------------------------------------------------------------------------------------
    // --- 4. RENDERIZADO (ESTILO CUADRÍCULA DE RULETAS) ---
    // ---------------------------------------------------------------------------------------
    function renderizarTodo() {
        // Actualizar inputs de finanzas
        if (finanzas) {
            document.getElementById('input-ventas').value = finanzas.ventas;
            document.getElementById('input-recaudado').value = finanzas.recaudado;
            document.getElementById('input-acumulado').value = finanzas.acumulado1;
        }

        // Renderizar lista de resultados (con botón eliminar)
        const listaRes = document.getElementById('lista-resultados');
        listaRes.innerHTML = '';
        resultados.forEach((res) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${res.sorteo}: <strong>${res.numero}</strong></span> 
                           <button class="btn-eliminar" onclick="eliminarResultadoNube(${res.id})">Eliminar</button>`;
            listaRes.appendChild(li);
        });

        // Renderizar lista de participantes
        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = '';
        participantes.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${p.nro} - ${p.nombre} (${p.refe}) - [${p.jugadas.join(', ')}]</span>`;
            listaPart.appendChild(li);
        });
    }

    // ---------------------------------------------------------------------------------------
    // --- 5. FUNCIONES GLOBALES Y SEGURIDAD ---
    // ---------------------------------------------------------------------------------------
    window.eliminarResultadoNube = async (id) => {
        if (confirm("¿Eliminar este resultado?")) {
            await _supabase.from('resultados').delete().eq('id', id);
            cargarDatosDesdeNube();
        }
    };

    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        const clave = prompt("Clave de seguridad para borrar TODO:");
        if (CLAVES_VALIDAS.includes(clave)) {
            if (confirm("¿Borrar toda la base de datos?")) {
                await _supabase.from('participantes').delete().neq('id', 0);
                await _supabase.from('resultados').delete().neq('id', 0);
                cargarDatosDesdeNube();
            }
        }
    });

    const claveAcceso = prompt("🔒 Ingrese clave de administrador:");
    if (!CLAVES_VALIDAS.includes(claveAcceso)) {
        document.body.innerHTML = "<h1 style='color:white;text-align:center;'>Acceso Denegado</h1>";
    } else {
        cargarDatosDesdeNube();
    }
});