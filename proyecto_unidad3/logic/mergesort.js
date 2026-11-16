// mergesort.js — MergeSort desde cero (sin .sort()), estable, O(n log n)

// Mezcla dos mitades ya ordenadas de `origen` y escribe el resultado en `destino`.
// Con `<= 0` se conserva el orden original en los empates (estabilidad).
function mezclar(origen, destino, inicio, medio, fin, cmp) {
    let i = inicio;
    let j = medio;
    let k = inicio;

    while (i < medio && j < fin) {
        if (cmp(origen[i], origen[j]) <= 0) {
            destino[k++] = origen[i++];
        } else {
            destino[k++] = origen[j++];
        }
    }
    while (i < medio) destino[k++] = origen[i++];
    while (j < fin) destino[k++] = origen[j++];
}

// Ordena arr[inicio, fin) alternando entre dos buffers para evitar copias extra.
function ordenarRango(a, b, inicio, fin, cmp) {
    if (fin - inicio < 2) return;
    const medio = inicio + ((fin - inicio) >> 1);

    ordenarRango(b, a, inicio, medio, cmp);
    ordenarRango(b, a, medio, fin, cmp);
    mezclar(b, a, inicio, medio, fin, cmp);
}

// Devuelve un arreglo NUEVO ordenado; no modifica el original.
function mergeSort(arr, cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0)) {
    const resultado = new Array(arr.length);
    const auxiliar = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        resultado[i] = arr[i];
        auxiliar[i] = arr[i];
    }
    ordenarRango(resultado, auxiliar, 0, arr.length, cmp);
    return resultado;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mergeSort };
}