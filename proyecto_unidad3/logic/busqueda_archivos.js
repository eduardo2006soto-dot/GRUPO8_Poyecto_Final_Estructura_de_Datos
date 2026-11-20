// busqueda_archivos.js — Búsqueda secuencial y binaria sobre un archivo indexado (módulo fs)
// Subtema 8: Implementar búsquedas en archivos indexados.
//
// Un "archivo indexado" son dos archivos que comparten la misma ruta base:
//
//   <rutaBase>.dat  Datos. Un registro por línea, en JSON, YA ORDENADOS con el comparador.
//                   Las líneas tienen longitud variable ("Patrulla 7" ocupa menos que
//                   "Patrulla 500000"), así que no se puede saltar al registro i con una cuenta.
//
//   <rutaBase>.idx  Tabla índice binaria. Una entrada de 10 bytes por registro, en el mismo orden:
//                     bytes 0-5  posición (offset) del registro dentro del .dat
//                     bytes 6-9  longitud del registro en bytes (sin el salto de línea)
//                   Como todas las entradas miden lo mismo, la entrada i está en el byte i * 10.
//                   Eso da el acceso directo que necesita la búsqueda binaria.
//
// Las búsquedas NO cargan el archivo en memoria: leen del disco solo lo que comparan.
// Devuelven lo mismo que las versiones en memoria ({ encontrado, registro, indice,
// comparaciones }) más `lecturas`, el número de accesos a disco realizados.
//
// Comportamiento frente a la escala de datos:
//   - Secuencial: O(n). Recorre el .dat de principio a fin en bloques de 64 KB. Con 500.000
//     registros el peor caso lee todo el archivo (decenas de MB) y analiza cada línea.
//   - Binaria: O(log n). Cada paso hace 2 lecturas pequeñas (entrada del índice + registro).
//     Con 500.000 registros son como mucho 19 pasos = 38 lecturas, sin importar el tamaño
//     del archivo. Multiplicar los datos por 1.000 solo añade unos 10 pasos más.
//   - La memoria usada por ambas es constante: un bloque de lectura, nunca el archivo entero.

const fs = require("fs");
const path = require("path");

const { mergeSort } = require("./mergesort.js");

const EXTENSION_DATOS = ".dat";
const EXTENSION_INDICE = ".idx";

const BYTES_POSICION = 6;                               // hasta 256 TB de datos
const BYTES_LONGITUD = 4;
const TAMANO_ENTRADA = BYTES_POSICION + BYTES_LONGITUD; // 10 bytes por registro

const TAMANO_BLOQUE = 64 * 1024;   // bloque de lectura de la búsqueda secuencial
const REGISTROS_POR_LOTE = 5000;   // registros que se juntan antes de escribir al disco
const SALTO_DE_LINEA = 10;         // "\n"

/**
 * Ordena los registros y los guarda como archivo indexado (<rutaBase>.dat + <rutaBase>.idx).
 * Si los archivos ya existen se reemplazan.
 *
 * @param {Array} registros - Registros a guardar (no se modifica).
 * @param {Function} cmp - Comparador (a, b) => número con el que se ordena el archivo.
 *                         Las búsquedas binarias deben usar este mismo comparador.
 * @param {string} rutaBase - Ruta sin extensión, p. ej. "datos_indexados/patrullas_1000".
 * @param {{ yaOrdenados?: boolean }} [opciones] - yaOrdenados: true si `registros` ya viene
 *                         ordenado con `cmp` (evita ordenarlo otra vez).
 * @returns {{ rutaDatos: string, rutaIndice: string, total: number,
 *             bytesDatos: number, bytesIndice: number }}
 */
function crearArchivoIndexado(registros, cmp, rutaBase, opciones = {}) {
    if (!Array.isArray(registros)) {
        throw new TypeError("Se esperaba un arreglo de registros");
    }
    if (typeof cmp !== "function") {
        throw new TypeError("Se esperaba un comparador");
    }
    validarRutaBase(rutaBase);

    // mergeSort devuelve un arreglo nuevo: el original queda intacto.
    const ordenados = opciones.yaOrdenados ? registros : mergeSort(registros, cmp);

    const rutaDatos = rutaBase + EXTENSION_DATOS;
    const rutaIndice = rutaBase + EXTENSION_INDICE;
    fs.mkdirSync(path.dirname(rutaDatos), { recursive: true });

    // El índice completo cabe en memoria sin problema: 500.000 registros = 5 MB.
    const indice = Buffer.alloc(ordenados.length * TAMANO_ENTRADA);
    let posicion = 0;

    const fdDatos = fs.openSync(rutaDatos, "w");
    try {
        // Se escribe por lotes: una llamada al disco por registro sería muy lenta.
        let lote = [];
        for (let i = 0; i < ordenados.length; i++) {
            const linea = JSON.stringify(ordenados[i]);
            const longitud = Buffer.byteLength(linea, "utf8");

            indice.writeUIntLE(posicion, i * TAMANO_ENTRADA, BYTES_POSICION);
            indice.writeUInt32LE(longitud, i * TAMANO_ENTRADA + BYTES_POSICION);

            lote.push(linea);
            posicion += longitud + 1; // +1 por el salto de línea

            if (lote.length === REGISTROS_POR_LOTE) {
                fs.writeSync(fdDatos, lote.join("\n") + "\n");
                lote = [];
            }
        }
        if (lote.length > 0) fs.writeSync(fdDatos, lote.join("\n") + "\n");
    } finally {
        fs.closeSync(fdDatos);
    }

    fs.writeFileSync(rutaIndice, indice);

    return {
        rutaDatos: rutaDatos,
        rutaIndice: rutaIndice,
        total: ordenados.length,
        bytesDatos: posicion,
        bytesIndice: indice.length
    };
}

/**
 * Abre un archivo indexado para hacer varias búsquedas sin reabrirlo cada vez.
 * Hay que cerrarlo con cerrarArchivoIndexado() al terminar.
 *
 * @param {string} rutaBase - La misma ruta base usada en crearArchivoIndexado().
 * @returns {{ rutaBase: string, fdDatos: number, fdIndice: number, total: number }}
 */
function abrirArchivoIndexado(rutaBase) {
    validarRutaBase(rutaBase);

    const fdDatos = fs.openSync(rutaBase + EXTENSION_DATOS, "r");
    let fdIndice;
    try {
        fdIndice = fs.openSync(rutaBase + EXTENSION_INDICE, "r");
    } catch (error) {
        fs.closeSync(fdDatos);
        throw error;
    }

    // El número de registros sale del tamaño del índice: no hace falta contar líneas.
    const bytesIndice = fs.fstatSync(fdIndice).size;
    if (bytesIndice % TAMANO_ENTRADA !== 0) {
        fs.closeSync(fdDatos);
        fs.closeSync(fdIndice);
        throw new RangeError("Índice dañado: su tamaño no es múltiplo de " + TAMANO_ENTRADA + " bytes");
    }

    return {
        rutaBase: rutaBase,
        fdDatos: fdDatos,
        fdIndice: fdIndice,
        total: bytesIndice / TAMANO_ENTRADA
    };
}

/** Cierra un archivo abierto con abrirArchivoIndexado(). */
function cerrarArchivoIndexado(archivo) {
    fs.closeSync(archivo.fdDatos);
    fs.closeSync(archivo.fdIndice);
}

/**
 * Lee del disco el registro que ocupa la posición `i` (en el orden del archivo).
 * Hace 2 lecturas: la entrada i del índice y luego el registro al que apunta.
 */
function leerRegistroArchivo(archivo, i) {
    if (!Number.isInteger(i) || i < 0 || i >= archivo.total) {
        throw new RangeError("Posición fuera del archivo: " + i);
    }

    const entrada = Buffer.allocUnsafe(TAMANO_ENTRADA);
    leerExacto(archivo.fdIndice, entrada, TAMANO_ENTRADA, i * TAMANO_ENTRADA);

    const posicion = entrada.readUIntLE(0, BYTES_POSICION);
    const longitud = entrada.readUInt32LE(BYTES_POSICION);

    const datos = Buffer.allocUnsafe(longitud);
    leerExacto(archivo.fdDatos, datos, longitud, posicion);

    return JSON.parse(datos.toString("utf8"));
}

/**
 * Búsqueda secuencial sobre el archivo: lee el .dat desde el inicio, registro por
 * registro, hasta encontrar coincidencia o llegar al final. No usa el índice. O(n).
 *
 * @param {string|object} origen - Ruta base, o un archivo abierto con abrirArchivoIndexado().
 * @param {*} objetivo - Registro (o parte de él) a buscar, p. ej. { id: 250 }.
 * @param {Function} cmp - Comparador (registro, objetivo) => número (0 si coinciden).
 * @returns {{ encontrado: boolean, registro: *, indice: number,
 *             comparaciones: number, lecturas: number }}
 */
function busquedaSecuencialArchivo(origen, objetivo, cmp) {
    if (typeof cmp !== "function") {
        throw new TypeError("Se esperaba un comparador");
    }

    return usarArchivo(origen, function (archivo) {
        const bloque = Buffer.allocUnsafe(TAMANO_BLOQUE);
        let pendiente = null;   // inicio de una línea que quedó cortada al final del bloque
        let posicion = 0;
        let indice = 0;
        let comparaciones = 0;
        let lecturas = 0;

        while (true) {
            const leidos = fs.readSync(archivo.fdDatos, bloque, 0, TAMANO_BLOQUE, posicion);
            if (leidos === 0) break;
            lecturas++;
            posicion += leidos;

            let inicio = 0;
            while (inicio < leidos) {
                const fin = bloque.indexOf(SALTO_DE_LINEA, inicio);

                // Sin salto de línea dentro de lo leído: la línea continúa en el siguiente bloque.
                // Se corta por bytes (no por texto) para no partir una letra con tilde en dos.
                if (fin === -1 || fin >= leidos) {
                    const trozo = Buffer.from(bloque.subarray(inicio, leidos));
                    pendiente = pendiente ? Buffer.concat([pendiente, trozo]) : trozo;
                    break;
                }

                let linea;
                if (pendiente) {
                    linea = Buffer.concat([pendiente, bloque.subarray(inicio, fin)]).toString("utf8");
                    pendiente = null;
                } else {
                    linea = bloque.toString("utf8", inicio, fin);
                }
                inicio = fin + 1;

                const registro = JSON.parse(linea);
                comparaciones++;
                if (cmp(registro, objetivo) === 0) {
                    return {
                        encontrado: true,
                        registro: registro,
                        indice: indice,
                        comparaciones: comparaciones,
                        lecturas: lecturas
                    };
                }
                indice++;
            }
        }

        return {
            encontrado: false,
            registro: null,
            indice: -1,
            comparaciones: comparaciones,
            lecturas: lecturas
        };
    });
}

/**
 * Búsqueda binaria sobre el archivo: usa la tabla índice para saltar directo al
 * registro central y descarta la mitad del archivo en cada paso. O(log n).
 *
 * IMPORTANTE: `cmp` debe ser el mismo comparador con el que se creó el archivo.
 *
 * @param {string|object} origen - Ruta base, o un archivo abierto con abrirArchivoIndexado().
 * @param {*} objetivo - Registro (o parte de él) a buscar, p. ej. { id: 250 }.
 * @param {Function} cmp - Comparador (registro, objetivo) => número.
 * @returns {{ encontrado: boolean, registro: *, indice: number,
 *             comparaciones: number, lecturas: number }}
 */
function busquedaBinariaArchivo(origen, objetivo, cmp) {
    if (typeof cmp !== "function") {
        throw new TypeError("Se esperaba un comparador");
    }

    return usarArchivo(origen, function (archivo) {
        let izquierda = 0;
        let derecha = archivo.total - 1;
        let comparaciones = 0;
        let lecturas = 0;

        while (izquierda <= derecha) {
            const mid = Math.floor((izquierda + derecha) / 2);

            const registro = leerRegistroArchivo(archivo, mid);
            lecturas += 2; // entrada del índice + registro

            comparaciones++;
            const resultado = cmp(registro, objetivo);

            if (resultado === 0) {
                return {
                    encontrado: true,
                    registro: registro,
                    indice: mid,
                    comparaciones: comparaciones,
                    lecturas: lecturas
                };
            }

            if (resultado < 0) {
                izquierda = mid + 1;
            } else {
                derecha = mid - 1;
            }
        }

        return {
            encontrado: false,
            registro: null,
            indice: -1,
            comparaciones: comparaciones,
            lecturas: lecturas
        };
    });
}

/** Borra los dos archivos (.dat e .idx) de un archivo indexado. No falla si no existen. */
function eliminarArchivoIndexado(rutaBase) {
    validarRutaBase(rutaBase);
    fs.rmSync(rutaBase + EXTENSION_DATOS, { force: true });
    fs.rmSync(rutaBase + EXTENSION_INDICE, { force: true });
}

// ---- Auxiliares internos ----

function validarRutaBase(rutaBase) {
    if (typeof rutaBase !== "string" || rutaBase.length === 0) {
        throw new TypeError("Se esperaba la ruta base del archivo indexado");
    }
}

// Permite pasar a las búsquedas una ruta base (se abre y se cierra aquí)
// o un archivo ya abierto (lo cierra quien lo abrió).
function usarArchivo(origen, accion) {
    if (typeof origen !== "string") {
        if (!origen || typeof origen.fdDatos !== "number" || typeof origen.fdIndice !== "number") {
            throw new TypeError("Se esperaba una ruta base o un archivo abierto con abrirArchivoIndexado()");
        }
        return accion(origen);
    }

    const archivo = abrirArchivoIndexado(origen);
    try {
        return accion(archivo);
    } finally {
        cerrarArchivoIndexado(archivo);
    }
}

// Lee exactamente `cantidad` bytes desde `posicion`; si el archivo se acaba antes, está dañado.
function leerExacto(fd, destino, cantidad, posicion) {
    let leidos = 0;
    while (leidos < cantidad) {
        const n = fs.readSync(fd, destino, leidos, cantidad - leidos, posicion + leidos);
        if (n === 0) {
            throw new RangeError("Archivo indexado dañado: se esperaban más datos");
        }
        leidos += n;
    }
}

module.exports = {
    crearArchivoIndexado,
    abrirArchivoIndexado,
    cerrarArchivoIndexado,
    leerRegistroArchivo,
    busquedaSecuencialArchivo,
    busquedaBinariaArchivo,
    eliminarArchivoIndexado
};
