# Resultados del Benchmark: MergeSort vs QuickSort

Pruebas con `performance.now()`, promedio de 5 repeticiones por caso.

| Registros | Escenario | MergeSort Tiempo (ms) | MergeSort Memoria (KB) | QuickSort Tiempo (ms) | QuickSort Memoria (KB) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 1.000 | aleatorios | 1.1275 | 44.54 | 1.6363 | 119.13 |
| 1.000 | ya ordenados | 0.7368 | 14.99 | 2.0647 | 111.58 |
| 1.000 | invertidos | 0.5185 | 17.45 | 1.7283 | 36.62 |
| 10.000 | aleatorios | 14.9273 | 190.99 | 22.2055 | 285.41 |
| 10.000 | ya ordenados | 9.8978 | 161.30 | 59.3808 | 362.36 |
| 10.000 | invertidos | 9.2720 | 159.76 | 47.4982 | 361.92 |
| 100.000 | aleatorios | 307.2096 | 1566.91 | 437.1473 | 3567.81 |
| 100.000 | ya ordenados | 196.7934 | 1250.41 | 1927.7236 | 3612.39 |
| 100.000 | invertidos | 226.4078 | 1563.02 | 1508.8333 | 2891.11 |

## Conclusión

De los 9 casos medidos, QuickSort fue más rápido en 0 y MergeSort en 9. MergeSort mantiene O(n log n) en cualquier orden de entrada y es estable, mientras que QuickSort ordena en el mismo arreglo (menos memoria) pero puede degradarse a O(n²) si el pivote es malo. Revisar la tabla para ver en qué escenarios cambia el resultado.
