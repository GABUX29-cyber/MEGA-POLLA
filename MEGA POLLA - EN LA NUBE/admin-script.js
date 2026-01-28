// Agregamos 'async' aquí para que la encriptación funcione
document.addEventListener('DOMContentLoaded', async () => {

    // ---------------------------------------------------------------------------------------
    // --- CONSTANTES Y CONFIGURACIÓN ---
    // ---------------------------------------------------------------------------------------
    // YA NO HAY CLAVES VISIBLES. Solo sus huellas digitales (Hashes SHA-256)
    const HASHES_AUTORIZADOS = [
        '47644265406082467f564f8990d0910901e82846171542f7d988898b1ba420c1',
        'a9f456073f32f3068f946894548d886653133e8a4a5840939f4174d82f768568'
    ];
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
            if (num === "00") return "00";
            if (parseInt(num) === 0) return "O"; 
            return num;
        });

        let avisos = [];
        let avisosAlert = [];

        if (numeros.length > JUGADA_SIZE) {
            let eliminados = [];
            while (numeros.length > JUGADA_SIZE) {
                eliminados.push(numeros.pop());
            }
            let msg = `Se eliminó el sobrante (${eliminados.join(', ')})`;
            avisos.push(msg);
            avisosAlert.push(`⚠️ ${msg}`);
        }

        if (numeros.length < JUGADA_SIZE) {
            alert(`❌ ERROR en ${nombreParticipante}: Solo tiene ${numeros.length} números.`);
            return null;
        }

        let counts = {};
        let duplicadosEncontrados = [];
        numeros.forEach(n => counts[n] = (counts[n] || 0) + 1);
        
        for (let n in counts) {
            if (counts[n] > 1) {
                duplicadosEncontrados.push(n);
            }
        }

        if (duplicadosEncontrados.length > 0) {
            let sePudoCorregir = true;
            duplicadosEncontrados.forEach(dup => {
                if (!numeros.includes("36")) {
                    let index = numeros.lastIndexOf(dup);
                    numeros[index] = "36";
                    let msg = `Duplicado (${dup}) reemplazado por 36`;
                    avisos.push(msg);
                    avisosAlert.push(`🔄 ${msg}`);
                } else {
                    sePudoCorregir = false;
                }
            });

            if (!sePudoCorregir) {
                alert(`🚫 JUGADA NULA (${nombreParticipante}): Hay duplicados (${duplicadosEncontrados.join(', ')}) y el 36 ya existe.`);
                return null;
            }
        }

        if (avisosAlert.length > 0) {
            alert(`📝 CAMBIOS AUTOMÁTICOS EN ${nombreParticipante}:\n\n${avisosAlert.join('\n')}`);
        }

        return { 
            numeros: numeros, 
            nota: avisos.length > 0 ? `📝 Auto-corrección: ${avisos.join('. ')}` : "" 
        };
    }

    // ---------------------------------------------------------------------------------------
    // --- 2. CARGA Y ACTUALIZACIÓN EN SUPABASE ---
    // ---------------------------------------------------------------------------------------
    async function cargarDatosDesdeNube() {
        try {
            const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
            const { data: r } = await _supabase.from('resultados').select('*').order('id', { ascending: false });
            const { data: f } = await _supabase.from('finanzas').select('*').single();

            if (p) participantes = p;
            if (r) resultados = r;
            if (f) finanzas = f;

            if (p && f && p.length !== f.ventas) {
                await _supabase.from('finanzas').update({ ventas: p.length }).eq('id', 1);
                finanzas.ventas = p.length;
            }

            renderizarTodo();
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    }

    // ---------------------------------------------------------------------------------------
    // --- 3. FUNCIONES DE EDICIÓN ---
    // ---------------------------------------------------------------------------------------
    
    window.editarResultadoNube = async (id, sorteoActual, numeroActual) => {
        const nuevoNumeroRaw = prompt(`Editar resultado para ${sorteoActual}:`, numeroActual);
        if (nuevoNumeroRaw === null || nuevoNumeroRaw.trim() === "") return;

        let numFinal = (nuevoNumeroRaw === "0" || (parseInt(nuevoNumeroRaw) === 0 && nuevoNumeroRaw !== "00")) ? "O" : nuevoNumeroRaw.trim().padStart(2, '0');

        const { error } = await _supabase
            .from('resultados')
            .update({ numero: numFinal })
            .eq('id', id);

        if (error) alert("Error al editar resultado");
        else cargarDatosDesdeNube();
    };

    window.editarParticipanteNube = async (id, nombreAct, refeAct, jugadasAct) => {
        const nuevoNombre = prompt("Nombre:", nombreAct);
        if (nuevoNombre === null) return;
        const nuevasJugadasStr = prompt("Jugadas (separadas por coma):", jugadasAct);
        if (nuevasJugadasStr === null) return;
        const motivo = prompt("Motivo de la edición (ej: Error en REFE):", "Manual");

        const notaEdicion = `⚠️ Editado: ${motivo}`;

        const { error } = await _supabase
            .from('participantes')
            .update({ 
                nombre: nuevoNombre, 
                jugadas: nuevasJugadasStr.split(','),
                notas_correccion: notaEdicion 
            })
            .eq('id', id);

        if (error) alert("Error al editar participante");
        else cargarDatosDesdeNube();
    };

    window.eliminarParticipanteNube = async (id) => {
        if (confirm("¿Eliminar definitivamente a este participante?")) {
            await _supabase.from('participantes').delete().eq('id', id);
            cargarDatosDesdeNube();
        }
    };

    // ---------------------------------------------------------------------------------------
    // --- 4. GESTIÓN DE FORMULARIOS ---
    // ---------------------------------------------------------------------------------------

    document.getElementById('form-finanzas').addEventListener('submit', async (e) => {
        e.preventDefault();
        finanzas.ventas = parseInt(document.getElementById('input-ventas').value);
        finanzas.recaudado = parseFloat(document.getElementById('input-recaudado').value);
        finanzas.acumulado1 = parseFloat(document.getElementById('input-acumulado').value);
        
        const { error } = await _supabase.from('finanzas').update(finanzas).eq('id', 1);
        if (error) alert("Error al actualizar finanzas");
        else { alert("✅ Finanzas actualizadas."); cargarDatosDesdeNube(); }
    });

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

    document.getElementById('btn-procesar-pegado').addEventListener('click', () => {
        const rawData = document.getElementById('input-paste-data').value;
        const lineas = rawData.split('\n').map(l => l.trim()).filter(l => l !== "");
        let jugadasFinales = [];
        let nombre = "Sin Nombre", refe = "";

        lineas.forEach(linea => {
            const matches = linea.match(/\b\d{1,2}\b/g);
            if (matches && matches.length >= 5) {
                for (let i = 0; i < matches.length; i += JUGADA_SIZE) {
                    let grupo = matches.slice(i, i + JUGADA_SIZE);
                    if (grupo.length >= 5) {
                        jugadasFinales.push(grupo.join(','));
                    }
                }
            } else if (linea.toLowerCase().includes("refe") || linea.toLowerCase().includes("identificación")) {
                refe = linea.replace(/\D/g, "");
            } else if (linea.length > 3 && !refe) {
                nombre = linea.toUpperCase();
            }
        });

        document.getElementById('nombre').value = nombre;
        document.getElementById('refe').value = refe;
        document.getElementById('jugadas-procesadas').value = jugadasFinales.join(' | ');

        alert("✅ DATOS PROCESADOS AL RECUADRO\n\nPor favor, revisa el Nombre, el REFE y las Jugadas antes de presionar el botón de Registrar.");
    });

    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreBase = document.getElementById('nombre').value.trim();
        const refe = document.getElementById('refe').value.trim();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|').map(s => s.trim()).filter(s => s !== "");

        if (!refe) return alert("El REFE es obligatorio");

        for (let jugadaStr of jugadasRaw) {
            let numSucios = jugadaStr.split(/[,/]/).map(n => n.trim()).filter(n => n !== "");
            let procesado = procesarYValidarJugada(numSucios, nombreBase);

            if (procesado) {
                const { count } = await _supabase.from('participantes').select('*', { count: 'exact', head: true });
                const proximoNro = (count || 0) + 1;

                const nuevaJugada = {
                    nro: proximoNro,
                    nombre: nombreBase,
                    refe: refe,
                    jugadas: procesado.numbers || procesado.numeros,
                    notas_correccion: procesado.nota
                };

                await _supabase.from('participantes').insert([nuevaJugada]);
            }
        }
        e.target.reset();
        document.getElementById('input-paste-data').value = ""; 
        cargarDatosDesdeNube(); 
    });

    // ---------------------------------------------------------------------------------------
    // --- 5. RENDERIZADO ---
    // ---------------------------------------------------------------------------------------
    function renderizarTodo() {
        const inputVentas = document.getElementById('input-ventas');
        if (inputVentas) inputVentas.value = participantes.length;

        const inputRecaudado = document.getElementById('input-recaudado');
        if (inputRecaudado) inputRecaudado.value = finanzas.recaudado;

        const inputAcumulado = document.getElementById('input-acumulado');
        if (inputAcumulado) inputAcumulado.value = finanzas.acumulado1;

        const montoCasa = (finanzas.recaudado * 0.20).toFixed(2);
        const montoDomingo = (finanzas.recaudado * 0.05).toFixed(2);
        
        const elCasa = document.getElementById('casa-valor');
        if (elCasa) elCasa.textContent = `${montoCasa} BS`;

        const elDomingo = document.getElementById('domingo-valor');
        if (elDomingo) elDomingo.textContent = `${montoDomingo} BS`;

        const listaRes = document.getElementById('lista-resultados');
        listaRes.innerHTML = '';
        resultados.forEach((res) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${res.sorteo}: <strong>${res.numero}</strong></span> 
                <div>
                    <button class="btn-editar" onclick="editarResultadoNube(${res.id}, '${res.sorteo}', '${res.numero}')">Editar</button>
                    <button class="btn-eliminar" onclick="eliminarResultadoNube(${res.id})">Eliminar</button>
                </div>`;
            listaRes.appendChild(li);
        });

        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = '';
        participantes.forEach(p => {
            const li = document.createElement('li');
            const aviso = p.notas_correccion ? `<div style="color:red; font-size:0.8em;">${p.notas_correccion}</div>` : "";
            li.innerHTML = `
                <div style="flex-grow:1;">
                    <strong>#${p.nro} - ${p.nombre}</strong> (${p.refe}) <br>
                    <small>${p.jugadas.join(', ')}</small>
                    ${aviso}
                </div>
                <div>
                    <button class="btn-editar" onclick="editarParticipanteNube(${p.id}, '${p.nombre}', '${p.refe}', '${p.jugadas}')">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarParticipanteNube(${p.id})">🗑️</button>
                </div>`;
            listaPart.appendChild(li);
        });
    }

    window.eliminarResultadoNube = async (id) => {
        if (confirm("¿Eliminar este resultado?")) {
            await _supabase.from('resultados').delete().eq('id', id);
            cargarDatosDesdeNube();
        }
    };

    // ---------------------------------------------------------------------------------------
    // --- 6. BLOQUEO INICIAL CON SEGURIDAD HASH ---
    // ---------------------------------------------------------------------------------------
    async function verificarAcceso() {
        const claveAcceso = prompt("🔒 Ingrese clave de administrador:");
        
        if (!claveAcceso) {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;padding-top:50px;'>Acceso Denegado</h1>";
            return;
        }

        // Proceso de Encriptación
        const encoder = new TextEncoder();
        const data = encoder.encode(claveAcceso.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (!HASHES_AUTORIZADOS.includes(hashHex)) {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;padding-top:50px;'>Acceso Denegado</h1>";
        } else {
            // MOSTRAR PANEL: Quita el display:none
            const adminPanel = document.querySelector('.admin-section');
            if (adminPanel) adminPanel.style.display = 'block';
            
            // Cargar datos reales
            cargarDatosDesdeNube();
        }
    }

    // Ejecutamos la validación al cargar
    await verificarAcceso();
});