const { mergeSort } = require('./proyecto_unidad3/logic/mergesort.js');
const { quickSort } = require('./proyecto_unidad3/logic/quicksort.js');
const { crearComparador, generarRegistros } = require('./proyecto_unidad3/logic/registros.js');

const N = 100000;

const criterios = [
    { campo: "estado", dir: "asc" },
    { campo: "distanciaMetros", dir: "asc" },
    { campo: "nombre", dir: "asc" }
];
const cmp = crearComparador(criterios);

// Comprueba que cada registro sea menor o igual que el siguiente
function estaOrdenado(arr) {
    for (let i = 1; i < arr.length; i++) {
        if (cmp(arr[i - 1], arr[i]) > 0) return false;
    }
    return true;
}

function vistaPrevia(arr) {
    console.table(arr.slice(0, 10));
}

const datos = generarRegistros(N);

console.log('Dataset: ' + N + ' registros');
console.log('Criterios: estado ASC -> distanciaMetros ASC -> nombre ASC\n');

// ANTES
console.log('=== ANTES del ordenamiento ===');
vistaPrevia(datos);

// MERGESORT (devuelve un arreglo nuevo)
let t = performance.now();
const porMerge = mergeSort(datos, cmp);
const msMerge = performance.now() - t;

console.log('\n=== DESPUES - MergeSort ===');
vistaPrevia(porMerge);
console.log('MergeSort: ' + msMerge.toFixed(2) + ' ms | ordenado: ' + estaOrdenado(porMerge) +
    ' | registros: ' + porMerge.length);

// QUICKSORT (ordena en el mismo arreglo, por eso se usa una copia)
const copia = datos.map(registro => ({ ...registro }));
t = performance.now();
const porQuick = quickSort(copia, cmp);
const msQuick = performance.now() - t;

console.log('\n=== DESPUES - QuickSort ===');
vistaPrevia(porQuick);
console.log('QuickSort: ' + msQuick.toFixed(2) + ' ms | ordenado: ' + estaOrdenado(porQuick) +
    ' | registros: ' + porQuick.length);

// Original intacto
console.log('\nEl arreglo original no fue modificado por MergeSort: ' +
    (datos.length === N && !estaOrdenado(datos)));