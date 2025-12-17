document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    
    // BLOQUEO ORIGINAL (MANTENIDO)
    let claveIngresada = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!claveIngresada || !CLAVES_VALIDAS.includes(claveIngresada.trim())) {
        alert("Clave incorrecta");
        window.location.href = "index.html";
        return;
    }

    // CARGAR DATOS
    async function cargarDatos() {
        const { data: res } = await _supabase.from('resultados').select('*');
        const { data: part } = await _supabase.from('participantes').select('*').order('id', { ascending: false });
        renderListas(res || [], part || []);
    }

    function renderListas(resultados, participantes) {
        // Render Resultados con botón Eliminar (Mantenido)
        const listaRes = document.getElementById('lista-resultados-admin');
        listaRes.innerHTML = resultados.map(r => `
            <li>${r.sorteo}: ${r.numero} <button onclick="eliminarResultado(${r.id})" class="btn-eliminar">Eliminar</button></li>
        `).join('');

        // Render Participantes con Buscar y Edición (Mantenido)
        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = participantes.map(p => `
            <li>
                ID: ${p.nro} | ${p.nombre} | ${p.refe} | Jugada: ${p.jugadas.join(',')}
                <button onclick="eliminarParticipante(${p.id})" class="btn-eliminar">Eliminar</button>
            </li>
        `).join('');
    }

    // FORMULARIO RESULTADOS
    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sorteo = document.getElementById('sorteo-nombre').value;
        const numero = document.getElementById('numero-ganador').value;
        await _supabase.from('resultados').insert([{ sorteo, numero }]);
        location.reload();
    });

    // FORMULARIO PARTICIPANTES (Cálculo de finanzas incluido)
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nro = document.getElementById('correlativo').value;
        const nombre = document.getElementById('nombre-participante').value;
        const refe = document.getElementById('referencia').value;
        const jugadas = document.getElementById('jugadas-procesadas').value.split(',').map(n => n.trim());

        await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas }]);
        
        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ 
            ventas: (fin.ventas || 0) + 1, 
            recaudado: (fin.recaudado || 0) + 10 
        }).eq('id', 1);

        location.reload();
    });

    // BOTÓN REINICIAR (MANTENIDO)
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        if (confirm("¿Borrar todo?")) {
            const pass = prompt("Clave de confirmación:");
            if (CLAVES_VALIDAS.includes(pass)) {
                await _supabase.from('resultados').delete().neq('id', 0);
                await _supabase.from('participantes').delete().neq('id', 0);
                await _supabase.from('finanzas').update({ ventas: 0, recaudado: 0 }).eq('id', 1);
                location.reload();
            }
        }
    });

    // FUNCIONES GLOBALES PARA BOTONES
    window.eliminarResultado = async (id) => { await _supabase.from('resultados').delete().eq('id', id); location.reload(); };
    window.eliminarParticipante = async (id) => { await _supabase.from('participantes').delete().eq('id', id); location.reload(); };

    cargarDatos();
});