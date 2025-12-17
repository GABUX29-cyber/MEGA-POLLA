document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const CLAVES_VALIDAS = ['29931335', '24175402'];

    const clave = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!clave || !CLAVES_VALIDAS.includes(clave.trim())) {
        window.location.href = "index.html";
        return;
    }

    async function cargar() {
        const { data: res } = await _supabase.from('resultados').select('*');
        const { data: part } = await _supabase.from('participantes').select('*');
        
        document.getElementById('lista-resultados-admin').innerHTML = (res || []).map(r => `<li>${r.sorteo}: ${r.numero} <button onclick="borrarR(${r.id})">x</button></li>`).join('');
        document.getElementById('lista-participantes').innerHTML = (part || []).map(p => `<li>${p.nombre} - ${p.jugadas} <button onclick="borrarP(${p.id})">x</button></li>`).join('');
    }

    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        await _supabase.from('resultados').insert([{ sorteo: document.getElementById('sorteo-nombre').value, numero: document.getElementById('numero-ganador').value }]);
        location.reload();
    });

    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const jugadas = document.getElementById('jugadas-procesadas').value.split(',').map(n => n.trim());
        await _supabase.from('participantes').insert([{ nro: document.getElementById('correlativo').value, nombre: document.getElementById('nombre-participante').value, refe: document.getElementById('referencia').value, jugadas }]);
        
        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ ventas: fin.ventas + 1, recaudado: fin.recaudado + 10 }).eq('id', 1);
        location.reload();
    });

    window.borrarR = async (id) => { await _supabase.from('resultados').delete().eq('id', id); location.reload(); };
    window.borrarP = async (id) => { await _supabase.from('participantes').delete().eq('id', id); location.reload(); };

    cargar();
});