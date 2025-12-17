document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const CLAVES_VALIDAS = ['29931335', '24175402'];

    // Bloqueo original
    const clave = prompt("🔒 Acceso Restringido. Ingrese clave:");
    if (!clave || !CLAVES_VALIDAS.includes(clave.trim())) {
        alert("Clave incorrecta");
        window.location.href = "index.html";
        return;
    }

    // Guardar Resultado
    document.getElementById('form-resultados').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sorteo = document.getElementById('sorteo-nombre').value;
        const numero = document.getElementById('numero-ganador').value;
        await _supabase.from('resultados').insert([{ sorteo, numero }]);
        alert("✅ Resultado publicado en la nube");
        location.reload();
    });

    // Guardar Participante
    document.getElementById('form-participante').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nro = document.getElementById('correlativo').value;
        const nombre = document.getElementById('nombre-participante').value;
        const refe = document.getElementById('referencia').value;
        const jugadas = document.getElementById('jugadas-procesadas').value.split(',').map(n => n.trim());

        await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas }]);
        
        // Actualizar Finanzas
        const { data: fin } = await _supabase.from('finanzas').select('*').single();
        await _supabase.from('finanzas').update({ 
            ventas: (fin.ventas || 0) + 1, 
            recaudado: (fin.recaudado || 0) + 10 
        }).eq('id', 1);

        alert("✅ Participante registrado con éxito");
        location.reload();
    });

    // Reiniciar
    document.getElementById('btn-reiniciar-datos').addEventListener('click', async () => {
        if (confirm("¿Estás seguro de borrar TODOS los datos?")) {
            const pass = prompt("Ingrese clave para confirmar:");
            if (CLAVES_VALIDAS.includes(pass)) {
                await _supabase.from('resultados').delete().neq('id', 0);
                await _supabase.from('participantes').delete().neq('id', 0);
                await _supabase.from('finanzas').update({ ventas: 0, recaudado: 0 }).eq('id', 1);
                alert("🗑️ Sistema reiniciado");
                location.reload();
            }
        }
    });
});