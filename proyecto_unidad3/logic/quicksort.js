
/**
 * Issue #10 - Implementar QuickSort desde cero.
 *
 * - Sin utilizar .sort()
 * - Pivote por mediana de tres
 * - Ordenamiento en el mismo arreglo
 * - Recursion sobre la particion mas pequeña
 * - Devuelve el mismo arreglo ordenado
 */

// Intercambia dos elementos.
function intercambiar(arr, i, j) {
    const temporal = arr[i];
    arr[i] = arr[j];
    arr[j] = temporal;
}

// Selecciona el pivote mediante mediana de tres.
function elegirPivote(arr, inicio, fin, cmp) {
    const medio = inicio + Math.floor((fin - inicio) / 2);

    const a = arr[inicio];
    const b = arr[medio];
    const c = arr[fin];

    if (cmp(a, b) < 0) {
        if (cmp(b, c) < 0) return b;
        return cmp(a, c) < 0 ? c : a;
    }

    if (cmp(a, c) < 0) return a;
    return cmp(b, c) < 0 ? c : b;
}

// Particiona directamente dentro del arreglo.
function particionar(arr, inicio, fin, cmp) {
    const pivote = elegirPivote(arr, inicio, fin, cmp);

    let menor = inicio;
    let actual = inicio;
    let mayor = fin;

    while (actual <= mayor) {
        const comparacion = cmp(arr[actual], pivote);

        if (comparacion < 0) {
            intercambiar(arr, menor, actual);
            menor++;
            actual++;
        } else if (comparacion > 0) {
            intercambiar(arr, actual, mayor);
            mayor--;
        } else {
            actual++;
        }
    }

    return [menor, mayor];
}

// Ordena primero la particion mas pequeña.
function ordenar(arr, inicio, fin, cmp) {
    while (inicio < fin) {
        const [menor, mayor] = particionar(
            arr, inicio, fin, cmp
        );

        if (menor - inicio < fin - mayor) {
            ordenar(arr, inicio, menor - 1, cmp);
            inicio = mayor + 1;
        } else {
            ordenar(arr, mayor + 1, fin, cmp);
            fin = menor - 1;
        }
    }
}

// Funcion principal QuickSort.
function quickSort(
    arr,
    cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
) {
    if (!Array.isArray(arr)) {
        throw new TypeError("Se esperaba un arreglo");
    }

    if (typeof cmp !== "function") {
        throw new TypeError("Se esperaba un comparador");
    }

    ordenar(arr, 0, arr.length - 1, cmp);

    return arr;
}

// Exportar QuickSort.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { quickSort };
}
