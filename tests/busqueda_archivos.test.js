// tests/busqueda_archivos.test.js — Pruebas de las búsquedas en archivos indexados
// Ejecutar con: node --test
// Comprueba que buscar en el archivo da el mismo resultado y el mismo número de
// comparaciones que buscar en memoria sobre los mismos registros ordenados.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { mergeSort } = require("../proyecto_unidad3/logic/mergesort.js");
const { crearComparador, generarRegistros } = require("../proyecto_unidad3/logic/registros.js");
const {
    crearArchivoIndexado,
    abrirArchivoIndexado,
    cerrarArchivoIndexado,
    leerRegistroArchivo,
    busquedaSecuencialArchivo,
    busquedaBinariaArchivo,
    eliminarArchivoIndexado
} = require("../proyecto_unidad3/logic/busqueda_archivos.js");

// ---- Búsquedas en memoria de referencia ----
// Mismo algoritmo y mismo conteo que busqueda_secuencial.js y busqueda_binaria.js.

function secuencialMemoria(arr, objetivo, cmp) {
    let comparaciones = 0;
    for (let i = 0; i < arr.length; i++) {
        comparaciones++;
        if (cmp(arr[i], objetivo) === 0) {
            return { encontrado: true, registro: arr[i], indice: i, comparaciones };
        }
    }
    return { encontrado: false, registro: null, indice: -1, comparaciones };
}

function binariaMemoria(arr, objetivo, cmp) {
    let izquierda = 0;
    let derecha = arr.length - 1;
    let comparaciones = 0;
    while (izquierda <= derecha) {
        const mid = Math.floor((izquierda + derecha) / 2);
        comparaciones++;
        const resultado = cmp(arr[mid], objetivo);
        if (resultado === 0) {
            return { encontrado: true, registro: arr[mid], indice: mid, comparaciones };
        }
        if (resultado < 0) izquierda = mid + 1; else derecha = mid - 1;
    }
    return { encontrado: false, registro: null, indice: -1, comparaciones };
}

// Si los módulos de los compañeros ya están integrados, también se compara contra ellos.
function cargarSiExiste(archivo, nombre) {
    const ruta = path.join(__dirname, "..", "proyecto_unidad3", "logic", archivo);
    return fs.existsSync(ruta) ? require(ruta)[nombre] : null;
}

const referencias = {
    secuencial: [secuencialMemoria, cargarSiExiste("busqueda_secuencial.js", "busquedaSecuencial")]
        .filter(Boolean),
    binaria: [binariaMemoria, cargarSiExiste("busqueda_binaria.js", "busquedaBinaria")]
        .filter(Boolean)
};

// ---- Utilidades ----

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "busqueda-archivos-"));
test.after(() => fs.rmSync(carpeta, { recursive: true, force: true }));

const rutaBase = (nombre) => path.join(carpeta, nombre);

// Generador con semilla: las pruebas usan siempre los mismos datos.
function aleatorioConSemilla(semilla) {
    let estado = semilla >>> 0;
    return function () {
        estado = (estado * 1664525 + 1013904223) >>> 0;
        return estado / 4294967296;
    };
}

const porId = crearComparador([{ campo: "id", dir: "asc" }]);

// Quita `lecturas` (solo existe en archivo) para comparar con el resultado en memoria.
function sinLecturas(resultado) {
    const { lecturas, ...resto } = resultado;
    return resto;
}

// Busca `objetivo` en archivo y en memoria, y exige resultados idénticos.
function compararConMemoria(archivo, ordenados, objetivo, cmp) {
    const enArchivo = {
        secuencial: busquedaSecuencialArchivo(archivo, objetivo, cmp),
        binaria: busquedaBinariaArchivo(archivo, objetivo, cmp)
    };

    for (const metodo of ["secuencial", "binaria"]) {
        for (const buscarEnMemoria of referencias[metodo]) {
            assert.deepStrictEqual(
                sinLecturas(enArchivo[metodo]),
                buscarEnMemoria(ordenados, objetivo, cmp),
                metodo + " en archivo ≠ memoria para " + JSON.stringify(objetivo)
            );
        }
    }
    return enArchivo;
}

// ---- Pruebas ----

test("crearArchivoIndexado: guarda los registros ordenados y un índice de 10 bytes por registro", () => {
    const registros = generarRegistros(200, aleatorioConSemilla(1));
    const cmp = crearComparador([{ campo: "distanciaMetros", dir: "desc" }, { campo: "id" }]);
    const copia = registros.slice();

    const info = crearArchivoIndexado(registros, cmp, rutaBase("crear"));

    assert.strictEqual(info.total, 200);
    assert.strictEqual(fs.statSync(info.rutaIndice).size, 200 * 10);
    assert.strictEqual(fs.statSync(info.rutaDatos).size, info.bytesDatos);
    assert.deepStrictEqual(registros, copia, "no debe modificar el arreglo original");

    const lineas = fs.readFileSync(info.rutaDatos, "utf8").trimEnd().split("\n");
    assert.deepStrictEqual(lineas.map((l) => JSON.parse(l)), mergeSort(registros, cmp));
});

test("leerRegistroArchivo: acceso directo a cualquier posición mediante el índice", () => {
    const registros = generarRegistros(500, aleatorioConSemilla(2));
    crearArchivoIndexado(registros, porId, rutaBase("directo"));

    const archivo = abrirArchivoIndexado(rutaBase("directo"));
    try {
        assert.strictEqual(archivo.total, 500);
        for (const i of [0, 1, 249, 498, 499]) {
            assert.deepStrictEqual(leerRegistroArchivo(archivo, i), registros[i]);
        }
        assert.throws(() => leerRegistroArchivo(archivo, 500), RangeError);
        assert.throws(() => leerRegistroArchivo(archivo, -1), RangeError);
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("búsqueda por id: todos los registros coinciden con memoria (resultado y comparaciones)", () => {
    const n = 1000;
    const registros = generarRegistros(n, aleatorioConSemilla(3));
    crearArchivoIndexado(registros, porId, rutaBase("porid"));
    const ordenados = mergeSort(registros, porId);

    const archivo = abrirArchivoIndexado(rutaBase("porid"));
    try {
        for (let id = 1; id <= n; id++) {
            const r = compararConMemoria(archivo, ordenados, { id }, porId);
            assert.strictEqual(r.secuencial.encontrado, true);
            assert.strictEqual(r.binaria.registro.id, id);
            assert.strictEqual(r.secuencial.comparaciones, id); // posición del id en el archivo
            assert.ok(r.binaria.comparaciones <= 10);           // ⌊log2(1000)⌋ + 1
        }
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("registro inexistente: menor, mayor e intermedio", () => {
    // Solo ids pares, para poder buscar valores intermedios que no existen.
    const registros = generarRegistros(600, aleatorioConSemilla(4))
        .map((r) => ({ ...r, id: r.id * 2 }));
    crearArchivoIndexado(registros, porId, rutaBase("inexistente"));
    const ordenados = mergeSort(registros, porId);

    const archivo = abrirArchivoIndexado(rutaBase("inexistente"));
    try {
        for (const id of [0, 1, 601, 1199, 1201, 999999]) {
            const r = compararConMemoria(archivo, ordenados, { id }, porId);
            assert.strictEqual(r.secuencial.encontrado, false);
            assert.strictEqual(r.binaria.encontrado, false);
            assert.strictEqual(r.secuencial.indice, -1);
            assert.strictEqual(r.secuencial.comparaciones, 600); // recorre todo el archivo
            assert.ok(r.binaria.comparaciones <= 10);
        }
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("comparador multicriterio con texto (sectores con tildes) coincide con memoria", () => {
    const cmp = crearComparador([
        { campo: "sector", dir: "asc" },
        { campo: "distanciaMetros", dir: "desc" },
        { campo: "id", dir: "asc" }
    ]);
    const registros = generarRegistros(3000, aleatorioConSemilla(5));
    crearArchivoIndexado(registros, cmp, rutaBase("multi"));
    const ordenados = mergeSort(registros, cmp);

    const archivo = abrirArchivoIndexado(rutaBase("multi"));
    try {
        // Con la clave completa (sector + distancia + id) cada registro es único.
        for (let i = 0; i < registros.length; i += 37) {
            const r = compararConMemoria(archivo, ordenados, registros[i], cmp);
            assert.deepStrictEqual(r.binaria.registro, registros[i]);
        }
        const fantasma = { sector: "Sector que no existe", distanciaMetros: 1, id: 1 };
        const r = compararConMemoria(archivo, ordenados, fantasma, cmp);
        assert.strictEqual(r.binaria.encontrado, false);
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("archivo de varios bloques de 64 KB: las líneas cortadas entre bloques se leen bien", () => {
    const n = 20000;
    const registros = generarRegistros(n, aleatorioConSemilla(6));
    const info = crearArchivoIndexado(registros, porId, rutaBase("bloques"));
    assert.ok(info.bytesDatos > 10 * 64 * 1024, "el archivo debe ocupar muchos bloques");

    const archivo = abrirArchivoIndexado(rutaBase("bloques"));
    try {
        for (const id of [1, 2, 577, 578, 9999, 10000, 19999, 20000, 20001]) {
            compararConMemoria(archivo, registros, { id }, porId);
        }
        // El peor caso secuencial lee el archivo completo; la binaria solo 2 lecturas por paso.
        const ultimo = busquedaSecuencialArchivo(archivo, { id: n }, porId);
        assert.strictEqual(ultimo.lecturas, Math.ceil(info.bytesDatos / (64 * 1024)));
        const binaria = busquedaBinariaArchivo(archivo, { id: n }, porId);
        assert.strictEqual(binaria.lecturas, binaria.comparaciones * 2);
        assert.ok(binaria.comparaciones <= 15); // ⌊log2(20000)⌋ + 1
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("archivo vacío y de un solo registro", () => {
    crearArchivoIndexado([], porId, rutaBase("vacio"));
    for (const buscar of [busquedaSecuencialArchivo, busquedaBinariaArchivo]) {
        assert.deepStrictEqual(buscar(rutaBase("vacio"), { id: 1 }, porId),
            { encontrado: false, registro: null, indice: -1, comparaciones: 0, lecturas: 0 });
    }

    const uno = generarRegistros(1, aleatorioConSemilla(7));
    crearArchivoIndexado(uno, porId, rutaBase("uno"));
    for (const buscar of [busquedaSecuencialArchivo, busquedaBinariaArchivo]) {
        const hallado = buscar(rutaBase("uno"), { id: 1 }, porId);
        assert.deepStrictEqual(hallado.registro, uno[0]);
        assert.strictEqual(hallado.indice, 0);
        assert.strictEqual(hallado.comparaciones, 1);
        assert.strictEqual(buscar(rutaBase("uno"), { id: 2 }, porId).encontrado, false);
    }
});

test("las búsquedas aceptan la ruta base o un archivo ya abierto", () => {
    const registros = generarRegistros(300, aleatorioConSemilla(8));
    crearArchivoIndexado(registros, porId, rutaBase("origen"), { yaOrdenados: true });

    const archivo = abrirArchivoIndexado(rutaBase("origen"));
    try {
        for (const buscar of [busquedaSecuencialArchivo, busquedaBinariaArchivo]) {
            assert.deepStrictEqual(
                buscar(rutaBase("origen"), { id: 123 }, porId),
                buscar(archivo, { id: 123 }, porId)
            );
        }
    } finally {
        cerrarArchivoIndexado(archivo);
    }
});

test("entradas no válidas e índice dañado", () => {
    assert.throws(() => crearArchivoIndexado("no es arreglo", porId, rutaBase("x")), TypeError);
    assert.throws(() => crearArchivoIndexado([], null, rutaBase("x")), TypeError);
    assert.throws(() => crearArchivoIndexado([], porId, ""), TypeError);
    assert.throws(() => busquedaBinariaArchivo(rutaBase("origen"), { id: 1 }), TypeError);
    assert.throws(() => busquedaSecuencialArchivo(rutaBase("origen"), { id: 1 }), TypeError);
    assert.throws(() => busquedaBinariaArchivo(42, { id: 1 }, porId), TypeError);
    assert.throws(() => abrirArchivoIndexado(rutaBase("no-existe")), { code: "ENOENT" });

    crearArchivoIndexado(generarRegistros(5, aleatorioConSemilla(9)), porId, rutaBase("roto"));
    fs.appendFileSync(rutaBase("roto") + ".idx", Buffer.from([1, 2, 3]));
    assert.throws(() => abrirArchivoIndexado(rutaBase("roto")), RangeError);
});

test("eliminarArchivoIndexado borra los dos archivos", () => {
    crearArchivoIndexado(generarRegistros(10, aleatorioConSemilla(10)), porId, rutaBase("borrar"));
    eliminarArchivoIndexado(rutaBase("borrar"));

    assert.strictEqual(fs.existsSync(rutaBase("borrar") + ".dat"), false);
    assert.strictEqual(fs.existsSync(rutaBase("borrar") + ".idx"), false);
    eliminarArchivoIndexado(rutaBase("borrar")); // repetirlo no debe fallar
});
