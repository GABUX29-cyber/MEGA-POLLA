const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('pass').value;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert("Error: " + error.message);
    else {
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
    }
}

async function subirResultado() {
    const sorteo = document.getElementById('sorteo').value;
    const numero = document.getElementById('numero').value;
    if(!sorteo || !numero) return alert("Llena los campos");

    await _supabase.from('resultados').insert([{ sorteo, numero }]);
    alert("Resultado guardado");
    location.reload();
}

async function subirParticipante() {
    const nro = document.getElementById('p-nro').value;
    const nombre = document.getElementById('p-nombre').value;
    const refe = document.getElementById('p-refe').value;
    const jugadasRaw = document.getElementById('p-jugadas').value;
    
    const jugadas = jugadasRaw.split(',').map(n => n.trim());
    if(jugadas.length !== 7) return alert("Deben ser exactamente 7 números");

    await _supabase.from('participantes').insert([{ nro, nombre, refe, jugadas }]);
    
    // Actualizar contador de ventas automáticamente
    const { data: fin } = await _supabase.from('finanzas').select('*').single();
    await _supabase.from('finanzas').update({ 
        ventas: fin.ventas + 1, 
        recaudado: fin.recaudado + 10 // Asumiendo 10 por jugada, ajusta el precio aquí
    }).eq('id', 1);

    alert("Participante guardado");
    location.reload();
}

async function reiniciarTodo() {
    if(confirm("¿Estás seguro de borrar TODO para iniciar una nueva jornada?")) {
        await _supabase.from('resultados').delete().neq('id', 0);
        await _supabase.from('participantes').delete().neq('id', 0);
        await _supabase.from('finanzas').update({ ventas: 0, recaudado: 0 }).eq('id', 1);
        alert("Sistema reiniciado");
        location.reload();
    }
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}