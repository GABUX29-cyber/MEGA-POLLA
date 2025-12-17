document.addEventListener('DOMContentLoaded', async () => {

    // ---------------------------------------------------------------------------------------
    // --- CONSTANTES DE CONFIGURACIÓN (MEGA POLLA) ---
    // ---------------------------------------------------------------------------------------

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    const NOTA_SIN_CORRECCION = "Jugada sin correcciones automáticas.";
    const JUGADA_SIZE = 7; 

    // --- VARIABLES DE ESTADO ---
    let participantes = [];
    let resultados = [];
    let finanzas = {
        ventas: 0,
        recaudado: 0.00,
        acumulado1: 0.00
    };

    // ---------------------------------------------------------------------------------------
    // --- A. FUNCIONES DE PERSISTENCIA (SUPABASE) ---
    // ---------------------------------------------------------------------------------------

    // Carga inicial desde la nube
    async function cargarDesdeSupabase() {
        try {
            const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            const { data: r } = await _supabase.from('resultados').select('*');
            const { data: f } = await _supabase.from('finanzas').select('*').single();

            participantes = p || [];
            resultados = r || [];
            if (f) {
                finanzas = {
                    ventas: f.ventas,
                    recaudado: f.recaudado,
                    acumulado1: f.acumulado1
                };
            }
            renderTodo();
        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    }

    // Guardar finanzas en la nube
    async function sincronizarFinanzas() {
        await _supabase.from('finanzas').upsert({ 
            id: 1, 
            ventas: finanzas.ventas, 
            recaudado: finanzas.recaudado, 
            acumulado1: finanzas.acumulado1 
        });
    }

    function renderTodo() {
        renderParticipantes();
        renderResultados();
        actualizarResumenFinanzas();
    }

    // ---------------------------------------------------------------------------------------
    // --- B. SEGURIDAD Y BLOQUEO ---
    // ---------------------------------------------------------------------------------------

    function iniciarBloqueo() {
        let accesoConcedido = false;
        let intentos = 0;

        const claveGuardada = sessionStorage.getItem('sesionAdminMegaPolla');
        if (claveGuardada && CLAVES_VALIDAS.includes(claveGuardada)) {
            accesoConcedido = true;
        }

        if (!accesoConcedido) {
            alert("¡Bienvenido al Panel de Administración! Debes ingresar una clave válida para acceder.");
            while (!accesoConcedido && intentos < 3) {
                const claveIngresada = prompt("🔒 Acceso Restringido.\nPor favor, ingresa la clave de administrador:");
                if (claveIngresada && CLAVES_VALIDAS.includes(claveIngresada.trim())) {
                    accesoConcedido = true;
                    sessionStorage.setItem('sesionAdminMegaPolla', claveIngresada.trim());
                } else {
                    intentos++;
                    if (intentos < 3) alert("Clave incorrecta.");
                }
            }
        }

        if (!accesoConcedido) {
            document.body.innerHTML = `
                <div style="text-align:center; margin-top:100px; font-family:sans-serif;">
                    <h1>🚫 Acceso Denegado</h1>
                    <p>No tienes permiso para ver esta página.</p>
                    <button onclick="location.reload()">Reintentar</button>
                </div>`;
        } else {
            cargarDesdeSupabase();
        }
    }

    // ---------------------------------------------------------------------------------------
    // --- C. MANEJO DE RESULTADOS (SORTEOS) ---
    // ---------------------------------------------------------------------------------------

    window.guardarResultado = async (idInput, nombreSorteo) => {
        const inputElement = document.getElementById(idInput);
        const numeroGanador = inputElement.value.trim();

        if (numeroGanador === "") {
            alert("Por favor, ingresa un número.");
            return;
        }

        const { error } = await _supabase.from('resultados').upsert(
            { sorteo: nombreSorteo, numero: numeroGanador },
            { onConflict: 'sorteo' }
        );

        if (!error) {
            alert(`✅ ${nombreSorteo} actualizado: ${numeroGanador}`);
            cargarDesdeSupabase();
        }
    };

    function renderResultados() {
        resultados.forEach(res => {
            const input = document.querySelector(`input[onchange*="'${res.sorteo}'"]`);
            if (input) input.value = res.numero;
        });
    }

    // ---------------------------------------------------------------------------------------
    // --- D. GESTIÓN DE PARTICIPANTES ---
    // ---------------------------------------------------------------------------------------

    const formParticipante = document.getElementById('form-participante');
    formParticipante.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre-participante').value.trim();
        const refe = document.getElementById('refe-participante').value.trim();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.trim();
        const notas = document.getElementById('notas-correccion').value || NOTA_SIN_CORRECCION;

        const grupoJugadas = jugadasRaw.split('|').map(j => j.trim()).filter(j => j !== "");

        const { error } = await _supabase.from('participantes').insert([{
            nro: participantes.length + 1,
            nombre: nombre,
            refe: refe,
            jugadas: grupoJugadas,
            nota_correccion: notas
        }]);

        if (!error) {
            finanzas.ventas += grupoJugadas.length;
            finanzas.recaudado = finanzas.ventas * 5; 
            await sincronizarFinanzas();
            formParticipante.reset();
            cargarDesdeSupabase();
        }
    });

    function renderParticipantes(dataFiltrada = null) {
        const lista = document.getElementById('lista-participantes');
        lista.innerHTML = '';

        const dataAMostrar = dataFiltrada || participantes;

        dataAMostrar.forEach((p) => {
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid #ccc";
            li.style.padding = "10px 0";

            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = `
                <strong>#${p.nro} - ${p.nombre}</strong> <span style="color:#666;">(Refe: ${p.refe})</span><br>
                <small style="color:#555;">${p.jugadas.join(' | ')}</small><br>
                <i style="font-size:0.85em; color:#888;">Nota: ${p.nota_correccion}</i>
            `;
            li.appendChild(infoDiv);

            const btnContainer = document.createElement('div');
            btnContainer.style.marginTop = "5px";

            // BOTÓN EDITAR
            const btnEditar = document.createElement('button');
            btnEditar.textContent = "✏️ Editar";
            btnEditar.className = "btn-editar";
            btnEditar.onclick = () => habilitarEdicionFila(li, p);

            // BOTÓN ELIMINAR
            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = "🗑️ Eliminar";
            btnEliminar.className = "btn-eliminar";
            btnEliminar.onclick = async () => {
                if (confirm(`¿Seguro que deseas eliminar a ${p.nombre}?`)) {
                    const { error } = await _supabase.from('participantes').delete().eq('id', p.id);
                    if (!error) {
                        finanzas.ventas -= p.jugadas.length;
                        finanzas.recaudado = finanzas.ventas * 5;
                        await sincronizarFinanzas();
                        cargarDesdeSupabase();
                    }
                }
            };

            btnContainer.appendChild(btnEditar);
            btnContainer.appendChild(btnEliminar);
            li.appendChild(btnContainer);
            lista.appendChild(li);
        });
    }

    function habilitarEdicionFila(li, p) {
        li.innerHTML = '';
        const editDiv = document.createElement('div');
        editDiv.innerHTML = `
            <input type="text" id="edit-nombre-${p.id}" value="${p.nombre}" class="editable-input">
            <input type="text" id="edit-refe-${p.id}" value="${p.refe}" class="editable-input">
            <input type="text" id="edit-jugadas-${p.id}" value="${p.jugadas.join(' | ')}" class="editable-input" style="width:80%">
        `;

        const btnGuardar = document.createElement('button');
        btnGuardar.textContent = "💾 Guardar";
        btnGuardar.className = "btn-guardar";
        btnGuardar.onclick = async () => {
            const nuevoNombre = document.getElementById(`edit-nombre-${p.id}`).value.trim();
            const nuevaRefe = document.getElementById(`edit-refe-${p.id}`).value.trim();
            const nuevasJugadasRaw = document.getElementById(`edit-jugadas-${p.id}`).value.trim();
            const nuevasJugadas = nuevasJugadasRaw.split('|').map(j => j.trim());

            // Ajustar finanzas por el cambio
            finanzas.ventas = (finanzas.ventas - p.jugadas.length) + nuevasJugadas.length;
            finanzas.recaudado = finanzas.ventas * 5;

            const { error } = await _supabase.from('participantes').update({
                nombre: nuevoNombre,
                refe: nuevaRefe,
                jugadas: nuevasJugadas
            }).eq('id', p.id);

            if (!error) {
                await sincronizarFinanzas();
                cargarDesdeSupabase();
            }
        };

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = "❌ Cancelar";
        btnCancelar.onclick = () => renderParticipantes();

        editDiv.appendChild(btnGuardar);
        editDiv.appendChild(btnCancelar);
        li.appendChild(editDiv);
    }

    // ---------------------------------------------------------------------------------------
    // --- E. BUSCADOR Y RESUMEN ---
    // ---------------------------------------------------------------------------------------

    const inputBuscar = document.getElementById('input-buscar-participante');
    inputBuscar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = participantes.filter(p => 
            p.nombre.toLowerCase().includes(term) || 
            p.refe.toLowerCase().includes(term)
        );
        renderParticipantes(filtrados);
    });

    function actualizarResumenFinanzas() {
        document.getElementById('resumen-ventas').textContent = finanzas.ventas;
        document.getElementById('resumen-recaudado').textContent = finanzas.recaudado.toFixed(2) + " BS";
    }

    // ---------------------------------------------------------------------------------------
    // --- F. REINICIO Y BACKUP (DESHACER) ---
    // ---------------------------------------------------------------------------------------

    const btnReiniciar = document.getElementById('btn-reiniciar-datos');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', async () => {
            if (confirm("🚨 ¡ATENCIÓN! ¿Estás seguro de que deseas borrar TODOS los datos?")) {
                const claveReinicio = prompt("Ingresa la clave maestra para confirmar:");
                if (claveReinicio && CLAVES_VALIDAS.includes(claveReinicio.trim())) {
                    
                    // 1. Crear Backup local antes de borrar (en sessionStorage para el Deshacer)
                    sessionStorage.setItem('backupParticipantes', JSON.stringify(participantes));
                    sessionStorage.setItem('backupResultados', JSON.stringify(resultados));
                    sessionStorage.setItem('backupFinanzas', JSON.stringify(finanzas));

                    // 2. Borrar en Supabase
                    await _supabase.from('participantes').delete().neq('nro', 0);
                    await _supabase.from('resultados').delete().neq('id', 0);
                    
                    finanzas = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };
                    await sincronizarFinanzas();

                    alert("✅ Datos reiniciados. Puedes usar 'Deshacer' si fue un error.");
                    document.getElementById('btn-deshacer').style.display = 'inline-block';
                    cargarDesdeSupabase();
                } else {
                    alert("❌ Clave incorrecta.");
                }
            }
        });
    }

    // Botón Deshacer
    let btnDeshacer = document.getElementById('btn-deshacer');
    if (btnDeshacer) {
        btnDeshacer.addEventListener('click', async () => {
            const bP = JSON.parse(sessionStorage.getItem('backupParticipantes'));
            const bR = JSON.parse(sessionStorage.getItem('backupResultados'));
            const bF = JSON.parse(sessionStorage.getItem('backupFinanzas'));

            if (bP) {
                // Restaurar participantes (limpiando IDs para evitar conflictos)
                const pParaSubir = bP.map(({id, ...resto}) => resto);
                await _supabase.from('participantes').insert(pParaSubir);
                
                // Restaurar resultados
                const rParaSubir = bR.map(({id, ...resto}) => resto);
                await _supabase.from('resultados').insert(rParaSubir);

                finanzas = bF;
                await sincronizarFinanzas();

                sessionStorage.removeItem('backupParticipantes');
                btnDeshacer.style.display = 'none';
                alert("↩️ Datos restaurados con éxito.");
                cargarDesdeSupabase();
            }
        });
    }

    // Inicio del sistema
    iniciarBloqueo();
});