document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const CLAVES_VALIDAS = ['29931335', '24175402'];

    // Bloqueo de acceso original
    const clave = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!clave || !CLAVES_VALIDAS.includes(clave.trim())) { window.location.href = "index.html"; return; }

    async function cargar() {
        const { data: res } = await _supabase.from('resultados').select('*');
        const { data: part } = await _supabase.from('participantes').select('*').order('id', { ascending: false });
        
        document.getElementById('lista-resultados-admin').innerHTML = (res || []).map(r => `
            <li>${r.sorteo}: ${r.numero} <button onclick="borrarR(${r.id})" class="btn-eliminar">Eliminar</button></li>`).join('');

        document.getElementById('lista-participantes').innerHTML = (part || []).map(p => `
            <li>${p.nombre} (${p.nro}) - [${p.jugadas}] <button onclick="borrarP(${p.id})" class="btn-eliminar">Eliminar</button></li>`).join('');
    }

    // Lógica de pegado masivo con "|" restaurada
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nro = document.getElementById('correlativo').value;
        const nombre = document.getElementById('nombre-participante').value;
        const refe = document.getElementById('referencia').value;
        const texto = document.getElementById('jugadas-procesadas').value;

        const bloques = texto.split('|');
        for (let bloque of bloques) {
            const numeros = bloque.split(',').map(n => n.trim()).filter(n => n !== "");
            if (numeros.length > 0) {
                await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas: numeros }]);
            }
        }

        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ 
            ventas: fin.ventas + bloques.length, 
            recaudado: fin.recaudado + (bloques.length * 10) 
        }).eq('id', 1);

        location.reload();
    });

    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        await _supabase.from('resultados').insert([{ 
            sorteo: document.getElementById('sorteo-nombre').value, 
            numero: document.getElementById('numero-ganador').value 
        }]);
        location.reload();
    });

    window.borrarR = async (id) => { await _supabase.from('resultados').delete().eq('id', id); location.reload(); };
    window.borrarP = async (id) => { await _supabase.from('participantes').delete().eq('id', id); location.reload(); };

    cargar();
});