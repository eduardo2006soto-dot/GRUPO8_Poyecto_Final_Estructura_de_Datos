// benchmark_busquedas.js — Prueba de estrés: búsqueda secuencial O(n) vs binaria O(log n)
// en arreglos en memoria y en archivos indexados.
//
// Uso:  node benchmark_busquedas.js      o      npm run benchmark:busquedas
//
// Para cada volumen de datos (1.000, 50.000 y 500.000 registros) se hace lo siguiente:
//   1. Se generan los registros, se desordenan y se ordenan con el mergeSort del proyecto.
//   2. Se guardan como archivo indexado (.dat + .idx) en una carpeta temporal.
//   3. Se mide la latencia de cada búsqueda con performance.now() en tres casos:
//        - promedio      : claves repartidas de forma uniforme por todo el arreglo
//        - peor caso     : el que más trabajo le da a cada algoritmo. Secuencial: el último
//                          registro (n comparaciones). Binaria: registros que obligan a
//                          llegar al nivel más profundo (floor(log2 n) + 1 comparaciones)
//        - no encontrado : ids ausentes, situados entre dos ids existentes
//   4. Se registran el tiempo promedio y el número de comparaciones (y, en archivo,
//      las lecturas a disco) de cada algoritmo.
//
// Resultados: tablas en consola + resultados_busquedas.md + resultados_busquedas.csv.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { performance } = require("perf_hooks");

const { mergeSort } = require("./proyecto_unidad3/logic/mergesort.js");
const { crearComparador, generarRegistros } = require("./proyecto_unidad3/logic/registros.js");
const { busquedaSecuencial } = require("./proyecto_unidad3/logic/busqueda_secuencial.js");
const { busquedaBinaria } = require("./proyecto_unidad3/logic/busqueda_binaria.js");
const archivos = require("./proyecto_unidad3/logic/busqueda_archivos.js");

// ---- Configuración ----

const TAMANOS = [1000, 50000, 500000];
const CASOS = ["promedio", "peor caso", "no encontrado"];

// Cada combinación de tamaño y caso se mide en RONDAS rondas. En cada ronda se ejecutan las
// búsquedas de esta tabla (siempre con el mismo conjunto de claves) y el tiempo reportado es
// la mediana de los promedios de las rondas. La secuencial lleva menos repeticiones por
// ronda porque cada búsqueda cuesta mucho más.
const RONDAS = 5;
const REPETICIONES = {
    "memoria-secuencial": { 1000: 1000, 50000: 100, 500000: 10 },
    "memoria-binaria": { 1000: 5000, 50000: 5000, 500000: 5000 },
    "archivo-secuencial": { 1000: 50, 50000: 5, 500000: 3 },
    "archivo-binaria": { 1000: 500, 50000: 500, 500000: 500 }
};

const FRACCION_CALENTAMIENTO = 0.1; // búsquedas previas (no medidas) para que el motor optimice el código
const SEMILLA = 20261119;           // misma semilla = mismos datos y mismas claves en cada ejecución

const cmp = crearComparador([{ campo: "id", dir: "asc" }]);

// ---- Utilidades ----

function generadorConSemilla(semilla) {
    let estado = semilla >>> 0;
    return function () {
        estado = (estado * 1664525 + 1013904223) >>> 0;
        return estado / 4294967296;
    };
}

function mezclar(arreglo, aleatorio) {
    for (let i = arreglo.length - 1; i > 0; i--) {
        const j = Math.floor(aleatorio() * (i + 1));
        const temporal = arreglo[i];
        arreglo[i] = arreglo[j];
        arreglo[j] = temporal;
    }
    return arreglo;
}

function formatoN(n) {
    return n.toLocaleString("es-EC");
}

function techoLog2(n) {
    return Math.floor(Math.log2(n)) + 1; // máximo de comparaciones de la binaria
}

// Posiciones (0..n-1) cuya búsqueda binaria necesita el máximo de comparaciones. Se calculan
// simulando la búsqueda sobre las posiciones, sin tocar los datos.
const cachePeorCasoBinaria = new Map();
function posicionesPeorCasoBinaria(n) {
    if (cachePeorCasoBinaria.has(n)) return cachePeorCasoBinaria.get(n);

    const maximo = techoLog2(n);
    const posiciones = [];
    for (let objetivo = 0; objetivo < n; objetivo++) {
        let izquierda = 0;
        let derecha = n - 1;
        let pasos = 0;
        while (izquierda <= derecha) {
            const mid = Math.floor((izquierda + derecha) / 2);
            pasos++;
            if (mid === objetivo) break;
            if (mid < objetivo) izquierda = mid + 1; else derecha = mid - 1;
        }
        if (pasos === maximo) posiciones.push(objetivo);
    }
    cachePeorCasoBinaria.set(n, posiciones);
    return posiciones;
}

// Claves a buscar en cada ronda (objetos { id } como espera el comparador).
// - promedio: muestreo estratificado, posiciones repartidas uniformemente entre 1 y n, así el
//   promedio no depende de la suerte con pocas repeticiones.
// - peor caso: secuencial = el último registro; binaria = registros de máxima profundidad,
//   repartidos por el arreglo. Repetir una sola clave haría el camino de la binaria tan
//   predecible para el procesador que saldría artificialmente rápido.
// - no encontrado: ids ausentes, entre dos ids existentes (k + 0.5).
function generarClaves(caso, n, cantidad, algoritmo) {
    const claves = new Array(cantidad);
    const profundas = caso === "peor caso" && algoritmo === "binaria" ? posicionesPeorCasoBinaria(n) : null;

    for (let j = 0; j < cantidad; j++) {
        const fraccion = (j + 0.5) / cantidad;
        const posicion = Math.min(n - 1, Math.floor(fraccion * n)); // 0..n-1
        if (caso === "peor caso" && algoritmo === "secuencial") {
            claves[j] = { id: n };
        } else if (profundas) {
            claves[j] = { id: profundas[Math.min(profundas.length - 1, Math.floor(fraccion * profundas.length))] + 1 };
        } else if (caso === "promedio") {
            claves[j] = { id: posicion + 1 };
        } else {
            claves[j] = { id: Math.min(n - 1, posicion + 1) + 0.5 };
        }
    }
    return mezclar(claves, generadorConSemilla(SEMILLA));
}

function mediana(valores) {
    const ordenados = valores.slice().sort((a, b) => a - b);
    const medio = ordenados.length >> 1;
    return ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2;
}

// Ejecuta RONDAS rondas de `claves.length` búsquedas y devuelve el promedio por búsqueda.
// Cada ronda se cronometra completa con performance.now() y se divide entre sus repeticiones:
// una búsqueda en memoria dura menos de un microsegundo y cronometrarla una a una
// metería más ruido (las propias llamadas al reloj) que la búsqueda misma.
// El tiempo reportado es la mediana de las rondas; las comparaciones y lecturas son idénticas
// en todas porque las claves son las mismas.
function medir(buscar, claves) {
    const porRonda = claves.length;
    const calentamiento = Math.max(1, Math.round(porRonda * FRACCION_CALENTAMIENTO));
    for (let i = 0; i < calentamiento; i++) buscar(claves[i]);

    let comparaciones = 0;
    let lecturas = 0;
    let encontrados = 0;
    const promedios = [];

    for (let ronda = 0; ronda < RONDAS; ronda++) {
        const inicio = performance.now();
        for (let i = 0; i < porRonda; i++) {
            const r = buscar(claves[i]);
            comparaciones += r.comparaciones;
            if (r.lecturas !== undefined) lecturas += r.lecturas;
            if (r.encontrado) encontrados++;
        }
        const fin = performance.now();
        promedios.push((fin - inicio) / porRonda);
    }

    const total = RONDAS * porRonda;
    return {
        repeticiones: total,
        ms: mediana(promedios),
        comparaciones: comparaciones / total,
        lecturas: lecturas / total,
        encontrados: encontrados
    };
}

// Comprueba que la búsqueda se comportó como se esperaba, para no publicar tiempos de
// una búsqueda defectuosa.
function validar(medicion, etiqueta, caso, n, esSecuencial) {
    const esperadosEncontrados = caso === "no encontrado" ? 0 : medicion.repeticiones;
    if (medicion.encontrados !== esperadosEncontrados) {
        throw new Error(etiqueta + " (" + caso + ", N=" + n + "): se encontraron " +
            medicion.encontrados + " de " + esperadosEncontrados + " esperados");
    }
    if (!esSecuencial && medicion.comparaciones > techoLog2(n)) {
        throw new Error(etiqueta + " (" + caso + ", N=" + n + "): más comparaciones que " +
            "floor(log2 N)+1 = " + techoLog2(n));
    }
    if (!esSecuencial && caso === "peor caso" && medicion.comparaciones !== techoLog2(n)) {
        throw new Error(etiqueta + " (peor caso, N=" + n + "): se esperaban " + techoLog2(n) +
            " comparaciones y hubo " + medicion.comparaciones);
    }
    if (esSecuencial && caso !== "promedio" && medicion.comparaciones !== n) {
        throw new Error(etiqueta + " (" + caso + ", N=" + n + "): se esperaban " + n +
            " comparaciones y hubo " + medicion.comparaciones);
    }
}

// ---- Preparación de datos ----

function prepararDatos(n, carpeta) {
    const registros = mezclar(generarRegistros(n), generadorConSemilla(SEMILLA + n));

    let t0 = performance.now();
    const ordenados = mergeSort(registros, cmp);
    const msOrdenar = performance.now() - t0;

    for (let i = 1; i < ordenados.length; i++) {
        if (cmp(ordenados[i - 1], ordenados[i]) > 0) {
            throw new Error("mergeSort no dejó los registros ordenados (N=" + n + ")");
        }
    }

    const rutaBase = path.join(carpeta, "patrullas_" + n);
    t0 = performance.now();
    const info = archivos.crearArchivoIndexado(ordenados, cmp, rutaBase, { yaOrdenados: true });
    const msArchivo = performance.now() - t0;

    return {
        ordenados: ordenados,
        rutaBase: rutaBase,
        preparacion: {
            n: n,
            msOrdenar: msOrdenar,
            msArchivo: msArchivo,
            mbDatos: info.bytesDatos / (1024 * 1024),
            kbIndice: info.bytesIndice / 1024
        }
    };
}

// ---- Ejecución ----

function ejecutar() {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-busquedas-"));
    const filas = [];
    const preparaciones = [];

    console.log("PRUEBA DE ESTRES: BUSQUEDA SECUENCIAL vs BINARIA (memoria y archivo indexado)");
    console.log("Tamaños: " + TAMANOS.map(formatoN).join(", ") + " | Casos: " + CASOS.join(", "));
    console.log("Archivos temporales en: " + carpeta + " (se borran al terminar)\n");

    try {
        for (const n of TAMANOS) {
            process.stdout.write("N = " + formatoN(n).padStart(7) + ": preparando datos... ");
            const datos = prepararDatos(n, carpeta);
            preparaciones.push(datos.preparacion);
            console.log("listo");

            const archivo = archivos.abrirArchivoIndexado(datos.rutaBase);
            try {
                const metodos = {
                    memoria: {
                        secuencial: (objetivo) => busquedaSecuencial(datos.ordenados, objetivo, cmp),
                        binaria: (objetivo) => busquedaBinaria(datos.ordenados, objetivo, cmp)
                    },
                    archivo: {
                        secuencial: (objetivo) => archivos.busquedaSecuencialArchivo(archivo, objetivo, cmp),
                        binaria: (objetivo) => archivos.busquedaBinariaArchivo(archivo, objetivo, cmp)
                    }
                };

                for (const modo of ["memoria", "archivo"]) {
                    for (const caso of CASOS) {
                        process.stdout.write("   " + modo.padEnd(7) + " | " + caso.padEnd(13) + "... ");

                        const sec = medir(metodos[modo].secuencial,
                            generarClaves(caso, n, REPETICIONES[modo + "-secuencial"][n], "secuencial"));
                        validar(sec, modo + " secuencial", caso, n, true);

                        const bin = medir(metodos[modo].binaria,
                            generarClaves(caso, n, REPETICIONES[modo + "-binaria"][n], "binaria"));
                        validar(bin, modo + " binaria", caso, n, false);

                        filas.push({ modo: modo, n: n, caso: caso, sec: sec, bin: bin });
                        console.log("ok");
                    }
                }
            } finally {
                archivos.cerrarArchivoIndexado(archivo);
            }
        }
    } finally {
        fs.rmSync(carpeta, { recursive: true, force: true });
    }

    mostrarResultados(filas, preparaciones);
}

// ---- Presentación de resultados ----

function ms(valor, decimales) {
    return valor.toFixed(decimales);
}

function construirTabla(filas, modo) {
    const decimales = modo === "memoria" ? 6 : 4;
    return filas.filter((f) => f.modo === modo).map(function (f) {
        const fila = {
            "N": formatoN(f.n),
            "Caso": f.caso,
            "Reps sec/bin": formatoN(f.sec.repeticiones) + " / " + formatoN(f.bin.repeticiones),
            "Comp. sec": f.sec.comparaciones.toFixed(1),
            "Comp. bin": f.bin.comparaciones.toFixed(1)
        };
        if (modo === "archivo") {
            fila["Lect. sec"] = f.sec.lecturas.toFixed(1);
            fila["Lect. bin"] = f.bin.lecturas.toFixed(1);
        }
        fila["Tiempo sec (ms)"] = ms(f.sec.ms, decimales);
        fila["Tiempo bin (ms)"] = ms(f.bin.ms, decimales);
        fila["Mejora (x)"] = (f.sec.ms / f.bin.ms).toFixed(1);
        fila["Ahorro comp. (%)"] = ((1 - f.bin.comparaciones / f.sec.comparaciones) * 100).toFixed(2);
        return fila;
    });
}

function tablaMarkdown(tabla) {
    const columnas = Object.keys(tabla[0]);
    let md = "| " + columnas.join(" | ") + " |\n";
    md += "|" + columnas.map(() => "---").join("|") + "|\n";
    tabla.forEach(function (fila) {
        md += "| " + columnas.map((c) => fila[c]).join(" | ") + " |\n";
    });
    return md;
}

function mostrarResultados(filas, preparaciones) {
    const tablaPrep = preparaciones.map((p) => ({
        "N": formatoN(p.n),
        "Ordenar con mergeSort (ms)": ms(p.msOrdenar, 1),
        "Crear archivo indexado (ms)": ms(p.msArchivo, 1),
        "Tamaño .dat (MB)": p.mbDatos.toFixed(2),
        "Tamaño .idx (KB)": p.kbIndice.toFixed(0)
    }));
    const tablaMemoria = construirTabla(filas, "memoria");
    const tablaArchivo = construirTabla(filas, "archivo");

    console.log("\n=== PREPARACION DE LOS DATOS ===");
    console.table(tablaPrep);
    console.log("=== BUSQUEDA EN MEMORIA ===");
    console.table(tablaMemoria);
    console.log("=== BUSQUEDA EN ARCHIVO INDEXADO ===");
    console.table(tablaArchivo);

    guardarMarkdown(tablaPrep, tablaMemoria, tablaArchivo, filas);
    guardarCsv(filas);
}

function guardarMarkdown(tablaPrep, tablaMemoria, tablaArchivo, filas) {
    let md = "# Prueba de estrés: búsqueda secuencial vs binaria\n\n";
    md += "- Fecha: " + new Date().toISOString() + "\n";
    md += "- Equipo: " + os.cpus()[0].model + " | Node " + process.version + " | " + os.platform() + "\n";
    md += "- Volúmenes: " + TAMANOS.map(formatoN).join(", ") + " registros | Búsqueda por `id`\n\n";

    md += "## Preparación de los datos\n\n" + tablaMarkdown(tablaPrep) + "\n";
    md += "## Búsqueda en memoria\n\n" + tablaMarkdown(tablaMemoria) + "\n";
    md += "## Búsqueda en archivo indexado\n\n" + tablaMarkdown(tablaArchivo) + "\n";

    md += "## Resumen del caso promedio con el mayor volumen\n\n";
    const mayor = TAMANOS[TAMANOS.length - 1];
    filas.filter((f) => f.n === mayor && f.caso === "promedio").forEach(function (f) {
        const decimales = f.modo === "memoria" ? 6 : 4;
        md += "- " + (f.modo === "memoria" ? "Memoria" : "Archivo") + " (N = " + formatoN(f.n) + "): " +
            "secuencial " + f.sec.comparaciones.toFixed(1) + " comparaciones y " + ms(f.sec.ms, decimales) +
            " ms; binaria " + f.bin.comparaciones.toFixed(1) + " comparaciones y " + ms(f.bin.ms, decimales) +
            " ms (" + (f.sec.ms / f.bin.ms).toFixed(1) + " veces más rápida).\n";
    });

    md += "\n## Cómo se midió\n\n";
    md += "- **Tiempo:** milisegundos por búsqueda. Se hacen " + RONDAS + " rondas por celda; cada ronda se " +
        "cronometra con `performance.now()` y se divide entre sus búsquedas. Se reporta la mediana de las " +
        "rondas. La columna *Reps* es el total de búsquedas (rondas × búsquedas por ronda). Antes de medir " +
        "se ejecuta un 10 % de búsquedas de calentamiento.\n";
    md += "- **Comparaciones:** registros examinados por búsqueda, contados por los propios módulos. " +
        "En archivo, cada registro examinado se lee y se interpreta del disco.\n";
    md += "- **Lecturas:** accesos a disco (`fs.readSync`) por búsqueda.\n";
    md += "- **Promedio:** claves repartidas uniformemente por todo el arreglo, en orden mezclado y con semilla fija. " +
        "**Peor caso:** para la secuencial, el último registro (N comparaciones); para la binaria, registros " +
        "que exigen el máximo de comparaciones (⌊log₂ N⌋ + 1). **No encontrado:** ids ausentes entre dos ids existentes.\n";
    md += "- **Mejora (x):** tiempo secuencial ÷ tiempo binario. " +
        "**Ahorro comp. (%):** 1 − comparaciones binaria ÷ comparaciones secuencial.\n";
    md += "- El archivo se abre una vez por tamaño y se reutiliza. Los archivos se acaban de escribir, " +
        "así que el sistema operativo probablemente los tenga en caché; con un disco frío los tiempos " +
        "en archivo serían mayores.\n";
    md += "- Los tiempos dependen del equipo y del estado del sistema. Las comparaciones no.\n";
    md += "- En memoria las búsquedas duran microsegundos: diferencias pequeñas entre casos parecidos " +
        "(por ejemplo, 'peor caso' y 'no encontrado' de la secuencial, que hacen las mismas comparaciones) " +
        "son ruido de medición, no un efecto real.\n";

    const salida = path.join(__dirname, "resultados_busquedas.md");
    fs.writeFileSync(salida, md, "utf8");
    console.log("[OK] Resultados guardados en: " + salida);
}

function guardarCsv(filas) {
    const lineas = ["modo,n,caso,reps_sec,reps_bin,comp_sec,comp_bin,lecturas_sec,lecturas_bin,ms_sec,ms_bin,mejora_x,ahorro_comp_pct"];
    filas.forEach(function (f) {
        lineas.push([
            f.modo, f.n, f.caso.replace(" ", "_"), f.sec.repeticiones, f.bin.repeticiones,
            f.sec.comparaciones, f.bin.comparaciones, f.sec.lecturas, f.bin.lecturas,
            f.sec.ms, f.bin.ms, f.sec.ms / f.bin.ms,
            (1 - f.bin.comparaciones / f.sec.comparaciones) * 100
        ].join(","));
    });

    const salida = path.join(__dirname, "resultados_busquedas.csv");
    fs.writeFileSync(salida, lineas.join("\n") + "\n", "utf8");
    console.log("[OK] Datos para gráficas guardados en: " + salida);
}

ejecutar();
