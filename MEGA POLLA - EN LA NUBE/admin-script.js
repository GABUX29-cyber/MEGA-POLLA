document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];

    // --- BLOQUEO ORIGINAL ---
    let accesoConcedido = false;
    while (!accesoConcedido) {
        const clave = prompt("🔒 Acceso Restringido. Ingrese clave:");
        if (clave && CLAVES_VALIDAS.includes(clave.trim())) {
            accesoConcedido = true;
        } else {
            alert("Clave incorrecta.");
            window.location.href = "index.html";
            return;
        }
    }

    // --- CARGA Y RENDERIZADO (Con tus estilos de botones) ---
    async function cargarYRenderizar() {
        const { data: resultados } = await _supabase.from('resultados').select('*');
        const { data: participantes } = await _supabase.from('participantes').select('*').order('id', { ascending: false });
        
        // Render Resultados
        const listaRes = document.getElementById('lista-resultados-admin');
        listaRes.innerHTML = (resultados || []).map(r => `
            <li>${r.sorteo}: ${r.numero} <button onclick="borrarRes(${r.id})" class="btn-eliminar">Eliminar</button></li>
        `).join('');

        // Render Participantes (Con tu lógica de Edición/Borrado)
        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = (participantes || []).map(p => `
            <li id="part-${p.id}">
                ID: ${p.nro} | ${p.nombre} | ${p.refe} | Jugada: ${p.jugadas.join(',')}
                <button onclick="borrarPart(${p.id})" class="btn-eliminar">Eliminar</button>
            </li>
        `).join('');
    }

    // --- FUNCIONES DE ACCIÓN ---
    window.borrarRes = async (id) => {
        await _supabase.from('resultados').delete().eq('id', id);
        location.reload();
    };

    window.borrarPart = async (id) => {
        await _supabase.from('participantes').delete().eq('id', id);
        location.reload();
    };

    // Formulario de Participante (Tu lógica de procesamiento de '|' y finanzas)
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nro = document.getElementById('correlativo').value;
        const nombre = document.getElementById('nombre-participante').value;
        const refe = document.getElementById('referencia').value;
        const jugadasRaw = document.getElementById('jugadas-procesadas').value;
        
        // Soporte para múltiples jugadas con '|'
        const grupos = jugadasRaw.split('|');
        for (let grupo of grupos) {
            const listaNumeros = grupo.split(',').map(n => n.trim());
            await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas: listaNumeros }]);
        }

        // Actualizar Finanzas
        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ 
            ventas: (fin.ventas || 0) + grupos.length, 
            recaudado: (fin.recaudado || 0) + (grupos.length * 10) 
        }).eq('id', 1);

        alert("✅ Registrado con éxito");
        location.reload();
    });

    // Formulario de Resultados
    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sorteo = document.getElementById('sorteo-nombre').value;
        const numero = document.getElementById('numero-ganador').value;
        await _supabase.from('resultados').insert([{ sorteo, numero }]);
        location.reload();
    });

    // Botón Reiniciar
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        if (confirm("¿Reiniciar todo?")) {
            const pass = prompt("Clave de confirmación:");
            if (CLAVES_VALIDAS.includes(pass)) {
                await _supabase.from('resultados').delete().neq('id', 0);
                await _supabase.from('participantes').delete().neq('id', 0);
                await _supabase.from('finanzas').update({ ventas: 0, recaudado: 0 }).eq('id', 1);
                location.reload();
            }
        }
    });

    cargarYRenderizar();
});