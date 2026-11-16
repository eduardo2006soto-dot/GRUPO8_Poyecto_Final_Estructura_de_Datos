const test = require("node:test");
const assert = require("node:assert");

const { crearComparador, generarRegistros } = require("../logic/registros.js");
const { sectoresPatrullaje } = require("../logic/sectores.js");
const { mergeSort } = require("../logic/mergesort.js");
const { quickSort } = require("../logic/quicksort.js");

const base = (extra) => Object.assign(
    { id: 1, nombre: "P", sector: "Estadio", estado: "patrullando", distanciaMetros: 100, velocidad: 10 },
    extra
);

test("generarRegistros devuelve n registros con la forma correcta", () => {
    const nombres = sectoresPatrullaje.map((s) => s.nombre);
    const registros = generarRegistros(500);

    assert.strictEqual(registros.length, 500);
    registros.forEach((r, i) => {
        assert.deepStrictEqual(
            Object.keys(r),
            ["id", "nombre", "sector", "estado", "distanciaMetros", "velocidad"]
        );
        assert.strictEqual(r.id, i + 1);
        assert.ok(nombres.includes(r.sector));
        assert.ok(["patrullando", "emergencia"].includes(r.estado));
        assert.ok(Number.isInteger(r.distanciaMetros) && r.distanciaMetros >= 50 && r.distanciaMetros <= 5000);
        assert.ok(r.velocidad > 0);
    });
    assert.ok(registros.some((r) => r.estado === "emergencia"));
    assert.ok(registros.some((r) => r.estado === "patrullando"));
});

test("generarRegistros(0) devuelve [] y valida n", () => {
    assert.deepStrictEqual(generarRegistros(0), []);
    assert.throws(() => generarRegistros(-1), RangeError);
    assert.throws(() => generarRegistros(2.5), RangeError);
    assert.throws(() => generarRegistros("10"), RangeError);
});

test("generarRegistros es repetible con un generador con semilla", () => {
    const semilla = () => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    assert.deepStrictEqual(generarRegistros(20, semilla()), generarRegistros(20, semilla()));
});

test("comparador: asc y desc sobre un campo numérico", () => {
    const a = base({ distanciaMetros: 100 });
    const b = base({ distanciaMetros: 300 });

    assert.ok(crearComparador([{ campo: "distanciaMetros", dir: "asc" }])(a, b) < 0);
    assert.ok(crearComparador([{ campo: "distanciaMetros", dir: "desc" }])(a, b) > 0);
    assert.strictEqual(crearComparador([{ campo: "distanciaMetros", dir: "asc" }])(a, a), 0);
});

test("comparador: si el primer criterio empata pasa al siguiente", () => {
    const cmp = crearComparador([
        { campo: "estado", dir: "desc" },          // "patrullando" antes que "emergencia"
        { campo: "distanciaMetros", dir: "asc" }
    ]);
    const lista = [
        base({ id: 1, estado: "emergencia", distanciaMetros: 500 }),
        base({ id: 2, estado: "patrullando", distanciaMetros: 900 }),
        base({ id: 3, estado: "emergencia", distanciaMetros: 100 }),
        base({ id: 4, estado: "patrullando", distanciaMetros: 200 })
    ];
    assert.deepStrictEqual(mergeSort(lista, cmp).map((r) => r.id), [4, 2, 3, 1]);
});

test("comparador: texto con acentos y números dentro del texto", () => {
    const cmp = crearComparador([{ campo: "nombre" }]);   // dir omitida = asc
    const lista = ["Patrulla 10", "Época", "Patrulla 2", "Zoo", "Amable"].map((nombre) => base({ nombre }));
    assert.deepStrictEqual(
        mergeSort(lista, cmp).map((r) => r.nombre),
        ["Amable", "Época", "Patrulla 2", "Patrulla 10", "Zoo"]
    );
});

test("comparador: valida los criterios", () => {
    assert.throws(() => crearComparador([]), TypeError);
    assert.throws(() => crearComparador(null), TypeError);
    assert.throws(() => crearComparador([{ campo: "inexistente", dir: "asc" }]), RangeError);
    assert.throws(() => crearComparador([{ campo: "id", dir: "arriba" }]), RangeError);
});

test("integración: mergeSort y quickSort coinciden con Array.sort usando el mismo comparador", () => {
    const cmp = crearComparador([
        { campo: "sector", dir: "asc" },
        { campo: "estado", dir: "desc" },
        { campo: "distanciaMetros", dir: "desc" },
        { campo: "id", dir: "asc" }                 // desempate total => resultado único
    ]);
    const datos = generarRegistros(2000);
    const esperado = datos.slice().sort(cmp).map((r) => r.id);

    assert.deepStrictEqual(mergeSort(datos, cmp).map((r) => r.id), esperado);
    assert.deepStrictEqual(quickSort(datos.slice(), cmp).map((r) => r.id), esperado);
});

test("MergeSort es estable cuando todos los criterios empatan", () => {
    const cmp = crearComparador([{ campo: "estado" }]);
    const datos = generarRegistros(300);
    const ordenado = mergeSort(datos, cmp);
    for (let i = 1; i < ordenado.length; i++) {
        if (ordenado[i - 1].estado === ordenado[i].estado) {
            assert.ok(ordenado[i - 1].id < ordenado[i].id);
        }
    }
});
