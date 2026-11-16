const fs = require('fs');
const path = require('path');

// Módulos del equipo
const { mergeSort } = require('./proyecto_unidad3/logic/mergesort.js');
const { quickSort } = require('./proyecto_unidad3/logic/quicksort.js');
const { crearComparador, generarRegistros } = require('./proyecto_unidad3/logic/registros.js');

// Configuración
const TAMANOS = [1000, 10000, 100000];
const ESCENARIOS = ['aleatorios', 'ya ordenados', 'invertidos'];
const REPETICIONES = 5;

// Comparador multicriterio (el mismo nombre se usa en todo el archivo)
const cmp = crearComparador([
    { campo: "estado", dir: "asc" },
    { campo: "distanciaMetros", dir: "asc" },
    { campo: "nombre", dir: "asc" }
]);

// Prepara el conjunto de datos según el escenario.
function prepararDatos(n, escenario) {
    const datosBase = generarRegistros(n);

    if (escenario === 'aleatorios') return datosBase;

    // mergeSort devuelve un arreglo nuevo, así que datosBase no se modifica
    const ordenados = mergeSort(datosBase, cmp);

    if (escenario === 'ya ordenados') return ordenados;

    // 'invertidos': el arreglo ordenado al revés
    return ordenados.reverse();
}

// Ejecuta un algoritmo varias veces sobre copias frescas y promedia tiempo y memoria.
// quickSort ordena en el mismo arreglo, por eso se clona en cada repetición.
function medirRendimiento(algoritmo, datosOriginales) {
    let sumaTiempoMs = 0;
    let sumaMemoriaBytes = 0;

    // Calentamiento (descartado): evita que la primera medición cargue con la
    // optimización inicial del motor de JavaScript.
    algoritmo(datosOriginales.map(registro => ({ ...registro })), cmp);

    for (let i = 0; i < REPETICIONES; i++) {
        const copiaDatos = datosOriginales.map(registro => ({ ...registro }));

        const memAntes = process.memoryUsage().heapUsed;
        const inicio = performance.now();

        algoritmo(copiaDatos, cmp);

        const fin = performance.now();
        const memDespues = process.memoryUsage().heapUsed;

        sumaTiempoMs += (fin - inicio);
        // Math.max evita negativos si el recolector de basura actúa en medio
        sumaMemoriaBytes += Math.max(0, memDespues - memAntes);
    }

    return {
        tiempoPromedioMs: (sumaTiempoMs / REPETICIONES).toFixed(4),
        memoriaPromedioKB: ((sumaMemoriaBytes / REPETICIONES) / 1024).toFixed(2)
    };
}

function ejecutarBenchmark() {
    console.log('====================================================================');
    console.log('   BENCHMARK: MERGESORT VS QUICKSORT (' + REPETICIONES + ' REPETICIONES)');
    console.log('====================================================================\n');

    const resultadosTabla = [];

    for (const n of TAMANOS) {
        for (const escenario of ESCENARIOS) {
            const datosPrueba = prepararDatos(n, escenario);

            const resMerge = medirRendimiento(mergeSort, datosPrueba);

            // Solo se captura el desbordamiento de pila; cualquier otro error se muestra
            let resQuick;
            try {
                resQuick = medirRendimiento(quickSort, datosPrueba);
            } catch (error) {
                if (!(error instanceof RangeError)) throw error;
                resQuick = { tiempoPromedioMs: 'Stack Overflow', memoriaPromedioKB: 'N/A' };
            }

            resultadosTabla.push({
                Registros: n.toLocaleString('de-DE'), // 1.000 / 10.000 / 100.000
                Escenario: escenario,
                'MergeSort Tiempo (ms)': resMerge.tiempoPromedioMs,
                'MergeSort Memoria (KB)': resMerge.memoriaPromedioKB,
                'QuickSort Tiempo (ms)': resQuick.tiempoPromedioMs,
                'QuickSort Memoria (KB)': resQuick.memoriaPromedioKB
            });
        }
    }

    console.table(resultadosTabla);
    guardarResultadosMarkdown(resultadosTabla);
}

// La conclusión se arma con los números medidos, no con una opinión escrita de antemano.
function generarConclusion(filas) {
    let quickGana = 0;
    let mergeGana = 0;
    let quickFallo = 0;

    for (const f of filas) {
        const m = parseFloat(f['MergeSort Tiempo (ms)']);
        const q = parseFloat(f['QuickSort Tiempo (ms)']);
        if (Number.isNaN(q)) { quickFallo++; continue; }
        if (q < m) quickGana++; else mergeGana++;
    }

    let texto = 'De los ' + filas.length + ' casos medidos, QuickSort fue más rápido en ' + quickGana +
        ' y MergeSort en ' + mergeGana + '.';
    if (quickFallo > 0) {
        texto += ' QuickSort agotó la pila de llamadas en ' + quickFallo + ' caso(s).';
    }
    texto += ' MergeSort mantiene O(n log n) en cualquier orden de entrada y es estable, ' +
        'mientras que QuickSort ordena en el mismo arreglo (menos memoria) pero puede degradarse ' +
        'a O(n²) si el pivote es malo. Revisar la tabla para ver en qué escenarios cambia el resultado.';
    return texto;
}

function guardarResultadosMarkdown(filas) {
    let md = '# Resultados del Benchmark: MergeSort vs QuickSort\n\n';
    md += 'Pruebas con `performance.now()`, promedio de ' + REPETICIONES + ' repeticiones por caso.\n\n';

    md += '| Registros | Escenario | MergeSort Tiempo (ms) | MergeSort Memoria (KB) | QuickSort Tiempo (ms) | QuickSort Memoria (KB) |\n';
    md += '| :--- | :--- | :---: | :---: | :---: | :---: |\n';

    for (const f of filas) {
        md += `| ${f.Registros} | ${f.Escenario} | ${f['MergeSort Tiempo (ms)']} | ${f['MergeSort Memoria (KB)']} | ${f['QuickSort Tiempo (ms)']} | ${f['QuickSort Memoria (KB)']} |\n`;
    }

    md += '\n## Conclusión\n\n' + generarConclusion(filas) + '\n';

    const rutaSalida = path.join(__dirname, 'resultados.md');
    fs.writeFileSync(rutaSalida, md, 'utf8');
    console.log(`\n[OK] Resultados guardados en: ${rutaSalida}`);
}

ejecutarBenchmark();