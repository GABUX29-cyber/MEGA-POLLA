document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado: 0.00 };

    // --- BLOQUEO DE ACCESO ---
    const claveAcceso = prompt("🔒 Acceso Administrativo\nIngrese su clave:");
    if (!CLAVES_VALIDAS.includes(claveAcceso)) {
        alert("Acceso denegado");
        window.location.href = "index.html";
    }

    // --- FUNCIONES DE NUBE (TABLA ÚNICA) ---
    async function cargarTodo() {
        const { data, error } = await _supabase.from('polla_datos').select('*');
        if (error) return console.error("Error al cargar:", error);

        data.forEach(item => {
            if (item.tipo === 'participantes') participantes = item.contenido || [];
            if (item.tipo === 'resultados') resultados = item.contenido || [];
            if (item.tipo === 'finanzas') finanzas = item.contenido || finanzas;
        });
        renderizar();
    }

    async function actualizarNube(tipo, contenido) {
        await _supabase.from('polla_datos').upsert({ tipo, contenido }, { onConflict: 'tipo' });
    }

    // --- PROCESADOR WHATSAPP ---
    document.getElementById('btn-procesar-pegado').onclick = () => {
        const texto = document.getElementById('input-paste-data').value;
        const lineas = texto.split('\n');
        let nombre = "", refe = "", jugadasDetectadas = [];

        lineas.forEach(linea => {
            const numeros = linea.match(/\b\d{2}\b/g);
            if (numeros && numeros.length >= 7) {
                jugadasDetectadas.push(numeros.slice(0, 7).join(','));
            } else if (linea.toLowerCase().includes("refe:")) {
                refe = linea.match(/\d+/) ? linea.match(/\d+/)[0] : "";
            } else if (linea.length > 3 && isNaN(linea[0])) {
                nombre = linea.trim().toUpperCase();
            }
        });

        document.getElementById('nombre').value = nombre;
        document.getElementById('refe').value = refe;
        document.getElementById('jugadas-procesadas').value = jugadasDetectadas.join(' | ');
    };

    // --- REGISTRO DE JUGADA ---
    document.getElementById('form-participante').onsubmit = async (e) => {
        e.preventDefault();
        const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');
        
        jugadasRaw.forEach(grupo => {
            const nums = grupo.split(',').map(n => n.trim());
            if (nums.length === 7) {
                participantes.push({
                    nombre: document.getElementById('nombre').value.toUpperCase(),
                    refe: document.getElementById('refe').value,
                    jugada: nums
                });
            }
        });

        await actualizarNube('participantes', participantes);
        cargarTodo();
        e.target.reset();
        document.getElementById('input-paste-data').value = "";
    };

    // --- RESULTADOS ---
    document.getElementById('form-resultados').onsubmit = async (e) => {
        e.preventDefault();
        resultados.push({
            sorteo: document.getElementById('sorteo-hora').value,
            numero: document.getElementById('numero-ganador').value.padStart(2, '0')
        });
        await actualizarNube('resultados', resultados);
        cargarTodo();
        e.target.reset();
    };

    // --- FINANZAS ---
    document.getElementById('form-finanzas').onsubmit = async (e) => {
        e.preventDefault();
        finanzas.ventas = document.getElementById('input-ventas').value;
        finanzas.recaudado = document.getElementById('input-recaudado').value;
        finanzas.acumulado = document.getElementById('input-acumulado').value;
        await actualizarNube('finanzas', finanzas);
        alert("💰 Finanzas sincronizadas");
    };

    function renderizar() {
        const listaP = document.getElementById('lista-participantes');
        listaP.innerHTML = participantes.map((p, i) => `
            <li style="background:#f4f4f4; padding:8px; margin-bottom:5px; border-radius:5px;">
                <strong>${p.nombre}</strong> (${p.refe}) <br>
                <small>N°s: ${p.jugada.join('-')}</small>
                <button onclick="borrarP(${i})" style="float:right; color:red;">Eliminar</button>
            </li>
        `).join('');

        const listaR = document.getElementById('lista-resultados');
        listaR.innerHTML = resultados.map((r, i) => `
            <li>${r.sorteo}: <strong>${r.numero}</strong> <button onclick="borrarR(${i})">x</button></li>
        `).join('');
    }

    window.borrarP = async (i) => { participantes.splice(i, 1); await actualizarNube('participantes', participantes); cargarTodo(); };
    window.borrarR = async (i) => { resultados.splice(i, 1); await actualizarNube('resultados', resultados); cargarTodo(); };

    cargarTodo();
});