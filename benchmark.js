const fs = require('fs');
const path = require('path');

// 1. IMPORTACIÓN DE MÓDULOS DEL EQUIPO[cite: 7, 8, 9]
// Se importan los algoritmos y utilidades creados en las tareas 1, 2 y 3.
const { mergeSort } = require('./proyecto_unidad3/logic/mergesort.js');
const { quickSort } = require('./proyecto_unidad3/logic/quicksort.js');
const { crearComparador, generarRegistros } = require('./proyecto_unidad3/logic/registros.js');

// 2. CONFIGURACIÓN DE ESCENARIOS Y TAMAÑOS
const TAMANOS = [1000, 10000, 100000];
const ESCENARIOS = ['aleatorios', 'ya ordenados', 'invertidos'];
const REPETICIONES = 5;

// Creamos el comparador multicriterio (ej. ordenar por distancia y luego por prioridad/id)
// Si crearComparador() recibe parámetros en registros.js, ajústalos aquí.
const comparador = crearComparador();

/**
 * Prepara el conjunto de datos según el escenario solicitado[cite: 7].
 * @param {number} n - Cantidad de registros a generar.
 * @param {string} escenario - 'aleatorios', 'ya ordenados' o 'invertidos'.
 * @returns {Array} Arreglo listo para ser probado.
 */
function prepararDatos(n, escenario) {
    // Genera 'n' registros base con la estructura del proyecto
    const datosBase = generarRegistros(n);

    if (escenario === 'aleatorios') {
        return datosBase;
    }

    // Para 'ya ordenados' e 'invertidos', ordenamos primero una copia con mergeSort
    const ordenados = mergeSort([...datosBase], comparador);

    if (escenario === 'ya ordenados') {
        return ordenados;
    }

    if (escenario === 'invertidos') {
        // Invertimos el arreglo ordenado para simular el peor caso
        return ordenados.reverse();
    }

    return datosBase;
}

/**
 * Ejecuta un algoritmo 5 veces sobre copias frescas del arreglo,
 * promediando el tiempo de ejecución (performance.now) y la memoria usada.
 * @param {Function} algoritmo - Función mergeSort o quickSort.
 * @param {Array} datosOriginales - Arreglo base del escenario.
 * @returns {Object} Promedio de tiempo en ms y memoria en KB.
 */
function medirRendimiento(algoritmo, datosOriginales) {
    let sumaTiempoMs = 0;
    let sumaMemoriaBytes = 0;

    for (let i = 0; i < REPETICIONES; i++) {
        // IMPORTANTE: Clonamos el arreglo en cada repetición porque quickSort
        // ordena "in-place" (modifica el arreglo original)[cite: 7].
        const copiaDatos = datosOriginales.map(registro => ({ ...registro }));

        // Medición inicial de memoria y tiempo de alta precisión
        const memAntes = process.memoryUsage().heapUsed;
        const inicio = performance.now();

        // Ejecución del algoritmo de ordenamiento
        algoritmo(copiaDatos, comparador);

        // Medición final
        const fin = performance.now();
        const memDespues = process.memoryUsage().heapUsed;

        sumaTiempoMs += (fin - inicio);
        // Math.max evita valores negativos si el Garbage Collector de Node actúa en medio
        sumaMemoriaBytes += Math.max(0, memDespues - memAntes);
    }

    return {
        tiempoPromedioMs: (sumaTiempoMs / REPETICIONES).toFixed(4),
        memoriaPromedioKB: ((sumaMemoriaBytes / REPETICIONES) / 1024).toFixed(2)
    };
}

/**
 * Función principal que orquesta todo el Benchmark, muestra la tabla en consola
 * y exporta el archivo resultados.md con la conclusión[cite: 7].
 */
function ejecutarBenchmark() {
    console.log('====================================================================');
    console.log('   INICIANDO BENCHMARK: MERGESORT VS QUICKSORT (5 REPETICIONES)     ');
    console.log('====================================================================\n');

    const resultadosTabla = [];

    // Iteramos sobre los 3 tamaños (1.000, 10.000, 100.000)[cite: 7]
    for (const n of TAMANOS) {
        // Iteramos sobre los 3 escenarios (aleatorios, ya ordenados, invertidos)[cite: 7]
        for (const escenario of ESCENARIOS) {
            const datosPrueba = prepararDatos(n, escenario);

            // Medimos MergeSort
            const resMerge = medirRendimiento(mergeSort, datosPrueba);

            // Medimos QuickSort (con protección try/catch por si ocurre desbordamiento de pila
            // en arreglos de 100.000 ya ordenados/invertidos si el pivote es fijo)
            let resQuick;
            try {
                resQuick = medirRendimiento(quickSort, datosPrueba);
            } catch (error) {
                resQuick = {
                    tiempoPromedioMs: 'Stack Overflow',
                    memoriaPromedioKB: 'N/A'
                };
            }

            resultadosTabla.push({
                Registros: n.toLocaleString('es-ES'),
                Escenario: escenario,
                'MergeSort Tiempo (ms)': resMerge.tiempoPromedioMs,
                'MergeSort Memoria (KB)': resMerge.memoriaPromedioKB,
                'QuickSort Tiempo (ms)': resQuick.tiempoPromedioMs,
                'QuickSort Memoria (KB)': resQuick.memoriaPromedioKB
            });
        }
    }

    // 3. IMPRIMIR TABLA EN CONSOLA[cite: 7]
    console.table(resultadosTabla);

    // 4. GENERAR ARCHIVO resultados.md CON TABLA Y CONCLUSIÓN[cite: 7]
    guardarResultadosMarkdown(resultadosTabla);
}

/**
 * Construye el reporte en formato Markdown y lo guarda en resultados.md[cite: 7].
 */
function guardarResultadosMarkdown(filas) {
    let md = '# Resultados del Benchmark: MergeSort vs QuickSort\n\n';
    md += 'Pruebas ejecutadas con `performance.now()` promediando 5 iteraciones por escenario[cite: 7].\n\n';

    // Encabezados de la tabla Markdown
    md += '| Registros | Escenario | MergeSort Tiempo (ms) | MergeSort Memoria (KB) | QuickSort Tiempo (ms) | QuickSort Memoria (KB) |\n';
    md += '| :--- | :--- | :---: | :---: | :---: | :---: |\n';

    // Filas de datos
    for (const f of filas) {
        md += `| ${f.Registros} | ${f.Escenario} | ${f['MergeSort Tiempo (ms)']} | ${f['MergeSort Memoria (KB)']} | ${f['QuickSort Tiempo (ms)']} | ${f['QuickSort Memoria (KB)']} |\n`;
    }

    // Conclusión de 3 a 5 líneas requerida en el Issue #13[cite: 7]
    md += '\n## Conclusión\n\n';
    md += 'En escenarios con datos aleatorios, **QuickSort** suele ser ligeramente más rápido en la práctica debido a que ordena *in-place* (sin reservar nuevos arreglos en cada división) y aprovecha mejor la caché del procesador. Sin embargo, **MergeSort** mantiene una complejidad garantizada de $O(n \\log n)$ incluso en arreglos ya ordenados o invertidos, mientras que QuickSort puede degradarse a $O(n^2)$ (o agotar la pila de llamadas con 100.000 registros) si elige pivotes extremos. Por ello, para garantizar estabilidad en cualquier orden de entrada del sistema de despacho, MergeSort es la opción más predecible.\n';

    const rutaSalida = path.join(__dirname, 'resultados.md');
    fs.writeFileSync(rutaSalida, md, 'utf8');
    console.log(`\n[OK] Resultados y conclusión guardados exitosamente en: ${rutaSalida}`);
}

// Ejecutar el benchmark
ejecutarBenchmark();