document.addEventListener('DOMContentLoaded', async () => {
    const CLAVES_VALIDAS = ['29931335', '24175402'];
    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado1: 0.00 };

    // --- CARGA DESDE SUPABASE ---
    async function cargarDatos() {
        const { data: p } = await _supabase.from('participantes').select('*').order('nro', { ascending: true });
        const { data: r } = await _supabase.from('resultados').select('*');
        const { data: f } = await _supabase.from('finanzas').select('*').eq('id', 1).single();
        if (p) participantes = p;
        if (r) resultados = r;
        if (f) {
            finanzas = f;
            document.getElementById('input-ventas').value = f.ventas;
            document.getElementById('input-recaudado').value = f.recaudado;
            document.getElementById('input-acumulado').value = f.acumulado1;
        }
        renderResultados();
        renderParticipantes();
    }

    // --- GUARDAR EN SUPABASE ---
    async function guardarYRenderizar() {
        // Actualizar Finanzas
        await _supabase.from('finanzas').upsert({ id: 1, ...finanzas });
        
        // Sincronizar Participantes (Borrar y Reinsertar para mantener orden y simplicidad)
        await _supabase.from('participantes').delete().neq('id', 0);
        const pToInsert = participantes.map(({id, ...p}) => p);
        if (pToInsert.length > 0) await _supabase.from('participantes').insert(pToInsert);

        // Sincronizar Resultados
        await _supabase.from('resultados').delete().neq('id', 0);
        const rToInsert = resultados.map(({id, ...r}) => r);
        if (rToInsert.length > 0) await _supabase.from('resultados').insert(rToInsert);

        renderResultados();
        renderParticipantes();
    }

    // --- FUNCIONES ORIGINALES (Adaptadas a Supabase) ---
    document.getElementById('form-finanzas').addEventListener('submit', (e) => {
        e.preventDefault();
        finanzas.ventas = parseInt(document.getElementById('input-ventas').value);
        finanzas.recaudado = parseFloat(document.getElementById('input-recaudado').value);
        finanzas.acumulado1 = parseFloat(document.getElementById('input-acumulado').value);
        guardarYRenderizar();
        alert("Finanzas actualizadas");
    });

    document.getElementById('form-resultados').addEventListener('submit', (e) => {
        e.preventDefault();
        const sorteo = document.getElementById('select-sorteo').value;
        const numero = document.getElementById('input-numero').value.trim();
        const index = resultados.findIndex(r => r.sorteo === sorteo);
        if (index !== -1) resultados[index].numero = numero;
        else resultados.push({ sorteo, numero });
        guardarYRenderizar();
    });

    document.getElementById('form-participantes').addEventListener('submit', (e) => {
        e.preventDefault();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');
        jugadasRaw.forEach(jugada => {
            const numeros = jugada.split(',').map(n => n.trim());
            participantes.push({
                nombre: document.getElementById('nombre-participante').value.trim(),
                refe: document.getElementById('refe-participante').value.trim(),
                jugadas: numeros,
                nro: participantes.length + 1
            });
        });
        guardarYRenderizar();
        document.getElementById('form-participantes').reset();
    });

    // Función eliminar (Global para el botón)
    window.eliminarParticipante = async (index) => {
        const clave = prompt("Ingresa clave para eliminar:");
        if (CLAVES_VALIDAS.includes(clave)) {
            participantes.splice(index, 1);
            await guardarYRenderizar();
        }
    };

    function renderResultados() {
        const lista = document.getElementById('lista-resultados');
        lista.innerHTML = resultados.map(r => `<li>${r.sorteo}: <strong>${r.numero}</strong></li>`).join('');
    }

    function renderParticipantes() {
        const lista = document.getElementById('lista-participantes');
        lista.innerHTML = participantes.map((p, i) => `
            <li>${p.nro}. ${p.nombre} - [${p.jugadas.join(',')}] 
                <button class="btn-eliminar" onclick="eliminarParticipante(${i})">Eliminar</button>
            </li>
        `).join('');
    }

    // Reiniciar
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        if (confirm("¿BORRAR TODO?") && CLAVES_VALIDAS.includes(prompt("Clave:"))) {
            participantes = []; resultados = []; finanzas = { ventas: 0, recaudado: 0, acumulado1: 0 };
            await guardarYRenderizar();
        }
    });

    cargarDatos();
});