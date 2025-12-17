document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIGURACIÓN DE CONEXIÓN ---
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado: 0.00 };

    // --- 2. BLOQUEO DE SEGURIDAD ---
    const claveAcceso = prompt("🔒 Acceso Administrativo\nIngrese su clave:");
    if (!CLAVES_VALIDAS.includes(claveAcceso)) {
        alert("Acceso denegado");
        window.location.href = "index.html";
        return;
    }

    // --- 3. FUNCIONES DE CARGA Y GUARDADO EN SUPABASE ---
    async function cargarDatosDesdeNube() {
        const { data, error } = await _supabase.from('polla_datos').select('*');
        if (error) {
            console.error("Error al cargar datos:", error);
            return;
        }

        // Limpiamos antes de asignar
        participantes = [];
        resultados = [];

        data.forEach(item => {
            if (item.tipo === 'participantes') participantes = item.contenido || [];
            if (item.tipo === 'resultados') resultados = item.contenido || [];
            if (item.tipo === 'finanzas') finanzas = item.contenido || finanzas;
        });
        renderTodo();
    }

    async function guardarEnNube(tipo, contenido) {
        const { error } = await _supabase
            .from('polla_datos')
            .upsert({ tipo: tipo, contenido: contenido }, { onConflict: 'tipo' });
        
        if (error) console.error("Error al guardar:", error);
    }

    // --- 4. PROCESADOR DE WHATSAPP ---
    const btnProcesar = document.getElementById('btn-procesar-pegado');
    if (btnProcesar) {
        btnProcesar.onclick = () => {
            const texto = document.getElementById('input-paste-data').value;
            const lineas = texto.split('\n');
            let nombre = "", refe = "", jugadas = [];

            lineas.forEach(l => {
                const nums = l.match(/\b\d{2}\b/g);
                if (nums && nums.length >= 7) {
                    jugadas.push(nums.slice(0, 7).join(','));
                } else if (l.toLowerCase().includes("refe:") || l.toLowerCase().includes("identificación:")) {
                    refe = l.match(/\d+/) ? l.match(/\d+/)[0] : "";
                } else if (l.length > 3 && isNaN(l[0]) && !nombre) {
                    nombre = l.trim().toUpperCase();
                }
            });

            document.getElementById('nombre').value = nombre;
            document.getElementById('refe').value = refe;
            document.getElementById('jugadas-procesadas').value = jugadas.join(' | ');
        };
    }

    // --- 5. REGISTRO DE PARTICIPANTES ---
    const formPart = document.getElementById('form-participante');
    if (formPart) {
        formPart.onsubmit = async (e) => {
            e.preventDefault();
            const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');
            
            jugadasRaw.forEach(grupo => {
                const numeros = grupo.split(',').map(n => n.trim());
                if (numeros.length === 7) {
                    participantes.push({
                        nombre: document.getElementById('nombre').value.toUpperCase(),
                        refe: document.getElementById('refe').value,
                        jugada: numeros
                    });
                }
            });

            await guardarEnNube('participantes', participantes);
            e.target.reset();
            document.getElementById('input-paste-data').value = "";
            cargarDatosDesdeNube();
        };
    }

    // --- 6. REGISTRO DE RESULTADOS ---
    const formRes = document.getElementById('form-resultados');
    if (formRes) {
        formRes.onsubmit = async (e) => {
            e.preventDefault();
            resultados.push({
                sorteo: document.getElementById('sorteo-hora').value,
                numero: document.getElementById('numero-ganador').value.padStart(2, '0')
            });
            await guardarEnNube('resultados', resultados);
            e.target.reset();
            cargarDatosDesdeNube();
        };
    }

    // --- 7. REGISTRO DE FINANZAS ---
    const formFin = document.getElementById('form-finanzas');
    if (formFin) {
        formFin.onsubmit = async (e) => {
            e.preventDefault();
            finanzas = {
                ventas: document.getElementById('input-ventas').value,
                recaudado: document.getElementById('input-recaudado').value,
                acumulado: document.getElementById('input-acumulado').value
            };
            await guardarEnNube('finanzas', finanzas);
            alert("Finanzas sincronizadas");
        };
    }

    // --- 8. RENDERIZADO ---
    function renderTodo() {
        const listaP = document.getElementById('lista-participantes');
        const listaR = document.getElementById('lista-resultados');

        if (listaP) {
            listaP.innerHTML = participantes.map((p, i) => `
                <li style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:5px; margin-bottom:5px; border-radius:4px;">
                    <span><strong>${p.nombre}</strong> (${p.refe}) <br><small>${p.jugada.join('-')}</small></span>
                    <button onclick="window.eliminarP(${i})" style="color:red;">X</button>
                </li>`).join('');
        }

        if (listaR) {
            listaR.innerHTML = resultados.map((r, i) => `
                <li>${r.sorteo}: ${r.numero} <button onclick="window.eliminarR(${i})">X</button></li>`).join('');
        }
    }

    window.eliminarP = async (i) => {
        participantes.splice(i, 1);
        await guardarEnNube('participantes', participantes);
        cargarDatosDesdeNube();
    };

    window.eliminarR = async (i) => {
        resultados.splice(i, 1);
        await guardarEnNube('resultados', resultados);
        cargarDatosDesdeNube();
    };

    // Carga inicial
    await cargarDatosDesdeNube();
});