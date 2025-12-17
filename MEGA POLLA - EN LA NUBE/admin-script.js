document.addEventListener('DOMContentLoaded', async () => {

    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    const JUGADA_SIZE = 7; 

    // Bloqueo de acceso original
    let accesoConcedido = false;
    while (!accesoConcedido) {
        const clave = prompt("🔒 Acceso Restringido. Ingrese clave:");
        if (clave && CLAVES_VALIDAS.includes(clave.trim())) { accesoConcedido = true; }
        else { window.location.href = "index.html"; return; }
    }

    async function cargarYRenderizar() {
        const { data: res } = await _supabase.from('resultados').select('*');
        const { data: part } = await _supabase.from('participantes').select('*').order('id', { ascending: false });
        
        // Render Resultados con tu botón "Eliminar"
        const listaRes = document.getElementById('lista-resultados-admin');
        listaRes.innerHTML = (res || []).map(r => `
            <li><strong>${r.sorteo}:</strong> ${r.numero} 
            <button onclick="borrarR(${r.id})" class="btn-eliminar">Eliminar</button></li>
        `).join('');

        // Render Participantes con tu botón "Eliminar"
        const listaPart = document.getElementById('lista-participantes');
        listaPart.innerHTML = (part || []).map(p => `
            <li>ID: ${p.nro} | ${p.nombre} | ${p.refe} | Jugada: ${p.jugadas.join(',')}
            <button onclick="borrarP(${p.id})" class="btn-eliminar">Eliminar</button></li>
        `).join('');
    }

    // Funciones globales de borrado
    window.borrarR = async (id) => { await _supabase.from('resultados').delete().eq('id', id); location.reload(); };
    window.borrarP = async (id) => { await _supabase.from('participantes').delete().eq('id', id); location.reload(); };

    // Formulario de Participante (Tu lógica exacta de la barra '|')
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nro = document.getElementById('correlativo').value;
        const nombre = document.getElementById('nombre-participante').value;
        const refe = document.getElementById('referencia').value;
        const jugadasRaw = document.getElementById('jugadas-procesadas').value;
        
        const grupos = jugadasRaw.split('|');
        for (let grupo of grupos) {
            const listaNumeros = grupo.split(',').map(n => n.trim()).filter(n => n !== "");
            await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas: listaNumeros }]);
        }

        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ 
            ventas: (fin.ventas || 0) + grupos.length, 
            recaudado: (fin.recaudado || 0) + (grupos.length * 10) 
        }).eq('id', 1);

        location.reload();
    });

    // Formulario de Resultados
    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        await _supabase.from('resultados').insert([{ 
            sorteo: document.getElementById('sorteo-nombre').value, 
            numero: document.getElementById('numero-ganador').value 
        }]);
        location.reload();
    });

    // Reinicio Total
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        if (confirm("¿Seguro que deseas borrar TODO?")) {
            await _supabase.from('resultados').delete().neq('id', 0);
            await _supabase.from('participantes').delete().neq('id', 0);
            await _supabase.from('finanzas').update({ ventas: 0, recaudado: 0 }).eq('id', 1);
            location.reload();
        }
    });

    cargarYRenderizar();
});