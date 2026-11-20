
/**
 * Búsqueda binaria iterativa.
 *
 * IMPORTANTE: el arreglo debe estar ordenado
 * usando el mismo comparador (cmp).
 *
 * Complejidad: O(log n).
 */
function busquedaBinaria(arrOrdenado, objetivo, cmp) {
    let izquierda = 0;
    let derecha = arrOrdenado.length - 1;
    let comparaciones = 0;

    while (izquierda <= derecha) {
        const mid = Math.floor((izquierda + derecha) / 2);

        comparaciones++;
        const resultado = cmp(arrOrdenado[mid], objetivo);

        if (resultado === 0) {
            return {
                encontrado: true,
                registro: arrOrdenado[mid],
                indice: mid,
                comparaciones
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
        comparaciones
    };
}

module.exports = { busquedaBinaria };
