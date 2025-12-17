document.addEventListener('DOMContentLoaded', async () => {

    // ---------------------------------------------------------------------------------------
    // --- CONFIGURACIÓN SUPABASE ---
    // ---------------------------------------------------------------------------------------
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ---------------------------------------------------------------------------------------
    // --- CONSTANTES DE CONFIGURACIÓN (MEGA POLLA) ---
    // ---------------------------------------------------------------------------------------
    const CLAVES_VALIDAS = ['29931335', '24175402'];
    const NOTA_SIN_CORRECCION = "Jugada sin correcciones automáticas.";
    const JUGADA_SIZE = 7; 

    // Variables de estado local
    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };

    // ---------------------------------------------------------------------------------------
    // --- BLOQUEO DE ACCESO ---
    // ---------------------------------------------------------------------------------------
    function iniciarBloqueo() {
        let accesoConcedido = false;
        let intentos = 0;
        while (!accesoConcedido && intentos < 3) {
            const claveIngresada = prompt("🔒 Acceso Restringido.\nPor favor, ingresa la clave de administrador para continuar:");
            if (claveIngresada && CLAVES_VALIDAS.includes(claveIngresada.trim())) {
                accesoConcedido = true;
            } else {
                intentos++;
                if (intentos < 3) alert("Clave incorrecta.");
                else window.location.href = "index.html";
            }
        }
    }
    iniciarBloqueo();

    // ---------------------------------------------------------------------------------------
    // --- CARGA Y PERSISTENCIA (Supabase) ---
    // ---------------------------------------------------------------------------------------
    
    async function cargarDatosDesdeSupabase() {
        try {
            // Cargar Participantes
            const { data: pData } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            participantes = pData || [];

            // Cargar Resultados
            const { data: rData } = await _supabase.from('resultados').select('*');
            resultados = rData || [];

            // Cargar Finanzas
            const { data: fData } = await _supabase.from('finanzas').select('*').single();
            if (fData) finanzas = fData;

            renderTodo();
        } catch (err) {
            console.error("Error cargando datos:", err);
        }
    }

    async function guardarParticipantes() {
        // En un entorno real, es mejor usar .upsert o manejar IDs únicos. 
        // Aquí simplificamos para mantener la lógica de tu lista local:
        const { error } = await _supabase.from('participantes').delete().neq('nro', -1); 
        if (!error) await _supabase.from('participantes').insert(participantes);
    }

    async function guardarResultados() {
        // Limpiamos y reinsertamos para sincronizar la lista completa
        await _supabase.from('resultados').delete().neq('numero', 'null');
        await _supabase.from('resultados').insert(resultados);
    }

    async function guardarFinanzas() {
        // Usamos id: 1 para que siempre sea el mismo registro de finanzas
        await _supabase.from('finanzas').upsert({ id: 1, ...finanzas });
    }

    function renderTodo() {
        renderResultados();
        renderParticipantes();
        cargarFinanzasInputs();
    }

    // ---------------------------------------------------------------------------------------
    // --- GESTIÓN DE FINANZAS ---
    // ---------------------------------------------------------------------------------------
    const formFinanzas = document.getElementById('form-finanzas');
    function cargarFinanzasInputs() {
        if (formFinanzas) {
            document.getElementById('input-ventas').value = finanzas.ventas;
            document.getElementById('input-recaudado').value = finanzas.recaudado;
            document.getElementById('input-acumulado').value = finanzas.acumulado1;
        }
    }

    if (formFinanzas) {
        formFinanzas.addEventListener('submit', async (e) => {
            e.preventDefault();
            finanzas.ventas = parseInt(document.getElementById('input-ventas').value);
            finanzas.recaudado = parseFloat(document.getElementById('input-recaudado').value);
            finanzas.acumulado1 = parseFloat(document.getElementById('input-acumulado').value);
            await guardarFinanzas();
            renderTodo();
            alert("✅ Finanzas sincronizadas con la nube.");
        });
    }

    // ---------------------------------------------------------------------------------------
    // --- GESTIÓN DE RESULTADOS ---
    // ---------------------------------------------------------------------------------------
    const formResultados = document.getElementById('form-resultados');
    const listaResultados = document.getElementById('lista-resultados');

    if (formResultados) {
        formResultados.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sorteo = document.getElementById('sorteo-hora').value;
            const numero = document.getElementById('numero-ganador').value.padStart(2, '0');
            if (sorteo && numero) {
                resultados.push({ sorteo, numero });
                await guardarResultados();
                renderTodo();
                formResultados.reset();
            }
        });
    }

    function renderResultados() {
        if (!listaResultados) return;
        listaResultados.innerHTML = '';
        resultados.forEach((res, index) => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.marginBottom = "5px";
            li.innerHTML = `<span><strong>${res.sorteo}:</strong> ${res.numero}</span>
                            <button class="btn-eliminar" onclick="eliminarResultado(${index})">Eliminar</button>`;
            listaResultados.appendChild(li);
        });
    }

    window.eliminarResultado = async (index) => {
        if (confirm("¿Eliminar resultado?")) {
            resultados.splice(index, 1);
            await guardarResultados();
            renderTodo();
        }
    };

    // ---------------------------------------------------------------------------------------
    // --- PROCESAMIENTO RÁPIDO (DATOS PEGADOS) ---
    // ---------------------------------------------------------------------------------------
    const btnProcesarPegado = document.getElementById('btn-procesar-pegado');
    const inputPasteData = document.getElementById('input-paste-data');

    if (btnProcesarPegado) {
        btnProcesarPegado.addEventListener('click', () => {
            const rawData = inputPasteData.value;
            if (!rawData.trim()) return alert("Pega datos primero.");
            const lines = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
            let nombreExtraido = ""; let refeExtraido = ""; let todasLasJugadas = [];

            lines.forEach(line => {
                const numbersFound = line.match(/\b\d{2}\b/g);
                if (numbersFound && numbersFound.length >= JUGADA_SIZE) {
                    for (let i = 0; i < numbersFound.length; i += JUGADA_SIZE) {
                        const grupo = numbersFound.slice(i, i + JUGADA_SIZE);
                        if (grupo.length === JUGADA_SIZE) todasLasJugadas.push(grupo.join(','));
                    }
                } else if (line.toLowerCase().includes("refe:")) {
                    const idMatch = line.match(/\d+/);
                    if (idMatch) refeExtraido = idMatch[0];
                } else if (line.length > 2 && !line.includes(":") && isNaN(line.charAt(0))) {
                    nombreExtraido = line.toUpperCase();
                }
            });
            if (nombreExtraido) document.getElementById('nombre').value = nombreExtraido;
            if (refeExtraido) document.getElementById('refe').value = refeExtraido;
            if (todasLasJugadas.length > 0) document.getElementById('jugadas-procesadas').value = todasLasJugadas.join(' | ');
            alert("✅ Datos extraídos localmente.");
        });
    }

    // ---------------------------------------------------------------------------------------
    // --- REGISTRO DE PARTICIPANTES ---
    // ---------------------------------------------------------------------------------------
    const formParticipante = document.getElementById('form-participante');
    const listaParticipantes = document.getElementById('lista-participants-ul') || document.getElementById('lista-participantes');

    if (formParticipante) {
        formParticipante.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombre').value.trim();
            const refe = document.getElementById('refe').value.trim();
            const jugadasRaw = document.getElementById('jugadas-procesadas').value.trim();
            if (!nombre || !refe || !jugadasRaw) return;

            const gruposJugadas = jugadasRaw.split('|');
            gruposJugadas.forEach(grupo => {
                const nums = grupo.split(',').map(n => n.trim()).filter(n => n !== "");
                if (nums.length === JUGADA_SIZE) {
                    participantes.push({
                        nro: participantes.length + 1,
                        nombre: nombre,
                        refe: refe,
                        jugadas: nums,
                        notas: document.getElementById('notas-correccion').value || NOTA_SIN_CORRECCION
                    });
                }
            });
            await guardarParticipantes();
            renderTodo();
            formParticipante.reset();
            inputPasteData.value = "";
        });
    }

    function renderParticipantes() {
        if (!listaParticipantes) return;
        const filtro = document.getElementById('input-buscar-participante').value.toLowerCase();
        listaParticipantes.innerHTML = '';
        const filtrados = participantes.filter(p => p.nombre.toLowerCase().includes(filtro) || p.refe.includes(filtro));
        
        filtrados.forEach((p, idx) => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.padding = "8px";
            li.style.borderBottom = "1px solid #ddd";
            li.innerHTML = `<span>#${p.nro} - <strong>${p.nombre}</strong> (${p.refe})</span>
                            <button class="btn-eliminar" onclick="eliminarParticipante(${idx})">Eliminar</button>`;
            listaParticipantes.appendChild(li);
        });
    }

    window.eliminarParticipante = async (index) => {
        if (confirm("¿Eliminar jugada?")) {
            participantes.splice(index, 1);
            // Re-numerar
            participantes.forEach((p, i) => p.nro = i + 1);
            await guardarParticipantes();
            renderTodo();
        }
    };

    // ---------------------------------------------------------------------------------------
    // --- PARTE 4: INICIALIZACIÓN ---
    // ---------------------------------------------------------------------------------------
    
    // Buscador en tiempo real
    const inputBuscar = document.getElementById('input-buscar-participante');
    if (inputBuscar) inputBuscar.addEventListener('input', renderParticipantes);

    // Botón Reiniciar (Opcional: Limpia todo en Supabase)
    const btnReiniciar = document.getElementById('btn-reiniciar-datos');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', async () => {
            if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará TODOS los participantes y resultados de la nube.")) {
                const clave = prompt("Confirma con tu clave de admin:");
                if (CLAVES_VALIDAS.includes(clave)) {
                    await _supabase.from('participantes').delete().neq('nro', -1);
                    await _supabase.from('resultados').delete().neq('numero', 'null');
                    // Reiniciar finanzas a cero
                    finanzas = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
                    await guardarFinanzas();
                    
                    participantes = [];
                    resultados = [];
                    renderTodo();
                    alert("✅ Datos reiniciados con éxito.");
                }
            }
        });
    }

    // Carga inicial
    await cargarDatosDesdeSupabase();
});