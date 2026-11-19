// busqueda_secuencial.js — Búsqueda secuencial (lineal) desde cero, O(n)
// Subtema 6: Implementar la búsqueda secuencial y contar las comparaciones realizadas.

/**
 * Recorre los registros uno por uno desde el índice 0 hasta encontrar coincidencia
 * o agotar el arreglo, contabilizando exactamente cada comparación efectuada.
 *
 * Complejidad temporal:
 *  - Mejor caso: O(1) (el elemento está en la primera posición)
 *  - Caso promedio: O(n)
 *  - Peor caso: O(n) (el elemento está al final o no existe)
 *
 * @param {Array} arr - Arreglo de registros o valores donde buscar.
 * @param {*} objetivo - Registro o valor clave a buscar.
 * @param {Function} [cmp] - Función comparadora (a, b) => número (0 si son iguales).
 * @returns {{ encontrado: boolean, registro: *, indice: number, comparaciones: number }}
 */
function busquedaSecuencial(
    arr,
    objetivo,
    cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
) {
    if (!Array.isArray(arr)) {
        throw new TypeError("Se esperaba un arreglo");
    }

    if (typeof cmp !== "function") {
        throw new TypeError("Se esperaba un comparador");
    }

    let comparaciones = 0;

    for (let i = 0; i < arr.length; i++) {
        comparaciones++;
        if (cmp(arr[i], objetivo) === 0) {
            return {
                encontrado: true,
                registro: arr[i],
                indice: i,
                comparaciones
            };
        }
    }

    return {
        encontrado: false,
        registro: null,
        indice: -1,
        comparaciones
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { busquedaSecuencial };
}
