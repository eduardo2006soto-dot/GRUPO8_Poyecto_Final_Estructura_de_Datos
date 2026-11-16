// registros.js — Registro de patrulla, comparador multicriterio y generador de datos de prueba
//
// Registro: { id, nombre, sector, estado, distanciaMetros, velocidad }
//   id              número entero (1..n)
//   nombre          texto, p. ej. "Patrulla 7"
//   sector          nombre de uno de los sectores de sectores.js
//   estado          "patrullando" | "emergencia"
//   distanciaMetros distancia en metros hasta el punto de alarma (entero)
//   velocidad       metros por segundo (con un decimal)

const CAMPOS_VALIDOS = ["id", "nombre", "sector", "estado", "distanciaMetros", "velocidad"];

// Comparador de texto en español (acentos y mayúsculas bien ordenados, "2" < "10").
const colador = new Intl.Collator("es", { numeric: true });

// Los nombres de sector vienen de sectores.js: con require() en Node,
// o del global `sectoresPatrullaje` cuando se carga con <script> en el navegador.
function obtenerNombresSectores() {
    const sectores = (typeof module !== "undefined" && module.exports)
        ? require("./sectores.js").sectoresPatrullaje
        : sectoresPatrullaje;
    return sectores.map(function (sector) { return sector.nombre; });
}

// Compara dos valores de un mismo campo: números con resta, texto con el colador.
function compararValores(a, b) {
    if (typeof a === "string" && typeof b === "string") return colador.compare(a, b);
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Crea una función comparadora (a, b) => número para usar con mergeSort/quickSort.
 *
 * criterios: [{ campo, dir }, ...]  con dir = "asc" | "desc" (si se omite, "asc").
 * Se aplica el primer criterio; si empata, pasa al siguiente, y así sucesivamente.
 * Si todos los criterios empatan devuelve 0 (así MergeSort, que es estable,
 * conserva el orden original).
 */
function crearComparador(criterios) {
    if (!Array.isArray(criterios) || criterios.length === 0) {
        throw new TypeError("Se esperaba un arreglo con al menos un criterio");
    }

    // Se valida y normaliza una sola vez, no en cada comparación.
    const reglas = criterios.map(function (criterio) {
        const campo = criterio && criterio.campo;
        const dir = criterio && criterio.dir !== undefined ? criterio.dir : "asc";

        if (!CAMPOS_VALIDOS.includes(campo)) {
            throw new RangeError("Campo no válido: " + campo +
                " (válidos: " + CAMPOS_VALIDOS.join(", ") + ")");
        }
        if (dir !== "asc" && dir !== "desc") {
            throw new RangeError('La dirección debe ser "asc" o "desc", no: ' + dir);
        }
        return { campo: campo, signo: dir === "asc" ? 1 : -1 };
    });

    return function comparador(a, b) {
        for (let i = 0; i < reglas.length; i++) {
            const regla = reglas[i];
            const resultado = compararValores(a[regla.campo], b[regla.campo]);
            if (resultado !== 0) return resultado * regla.signo;
        }
        return 0;
    };
}

// Entero aleatorio en [min, max], ambos incluidos.
function enteroAleatorio(aleatorio, min, max) {
    return min + Math.floor(aleatorio() * (max - min + 1));
}

/**
 * Devuelve un arreglo con n registros aleatorios parecidos a las patrullas.
 * `aleatorio` es opcional (por defecto Math.random); sirve para obtener datos
 * repetibles en pruebas pasando un generador con semilla.
 *
 * Las velocidades siguen las de patrullas.js: ~7-12 m/s patrullando y
 * ~25-40 m/s en emergencia.
 */
function generarRegistros(n, aleatorio = Math.random) {
    if (!Number.isInteger(n) || n < 0) {
        throw new RangeError("n debe ser un entero mayor o igual a 0");
    }

    const sectores = obtenerNombresSectores();
    const registros = new Array(n);

    for (let i = 0; i < n; i++) {
        const enEmergencia = aleatorio() < 0.2;
        const velocidad = enEmergencia
            ? enteroAleatorio(aleatorio, 250, 400)   // 25.0 a 40.0 m/s
            : enteroAleatorio(aleatorio, 70, 120);   //  7.0 a 12.0 m/s

        registros[i] = {
            id: i + 1,
            nombre: "Patrulla " + (i + 1),
            sector: sectores[enteroAleatorio(aleatorio, 0, sectores.length - 1)],
            estado: enEmergencia ? "emergencia" : "patrullando",
            distanciaMetros: enteroAleatorio(aleatorio, 50, 5000),
            velocidad: velocidad / 10
        };
    }

    return registros;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { crearComparador, generarRegistros };
}
