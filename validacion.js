const { mergeSort } = require('./proyecto_unidad3/logic/mergesort.js');
const { quickSort } = require('./proyecto_unidad3/logic/quicksort.js');
const { crearComparador, generarRegistros } = require('./proyecto_unidad3/logic/registros.js');

let correctas = 0;
let fallidas = 0;

function prueba(nombre, fn) {
    try {
        const resultado = fn();
        if (resultado === false) throw new Error('la comprobación devolvió false');
        console.log('OK: ' + nombre);
        correctas++;
    } catch (error) {
        console.log('FALLO: ' + nombre + ' -> ' + error.message);
        fallidas++;
    }
}

function iguales(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Aquí SÍ se permite .sort(): solo sirve como referencia para comparar
const referencia = (arr, cmp) => [...arr].sort(cmp);

const numeros = (x, y) => x - y;

// Un algoritmo se normaliza a: recibe un arreglo y un cmp, devuelve el resultado
// sin tocar el original (quickSort ordena en el mismo arreglo, por eso se copia).
const algoritmos = {
    MergeSort: (arr, cmp) => mergeSort(arr, cmp),
    QuickSort: (arr, cmp) => quickSort([...arr], cmp)
};

// Registros propios con id único: así el orden final es el mismo para ambos
const criterios = [
    { campo: "estado", dir: "asc" },
    { campo: "distanciaMetros", dir: "asc" },
    { campo: "nombre", dir: "asc" },
    { campo: "id", dir: "asc" }
];
const cmpRegistros = crearComparador(criterios);

const pequenos = [
    { id: 1, nombre: "Beta",  estado: "patrullando", distanciaMetros: 500 },
    { id: 2, nombre: "Alfa",  estado: "emergencia",  distanciaMetros: 900 },
    { id: 3, nombre: "Alfa",  estado: "patrullando", distanciaMetros: 500 },
    { id: 4, nombre: "Gamma", estado: "emergencia",  distanciaMetros: 100 },
    { id: 5, nombre: "Alfa",  estado: "patrullando", distanciaMetros: 500 }
];

for (const [nombre, ordenar] of Object.entries(algoritmos)) {
    console.log('\n=== ' + nombre + ' ===');

    prueba('Arreglo vacio', () => ordenar([], numeros).length === 0);

    prueba('Un elemento', () => iguales(ordenar([7], numeros), [7]));

    prueba('Negativos, cero y repetidos', () => {
        const datos = [3, -1, 0, 3, -5, 2, 0];
        return iguales(ordenar(datos, numeros), referencia(datos, numeros));
    });

    prueba('Arreglo ya ordenado', () => {
        const datos = Array.from({ length: 1000 }, (_, i) => i);
        return iguales(ordenar(datos, numeros), datos);
    });

    prueba('Arreglo en orden inverso', () => {
        const datos = Array.from({ length: 1000 }, (_, i) => 1000 - i);
        return iguales(ordenar(datos, numeros), referencia(datos, numeros));
    });

    prueba('Todos los elementos iguales', () => {
        const datos = new Array(500).fill(4);
        return iguales(ordenar(datos, numeros), datos);
    });

    prueba('Ordenamiento multicriterio', () => {
        const resultado = ordenar(pequenos, cmpRegistros);
        return iguales(resultado, referencia(pequenos, cmpRegistros));
    });

    prueba('Orden descendente', () => {
        const desc = (x, y) => y - x;
        const datos = [5, 2, 9, 1, 9, 3];
        return iguales(ordenar(datos, desc), referencia(datos, desc));
    });

    prueba('No modifica el arreglo original', () => {
        const datos = [3, 1, 2];
        const copia = [...datos];
        ordenar(datos, numeros);
        return iguales(datos, copia);
    });

    prueba('1000 registros generados coinciden con la referencia', () => {
        const datos = generarRegistros(1000);
        return iguales(ordenar(datos, cmpRegistros), referencia(datos, cmpRegistros));
    });

    prueba('10000 registros generados coinciden con la referencia', () => {
        const datos = generarRegistros(10000);
        return iguales(ordenar(datos, cmpRegistros), referencia(datos, cmpRegistros));
    });

    prueba('100000 registros: queda ordenado y sin perder ninguno', () => {
        const datos = generarRegistros(100000);
        const resultado = ordenar(datos, cmpRegistros);
        if (resultado.length !== datos.length) return false;
        for (let i = 1; i < resultado.length; i++) {
            if (cmpRegistros(resultado[i - 1], resultado[i]) > 0) return false;
        }
        return true;
    });

    prueba('100000 registros ya ordenados no desbordan la pila', () => {
        const base = mergeSort(generarRegistros(100000), cmpRegistros);
        ordenar(base, cmpRegistros);
        return true;
    });
}

// Pruebas que comparan los dos algoritmos entre sí
console.log('\n=== Comparaciones ===');

prueba('MergeSort es estable cuando hay empates', () => {
    const datos = [
        { k: 1, n: 'a' }, { k: 0, n: 'b' }, { k: 1, n: 'c' },
        { k: 0, n: 'd' }, { k: 1, n: 'e' }
    ];
    const resultado = mergeSort(datos, (x, y) => x.k - y.k);
    return resultado.map(r => r.n).join('') === 'bdace';
});

prueba('Ambos algoritmos devuelven exactamente el mismo resultado', () => {
    const datos = generarRegistros(5000);
    const a = mergeSort(datos, cmpRegistros);
    const b = quickSort([...datos], cmpRegistros);
    for (let i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id) return false;
    }
    return true;
});

prueba('El comparador detecta datos mal ordenados', () => {
    return cmpRegistros(pequenos[1], pequenos[0]) < 0 && cmpRegistros(pequenos[0], pequenos[1]) > 0;
});

console.log('\n=== RESUMEN DE VALIDACION ===');
console.log('Pruebas correctas: ' + correctas);
console.log('Pruebas fallidas: ' + fallidas);
console.log('Total de pruebas: ' + (correctas + fallidas));

if (fallidas > 0) process.exit(1);