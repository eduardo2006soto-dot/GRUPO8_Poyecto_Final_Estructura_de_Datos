// tests/ordenamiento.test.js — Pruebas de MergeSort y QuickSort
// Ejecutar con: node --test
// Este es el único archivo del proyecto donde se permite usar .sort(),
// y solo como referencia para comparar resultados.

const test = require("node:test");
const assert = require("node:assert");

const { mergeSort } = require("../proyecto_unidad3/logic/mergesort.js");
const { quickSort } = require("../proyecto_unidad3/logic/quicksort.js");
const { crearComparador, generarRegistros } = require("../proyecto_unidad3/logic/registros.js");

const numerico = (a, b) => a - b;

// Ejecuta cada caso con ambos algoritmos.
// quickSort ordena en el mismo arreglo, por eso se le pasa una copia.
const algoritmos = [
    ["mergeSort", (arr, cmp) => mergeSort(arr, cmp)],
    ["quickSort", (arr, cmp) => quickSort(arr.slice(), cmp)]
];

for (const [nombre, ordenar] of algoritmos) {
    test(`${nombre}: arreglo vacío y de un elemento`, () => {
        assert.deepStrictEqual(ordenar([], numerico), []);
        assert.deepStrictEqual(ordenar([42], numerico), [42]);
    });

    test(`${nombre}: duplicados`, () => {
        assert.deepStrictEqual(
            ordenar([5, 3, 5, 1, 3, 5, 1], numerico),
            [1, 1, 3, 3, 5, 5, 5]
        );
        assert.deepStrictEqual(ordenar([7, 7, 7, 7], numerico), [7, 7, 7, 7]);
    });

    test(`${nombre}: ya ordenado e invertido`, () => {
        const ordenado = Array.from({ length: 1000 }, (_, i) => i);
        const invertido = ordenado.slice().reverse();

        assert.deepStrictEqual(ordenar(ordenado, numerico), ordenado);
        assert.deepStrictEqual(ordenar(invertido, numerico), ordenado);
    });

    test(`${nombre}: multicriterio con crearComparador`, () => {
        const cmp = crearComparador([
            { campo: "estado", dir: "asc" },
            { campo: "distanciaMetros", dir: "desc" },
            { campo: "id", dir: "asc" }
        ]);
        const registros = [
            { id: 1, nombre: "A", sector: "S", estado: "patrullando", distanciaMetros: 300, velocidad: 10 },
            { id: 2, nombre: "B", sector: "S", estado: "emergencia",  distanciaMetros: 100, velocidad: 30 },
            { id: 3, nombre: "C", sector: "S", estado: "patrullando", distanciaMetros: 900, velocidad: 10 },
            { id: 4, nombre: "D", sector: "S", estado: "emergencia",  distanciaMetros: 100, velocidad: 30 },
            { id: 5, nombre: "E", sector: "S", estado: "emergencia",  distanciaMetros: 700, velocidad: 30 }
        ];

        // emergencia primero; dentro de cada estado, mayor distancia primero; empate por id
        assert.deepStrictEqual(ordenar(registros, cmp).map((r) => r.id), [5, 2, 4, 3, 1]);
    });

    test(`${nombre}: el resultado coincide con .sort()`, () => {
        const numeros = Array.from({ length: 2000 }, () => Math.floor(Math.random() * 500));
        assert.deepStrictEqual(ordenar(numeros, numerico), numeros.slice().sort(numerico));

        const cmp = crearComparador([
            { campo: "sector", dir: "asc" },
            { campo: "estado", dir: "desc" },
            { campo: "distanciaMetros", dir: "asc" },
            { campo: "id", dir: "asc" }
        ]);
        const registros = generarRegistros(2000);
        assert.deepStrictEqual(
            ordenar(registros, cmp).map((r) => r.id),
            registros.slice().sort(cmp).map((r) => r.id)
        );
    });
}
